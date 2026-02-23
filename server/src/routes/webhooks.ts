import type { Request, Response } from 'express'
import Stripe from 'stripe'
import { supabase, stripe, livekitWebhookReceiver, livekitEgressClient, PAYPAL_BASE_URL, PAYPAL_MODE } from '../config'
import { calculateFees, notifyFollowersSellerLive, notifyUser, getPaypalAccessToken } from '../utils'

// Idempotency: in-memory cache + database persistence
// The in-memory Set acts as a fast-path to avoid DB lookups on every webhook.
// On restart, the Set is empty, so we fall back to the DB check.
const processedStripeEvents = new Set<string>()
const processedPaypalEvents = new Set<string>()

async function isEventProcessed(provider: string, eventId: string): Promise<boolean> {
  // Fast path: check in-memory cache
  const cache = provider === 'stripe' ? processedStripeEvents : processedPaypalEvents
  if (cache.has(eventId)) return true

  // Slow path: check database
  const { data } = await supabase
    .from('processed_webhook_events')
    .select('id')
    .eq('event_id', eventId)
    .eq('provider', provider)
    .maybeSingle()

  if (data) {
    cache.add(eventId) // Warm the cache
    return true
  }
  return false
}

async function markEventProcessed(provider: string, eventId: string): Promise<void> {
  const cache = provider === 'stripe' ? processedStripeEvents : processedPaypalEvents
  cache.add(eventId)
  // Cap in-memory cache at 1000 entries
  if (cache.size > 1000) {
    const iter = cache.values()
    cache.delete(iter.next().value as string)
  }
  await supabase.from('processed_webhook_events').insert({
    event_id: eventId,
    provider,
    processed_at: new Date().toISOString(),
  }).then(({ error }) => {
    if (error) console.error(`[webhook] Failed to persist event ${eventId}:`, error.message)
  })
}

export async function stripeWebhookHandler(req: Request, res: Response) {
  try {
    let event: Stripe.Event

    const sig = req.headers['stripe-signature']
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

    if (!webhookSecret) {
      console.error('[Stripe Webhook] STRIPE_WEBHOOK_SECRET not set — rejecting webhook')
      res.status(500).json({ error: 'Webhook secret not configured' })
      return
    }
    if (!sig) {
      res.status(400).json({ error: 'Missing stripe-signature header' })
      return
    }
    try {
      event = stripe.webhooks.constructEvent(req.body as Buffer, sig as string, webhookSecret)
    } catch (err: any) {
      console.error('[Stripe Webhook] Signature verification failed:', err.message)
      res.status(400).json({ error: 'Invalid signature' })
      return
    }

    // Idempotency: skip already-processed events (checks memory + DB)
    if (await isEventProcessed('stripe', event.id)) {
      res.json({ received: true, duplicate: true })
      return
    }

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent
        const orderId = pi.metadata.order_id
        if (orderId) {
          // Look up seller trust for holdback
          const { data: orderData } = await supabase
            .from('orders')
            .select('seller_id, buyer_id, amount')
            .eq('id', orderId)
            .single()

          let holdbackPercent = 0
          let payoutScheduledAt: string | null = null
          let payoutMethod = 'stripe'

          if (orderData) {
            const { data: trust } = await supabase
              .from('seller_trust')
              .select('holdback_percent, payout_delay_days')
              .eq('seller_id', orderData.seller_id)
              .single()

            if (trust) {
              holdbackPercent = trust.holdback_percent
              const payoutDate = new Date()
              payoutDate.setDate(payoutDate.getDate() + trust.payout_delay_days)
              payoutScheduledAt = payoutDate.toISOString()
            }

            // Check if seller uses PayPal
            const { data: sellerInfo } = await supabase
              .from('sellers')
              .select('bank_choice, paypal_email')
              .eq('id', orderData.seller_id)
              .single()

            if (sellerInfo?.bank_choice === 'paypal' && sellerInfo?.paypal_email) {
              payoutMethod = 'paypal'
            }
          }

          // Calculate ship deadline based on seller's shipping_delay_days
          let shipDeadline: string | null = null
          if (orderData) {
            const { data: sellerDelay } = await supabase
              .from('sellers')
              .select('shipping_delay_days')
              .eq('id', orderData.seller_id)
              .single()
            const delayDays = sellerDelay?.shipping_delay_days ?? 2
            const deadline = new Date()
            deadline.setDate(deadline.getDate() + delayDays)
            shipDeadline = deadline.toISOString()
          }

          // Escrow: payment is held until delivery is confirmed
          await supabase
            .from('orders')
            .update({
              status: 'paid',
              paid_at: new Date().toISOString(),
              holdback_percent: holdbackPercent,
              payout_scheduled_at: payoutScheduledAt,
              payout_method: payoutMethod,
              payout_status: 'held',
              tracking_status: 'pending',
              ship_deadline: shipDeadline,
            })
            .eq('id', orderId)

          // If PayPal seller, create a paypal_payouts record (held until delivery)
          if (payoutMethod === 'paypal' && orderData) {
            const { data: sellerInfo } = await supabase
              .from('sellers')
              .select('paypal_email')
              .eq('id', orderData.seller_id)
              .single()

            if (sellerInfo?.paypal_email) {
              // Use order.amount (item price only) not pi.amount which includes shipping
              const fees = calculateFees(orderData.amount)
              await supabase.from('paypal_payouts').insert({
                order_id: orderId,
                seller_id: orderData.seller_id,
                paypal_email: sellerInfo.paypal_email,
                amount: fees.sellerPayout,
                currency: 'EUR',
                status: 'pending',
              })
              if (process.env.NODE_ENV !== 'production') console.log(`[PayPal] Created payout record for order ${orderId} (${fees.sellerPayout} EUR)`)
            }
          }

          // Auto-create conversation between buyer and seller
          if (orderData) {
            const { data: existingConv } = await supabase
              .from('conversations')
              .select('id')
              .eq('order_id', orderId)
              .limit(1)
              .single()

            if (!existingConv) {
              await supabase.from('conversations').insert({
                type: 'order',
                order_id: orderId,
                participant_1: orderData.buyer_id,
                participant_2: orderData.seller_id,
              })
            }
          }

          if (process.env.NODE_ENV !== 'production') console.log(`[Stripe] Order ${orderId} marked as paid (holdback: ${holdbackPercent}%, payout: ${payoutMethod})`)
        }
        break
      }

      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent
        const orderId = pi.metadata.order_id
        if (orderId) {
          await supabase
            .from('orders')
            .update({ status: 'pending_payment' })
            .eq('id', orderId)
          if (process.env.NODE_ENV !== 'production') console.log(`[Stripe] Order ${orderId} payment failed`)
        }
        break
      }

      case 'account.updated': {
        const account = event.data.object as Stripe.Account
        if (account.charges_enabled && account.details_submitted) {
          await supabase
            .from('sellers')
            .update({ kyc_status: 'verified' })
            .eq('stripe_account_id', account.id)
          if (process.env.NODE_ENV !== 'production') console.log(`[Stripe] Account ${account.id} verified`)
        }
        break
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge
        const piId = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id
        if (piId) {
          const { data: order } = await supabase
            .from('orders')
            .select('id, status')
            .eq('stripe_payment_intent_id', piId)
            .single()

          if (order && order.status !== 'refunded') {
            await supabase
              .from('orders')
              .update({ status: 'refunded', payout_status: 'cancelled' })
              .eq('id', order.id)
            if (process.env.NODE_ENV !== 'production') console.log(`[Stripe] Refund confirmed for order ${order.id} (PI: ${piId})`)
          }
        }
        break
      }

      case 'charge.dispute.created': {
        const dispute = event.data.object as Stripe.Dispute
        const piId = typeof dispute.payment_intent === 'string' ? dispute.payment_intent : dispute.payment_intent?.id
        if (piId) {
          const { data: order } = await supabase
            .from('orders')
            .select('id, seller_id')
            .eq('stripe_payment_intent_id', piId)
            .single()

          if (order) {
            // Mark order as disputed and freeze payout
            await supabase
              .from('orders')
              .update({ status: 'disputed', payout_status: 'cancelled' })
              .eq('id', order.id)

            if (process.env.NODE_ENV !== 'production') console.log(`[Stripe] Chargeback opened for order ${order.id} — payout cancelled. Dispute ID: ${dispute.id}`)
          }
        }
        break
      }

      case 'charge.dispute.closed': {
        const dispute = event.data.object as Stripe.Dispute
        const piId = typeof dispute.payment_intent === 'string' ? dispute.payment_intent : dispute.payment_intent?.id
        if (piId) {
          const { data: order } = await supabase
            .from('orders')
            .select('id')
            .eq('stripe_payment_intent_id', piId)
            .single()

          if (order) {
            if (dispute.status === 'won') {
              // Merchant won — restore order to delivered, allow payout
              await supabase
                .from('orders')
                .update({ status: 'delivered', payout_status: 'pending' })
                .eq('id', order.id)
              if (process.env.NODE_ENV !== 'production') console.log(`[Stripe] Chargeback WON for order ${order.id} — payout restored`)
            } else {
              // Merchant lost — mark as refunded
              await supabase
                .from('orders')
                .update({ status: 'refunded', payout_status: 'cancelled' })
                .eq('id', order.id)
              if (process.env.NODE_ENV !== 'production') console.log(`[Stripe] Chargeback LOST for order ${order.id} — refunded`)
            }
          }
        }
        break
      }
    }

    await markEventProcessed('stripe', event.id)
    res.json({ received: true })
  } catch (err) {
    console.error('Stripe webhook error:', err)
    res.status(400).json({ error: 'Webhook error' })
  }
}

export async function livekitWebhookHandler(req: Request, res: Response) {
  try {
    if (!livekitWebhookReceiver) {
      res.status(500).json({ error: 'LiveKit webhook receiver not configured' })
      return
    }

    const body = Buffer.isBuffer(req.body) ? req.body.toString() : (typeof req.body === 'string' ? req.body : JSON.stringify(req.body))
    const authHeader = req.headers['authorization'] as string || ''
    const event = await livekitWebhookReceiver.receive(body, authHeader)

    if (event.event === 'participant_joined' && event.participant?.identity?.startsWith('seller-')) {
      // Publisher (seller) joined -> mark stream as live + push notifs
      const roomName = event.room?.name
      if (roomName) {
        const { data: streams } = await supabase
          .from('streams')
          .update({ status: 'live', started_at: new Date().toISOString() })
          .eq('livekit_room_name', roomName)
          .eq('status', 'scheduled')
          .select('id, title, seller_id')

        if (streams && streams.length > 0) {
          const stream = streams[0]
          notifyFollowersSellerLive(stream.seller_id, stream.title, stream.id).catch(err =>
            console.error('Push notification error:', err)
          )
        }
      }
    }

    // Auto-follow seller when a viewer joins the stream
    if (event.event === 'participant_joined' && event.participant?.identity && !event.participant.identity.startsWith('seller-')) {
      const viewerIdentity = event.participant.identity
      // Identity format: "viewer-{userId}" or just the userId
      const viewerUserId = viewerIdentity.startsWith('viewer-') ? viewerIdentity.replace('viewer-', '') : viewerIdentity
      const roomName = event.room?.name
      if (roomName && viewerUserId) {
        const { data: roomStream } = await supabase
          .from('streams')
          .select('seller_id')
          .eq('livekit_room_name', roomName)
          .single()
        if (roomStream && roomStream.seller_id !== viewerUserId) {
          await supabase.from('followers')
            .upsert({ user_id: viewerUserId, seller_id: roomStream.seller_id }, { onConflict: 'user_id,seller_id' })
            .then(({ error }) => { if (error && process.env.NODE_ENV !== 'production') console.log('[auto-follow] error:', error.message) })
        }
      }
    }

    if (event.event === 'room_finished') {
      const roomName = event.room?.name
      if (roomName) {
        // Get the stream ID and started_at before updating status
        const { data: finishedStream } = await supabase
          .from('streams')
          .select('id, started_at, egress_id')
          .eq('livekit_room_name', roomName)
          .eq('status', 'live')
          .maybeSingle()

        await supabase
          .from('streams')
          .update({ status: 'ended', ended_at: new Date().toISOString(), viewer_count: 0 })
          .eq('livekit_room_name', roomName)
          .eq('status', 'live')

        // Clean up in-app live notifications for this stream
        if (finishedStream) {
          const { error: delErr } = await supabase
            .from('notifications')
            .delete()
            .eq('type', 'live')
            .filter('data->>stream_id', 'eq', finishedStream.id)
          if (delErr) console.error('[notifications] cleanup error:', delErr.message)
          else if (process.env.NODE_ENV !== 'production') console.log(`[notifications] cleaned up live notifs for stream ${finishedStream.id}`)

          // Auto-end all active auctions for this stream
          const { data: activeItems } = await supabase
            .from('items')
            .select('id, min_price, seller_id, stream_id')
            .eq('stream_id', finishedStream.id)
            .eq('status', 'active')

          if (activeItems && activeItems.length > 0) {
            if (process.env.NODE_ENV !== 'production') console.log(`[room_finished] Auto-ending ${activeItems.length} active auction(s) for stream ${finishedStream.id}`)

            for (const item of activeItems) {
              const { data: topBid } = await supabase
                .from('bids')
                .select('*')
                .eq('item_id', item.id)
                .order('amount', { ascending: false })
                .limit(1)
                .maybeSingle()

              const minPrice = item.min_price || 0
              const meetsReserve = topBid && topBid.amount >= minPrice
              const status = meetsReserve ? 'sold' : 'unsold'
              const winnerId = meetsReserve ? topBid.bidder_id : null

              await supabase
                .from('items')
                .update({
                  status,
                  winner_id: winnerId,
                  current_price: topBid?.amount || undefined,
                  ended_at: new Date().toISOString(),
                })
                .eq('id', item.id)

              // Create order if sold
              if (topBid && winnerId) {
                const { data: existingOrder } = await supabase
                  .from('orders')
                  .select('id')
                  .eq('item_id', item.id)
                  .maybeSingle()

                if (!existingOrder) {
                  // Calculate stream offset for purchase proof
                  let purchaseStreamOffsetSeconds: number | null = null
                  if (finishedStream?.started_at) {
                    purchaseStreamOffsetSeconds = Math.floor((Date.now() - new Date(finishedStream.started_at).getTime()) / 1000)
                  }

                  const fees = calculateFees(topBid.amount)
                  await supabase.from('orders').insert({
                    buyer_id: winnerId,
                    seller_id: item.seller_id,
                    item_id: item.id,
                    stream_id: item.stream_id,
                    amount: topBid.amount,
                    platform_fee: fees.platformFee,
                    processing_fee: fees.processingFee,
                    seller_payout: fees.sellerPayout,
                    purchase_stream_offset_seconds: purchaseStreamOffsetSeconds,
                  })
                  if (process.env.NODE_ENV !== 'production') console.log(`[room_finished] Order created for item ${item.id} — winner: ${winnerId}, amount: ${topBid.amount}`)
                  // Notify winner
                  const { data: wonItem, error: wonItemError } = await supabase.from('items').select('title').eq('id', item.id).maybeSingle()
                  if (wonItemError) console.error(`[room_finished] Failed to fetch item title for ${item.id}:`, wonItemError)
                  await notifyUser(winnerId, 'auction_won', 'Tu as gagné !', `${wonItem?.title || 'Article'} — ${topBid.amount}€. Paye pour recevoir ton article.`, { item_id: item.id, stream_id: item.stream_id || '' })
                }
              } else {
                if (process.env.NODE_ENV !== 'production') console.log(`[room_finished] Item ${item.id} ended as ${status} (no qualifying bid)`)
              }
            }
          }
        }
      }
    }

    // Handle egress_ended — recording file is ready on S3 (backup for polling)
    if (event.event === 'egress_ended' && event.egressInfo) {
      const egress = event.egressInfo
      const { data: stream } = await supabase
        .from('streams')
        .select('id, recording_url')
        .eq('egress_id', egress.egressId)
        .maybeSingle()

      if (stream && !stream.recording_url) {
        const fileInfo = egress.fileResults?.[0] || (egress as any).result?.value || (egress as any).file
        const fileLocation = fileInfo?.location || fileInfo?.filename
        if (fileLocation) {
          const recordingUrl = fileLocation.startsWith('http') ? fileLocation
            : `https://shapop-recordings.s3.eu-west-3.amazonaws.com/${fileLocation}`
          await supabase.from('streams').update({ recording_url: recordingUrl }).eq('id', stream.id)
        }
      }
    }

    res.json({ received: true })
  } catch (err) {
    console.error('LiveKit webhook error:', err)
    res.status(400).json({ error: 'Invalid webhook' })
  }
}

export async function paypalWebhookHandler(req: Request, res: Response) {
  try {
    // Verify webhook signature
    const webhookId = process.env.PAYPAL_WEBHOOK_ID
    if (webhookId) {
      const transmissionId = req.headers['paypal-transmission-id'] as string
      const transmissionTime = req.headers['paypal-transmission-time'] as string
      const certUrl = req.headers['paypal-cert-url'] as string
      const transmissionSig = req.headers['paypal-transmission-sig'] as string
      const authAlgo = req.headers['paypal-auth-algo'] as string

      if (!transmissionId || !transmissionSig) {
        console.warn('[PayPal Webhook] Missing signature headers')
        res.status(400).json({ error: 'Missing signature' })
        return
      }

      // Verify via PayPal API
      try {
        const token = await getPaypalAccessToken()
        const verifyResp = await fetch(`${PAYPAL_BASE_URL}/v1/notifications/verify-webhook-signature`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            auth_algo: authAlgo,
            cert_url: certUrl,
            transmission_id: transmissionId,
            transmission_sig: transmissionSig,
            transmission_time: transmissionTime,
            webhook_id: webhookId,
            webhook_event: req.body,
          }),
        })
        const verifyData = await verifyResp.json() as { verification_status: string }
        if (verifyData.verification_status !== 'SUCCESS') {
          console.warn('[PayPal Webhook] Signature verification failed')
          res.status(400).json({ error: 'Invalid signature' })
          return
        }
      } catch (verifyErr) {
        console.error('[PayPal Webhook] Verification error:', verifyErr)
        // In sandbox, continue even if verification fails
        if (PAYPAL_MODE === 'live') {
          res.status(400).json({ error: 'Verification failed' })
          return
        }
      }
    }

    // Idempotency: deduplicate using transmission_id or event id
    const paypalEventId = (req.headers['paypal-transmission-id'] as string) || req.body.id
    if (paypalEventId && await isEventProcessed('paypal', paypalEventId)) {
      res.json({ received: true, duplicate: true })
      return
    }

    const eventType = req.body.event_type
    const resource = req.body.resource

    if (eventType === 'PAYMENT.PAYOUTS-ITEM.SUCCEEDED') {
      const payoutItemId = resource?.payout_item_id
      if (payoutItemId) {
        await supabase
          .from('paypal_payouts')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq('paypal_item_id', payoutItemId)
        if (process.env.NODE_ENV !== 'production') console.log(`[PayPal Webhook] Payout item ${payoutItemId} completed`)
      }
    } else if (eventType === 'PAYMENT.PAYOUTS-ITEM.FAILED' || eventType === 'PAYMENT.PAYOUTS-ITEM.DENIED') {
      const payoutItemId = resource?.payout_item_id
      const errorMsg = resource?.errors?.message || resource?.transaction_status || 'Payout failed'
      if (payoutItemId) {
        await supabase
          .from('paypal_payouts')
          .update({
            status: 'failed',
            error_message: errorMsg,
          })
          .eq('paypal_item_id', payoutItemId)
        if (process.env.NODE_ENV !== 'production') console.log(`[PayPal Webhook] Payout item ${payoutItemId} failed: ${errorMsg}`)
      }
    } else if (eventType === 'PAYMENT.PAYOUTS-ITEM.BLOCKED' || eventType === 'PAYMENT.PAYOUTS-ITEM.RETURNED' || eventType === 'PAYMENT.PAYOUTS-ITEM.REFUNDED') {
      const payoutItemId = resource?.payout_item_id
      if (payoutItemId) {
        await supabase
          .from('paypal_payouts')
          .update({
            status: 'failed',
            error_message: `Payout ${eventType.split('.').pop()?.toLowerCase()}`,
          })
          .eq('paypal_item_id', payoutItemId)
        if (process.env.NODE_ENV !== 'production') console.log(`[PayPal Webhook] Payout item ${payoutItemId} - ${eventType}`)
      }
    }

    if (paypalEventId) await markEventProcessed('paypal', paypalEventId)
    res.json({ received: true })
  } catch (err) {
    console.error('[PayPal Webhook] Error:', err)
    res.status(500).json({ error: 'Webhook processing failed' })
  }
}
