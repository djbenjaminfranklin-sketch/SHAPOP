import { Router } from 'express'
import type { Response } from 'express'
import { supabase, LAPOSTE_API_KEY } from '../config'
import { requireAuth, requireAdmin, adminLimiter } from '../middleware'
import { notifyUser, paramStr, SHIPPING_SAFETY_MARGIN } from '../utils'
import { trackShipment as mrTrackShipment, isMondialRelayConfigured } from '../services/mondialrelay'
import { isDpdConfigured, trackDpdShipment } from '../services/dpd'
import { isDhlConfigured, trackDhlShipment } from '../services/dhl'
import type { AuthenticatedRequest } from '../types'

const router = Router()

const VALID_CARRIERS = ['mondial_relay', 'dpd', 'dhl', 'laposte', 'colissimo', 'chronopost', 'israel_post', 'other']

// =============================================
// POST /api/orders/:id/tracking — Seller adds tracking info
// =============================================
router.post('/api/orders/:id/tracking', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const orderId = paramStr(req.params.id)
    const { tracking_number, carrier } = req.body

    if (!tracking_number || typeof tracking_number !== 'string' || !tracking_number.trim()) {
      res.status(400).json({ error: 'tracking_number is required' })
      return
    }

    if (!carrier || !VALID_CARRIERS.includes(carrier)) {
      res.status(400).json({ error: `carrier must be one of: ${VALID_CARRIERS.join(', ')}` })
      return
    }

    // Fetch order
    const { data: order, error: fetchErr } = await supabase
      .from('orders')
      .select('id, seller_id, buyer_id, status, tracking_number')
      .eq('id', orderId)
      .single()

    if (fetchErr || !order) {
      res.status(404).json({ error: 'Order not found' })
      return
    }

    if (order.seller_id !== userId) {
      res.status(403).json({ error: 'Only the seller can add tracking' })
      return
    }

    if (!['paid', 'shipped'].includes(order.status)) {
      res.status(400).json({ error: 'Order must be paid or shipped to add tracking' })
      return
    }

    const now = new Date().toISOString()
    const updateData: Record<string, unknown> = {
      tracking_number: tracking_number.trim(),
      carrier,
      tracking_status: 'shipped',
      payout_status: 'held',
    }

    // Only set shipped_at if not already shipped
    if (order.status === 'paid') {
      updateData.shipped_at = now
      updateData.status = 'shipped'
    }

    const { data: updated, error: updateErr } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .select('*')
      .single()

    if (updateErr) {
      console.error('[tracking] Update error:', updateErr)
      res.status(500).json({ error: 'Failed to update tracking' })
      return
    }

    // Notify buyer
    notifyUser(order.buyer_id, 'order_shipped', 'Colis expedie', `Votre colis a ete expedie. Suivi: ${tracking_number.trim()}`, { order_id: orderId })

    if (process.env.NODE_ENV !== 'production') console.log(`[tracking] Order ${orderId} tracking set: ${carrier} ${tracking_number.trim()}`)
    res.json(updated)
  } catch (err) {
    console.error('POST /api/orders/:id/tracking error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// =============================================
// GET /api/orders/:id/tracking — Get tracking info
// =============================================
router.get('/api/orders/:id/tracking', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const orderId = paramStr(req.params.id)

    const { data: order, error: fetchErr } = await supabase
      .from('orders')
      .select('id, buyer_id, seller_id, tracking_number, carrier, shipped_at, delivered_at, tracking_status, buyer_confirmed_at, payout_status')
      .eq('id', orderId)
      .single()

    if (fetchErr || !order) {
      res.status(404).json({ error: 'Order not found' })
      return
    }

    if (order.buyer_id !== userId && order.seller_id !== userId) {
      res.status(403).json({ error: 'Access denied' })
      return
    }

    res.json({
      tracking_number: order.tracking_number,
      carrier: order.carrier,
      shipped_at: order.shipped_at,
      delivered_at: order.delivered_at,
      tracking_status: order.tracking_status,
      buyer_confirmed_at: order.buyer_confirmed_at,
      payout_status: order.payout_status,
    })
  } catch (err) {
    console.error('GET /api/orders/:id/tracking error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// =============================================
// POST /api/orders/:id/confirm-receipt — Buyer confirms delivery
// =============================================
router.post('/api/orders/:id/confirm-receipt', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const orderId = paramStr(req.params.id)

    const { data: order, error: fetchErr } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (fetchErr || !order) {
      res.status(404).json({ error: 'Order not found' })
      return
    }

    if (order.buyer_id !== userId) {
      res.status(403).json({ error: 'Only the buyer can confirm receipt' })
      return
    }

    if (!['paid', 'shipped'].includes(order.status)) {
      res.status(400).json({ error: 'Order must be paid or shipped to confirm receipt' })
      return
    }

    const now = new Date()
    const claimDeadline = new Date(now.getTime() + 48 * 60 * 60 * 1000) // 48h from now

    // Get seller trust for payout delay
    let payoutScheduledAt: string | null = order.payout_scheduled_at || null
    if (!payoutScheduledAt) {
      const { data: trust } = await supabase
        .from('seller_trust')
        .select('payout_delay_days')
        .eq('seller_id', order.seller_id)
        .single()
      const delayDays = trust?.payout_delay_days || 7
      const payoutDate = new Date(now.getTime() + delayDays * 24 * 60 * 60 * 1000)
      payoutScheduledAt = payoutDate.toISOString()
    }

    const { data: updated, error: updateErr } = await supabase
      .from('orders')
      .update({
        buyer_confirmed_at: now.toISOString(),
        tracking_status: 'delivered',
        delivered_at: now.toISOString(),
        status: 'delivered',
        payout_status: 'released',
        claim_deadline: claimDeadline.toISOString(),
        payout_scheduled_at: payoutScheduledAt,
      })
      .eq('id', orderId)
      .select('*')
      .single()

    if (updateErr) {
      console.error('[tracking] Confirm receipt error:', updateErr)
      res.status(500).json({ error: 'Failed to confirm receipt' })
      return
    }

    // If PayPal seller, update paypal_payouts status to 'ready'
    if (order.payout_method === 'paypal') {
      await supabase
        .from('paypal_payouts')
        .update({ status: 'ready' })
        .eq('order_id', orderId)
        .eq('status', 'pending')
    }

    // Update seller trust stats
    const { data: trust } = await supabase
      .from('seller_trust')
      .select('*')
      .eq('seller_id', order.seller_id)
      .single()
    if (trust) {
      const shipTime = order.shipped_at && order.paid_at
        ? (new Date(order.shipped_at).getTime() - new Date(order.paid_at).getTime()) / (1000 * 60 * 60)
        : 0
      const newTotal = trust.total_completed_orders + 1
      const newAvgShip = ((trust.avg_ship_time_hours * trust.total_completed_orders) + shipTime) / newTotal
      await supabase
        .from('seller_trust')
        .update({
          total_completed_orders: newTotal,
          avg_ship_time_hours: Math.round(newAvgShip * 10) / 10,
          updated_at: now.toISOString(),
        })
        .eq('seller_id', order.seller_id)
    }

    // Update buyer score total_orders
    const { data: buyerScore } = await supabase
      .from('buyer_scores')
      .select('*')
      .eq('user_id', order.buyer_id)
      .single()
    if (buyerScore) {
      await supabase
        .from('buyer_scores')
        .update({ total_orders: buyerScore.total_orders + 1, updated_at: now.toISOString() })
        .eq('user_id', order.buyer_id)
    } else {
      await supabase.from('buyer_scores').insert({
        user_id: order.buyer_id,
        total_orders: 1,
      })
    }

    // Notify seller that buyer confirmed
    notifyUser(order.seller_id, 'order_delivered', 'Colis recu', `L'acheteur a confirme la reception. Paiement libere.`, { order_id: orderId })

    if (process.env.NODE_ENV !== 'production') console.log(`[tracking] Order ${orderId} receipt confirmed by buyer, payout released`)
    res.json(updated)
  } catch (err) {
    console.error('POST /api/orders/:id/confirm-receipt error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// =============================================
// Periodic tracking check — called by cron/setInterval
// =============================================
export async function checkTrackingStatuses(): Promise<number> {
  let updated = 0

  try {
    // Fetch all orders with tracking that haven't been delivered yet
    const { data: orders, error } = await supabase
      .from('orders')
      .select('id, tracking_number, carrier, shipped_at, tracking_status, payout_status, seller_id, buyer_id, payout_method')
      .in('tracking_status', ['shipped', 'in_transit'])
      .not('tracking_number', 'is', null)

    if (error || !orders || orders.length === 0) return 0

    const now = new Date()

    for (const order of orders) {
      let isDelivered = false

      // Try Mondial Relay tracking
      if (isMondialRelayConfigured() && order.carrier === 'mondial_relay') {
        try {
          const mrResult = await mrTrackShipment(order.tracking_number)
          if (!mrResult.error) {
            if (mrResult.delivered) {
              isDelivered = true
            } else if (mrResult.events.length > 0 && order.tracking_status === 'shipped') {
              await supabase
                .from('orders')
                .update({ tracking_status: 'in_transit' })
                .eq('id', order.id)
            }
          }
        } catch (err) {
          if (process.env.NODE_ENV !== 'production') console.error(`[tracking-check] Mondial Relay API error for order ${order.id}:`, err)
        }
      }

      // Try Israel Post tracking (public API, no key needed)
      if (!isDelivered && order.carrier === 'israel_post') {
        try {
          const ipResp = await fetch(`https://mypost.israelpost.co.il/umbraco/api/Tracking/GetItemTracking?itemNumber=${encodeURIComponent(order.tracking_number)}&language=en`, {
            headers: { 'Accept': 'application/json' },
          })
          if (ipResp.ok) {
            const ipData = await ipResp.json() as { itemcodealiases?: string; isDelivered?: boolean; statusData?: Array<{ eventTitle?: string; eventDate?: string }> }
            if (ipData.isDelivered === true) {
              isDelivered = true
            } else if (ipData.statusData && ipData.statusData.length > 0 && order.tracking_status === 'shipped') {
              await supabase
                .from('orders')
                .update({ tracking_status: 'in_transit' })
                .eq('id', order.id)
            }
          }
        } catch (err) {
          if (process.env.NODE_ENV !== 'production') console.error(`[tracking-check] Israel Post API error for order ${order.id}:`, err)
        }
      }

      // Try La Poste API for supported carriers
      if (!isDelivered && LAPOSTE_API_KEY && ['laposte', 'colissimo', 'chronopost'].includes(order.carrier || '')) {
        try {
          const resp = await fetch(`https://api.laposte.fr/suivi/v2/idships/${encodeURIComponent(order.tracking_number)}`, {
            headers: {
              'Accept': 'application/json',
              'X-Okapi-Key': LAPOSTE_API_KEY,
            },
          })

          if (resp.ok) {
            const data = await resp.json() as {
              shipment?: {
                event?: Array<{ code: string; label: string }>
                isFinal?: boolean
              }
            }

            const events = data.shipment?.event || []
            const isFinal = data.shipment?.isFinal === true

            // Check for delivery or pickup availability
            const deliveredCodes = ['DI1', 'DI2', 'AG1', 'AG2', 'RE1'] // delivered, available at pickup, etc.
            const hasDeliveryEvent = events.some(e => deliveredCodes.includes(e.code))

            if (isFinal || hasDeliveryEvent) {
              isDelivered = true
            } else if (events.length > 0) {
              // Update to in_transit if there are events but not yet delivered
              if (order.tracking_status === 'shipped') {
                await supabase
                  .from('orders')
                  .update({ tracking_status: 'in_transit' })
                  .eq('id', order.id)
              }
            }
          }
        } catch (err) {
          if (process.env.NODE_ENV !== 'production') console.error(`[tracking-check] La Poste API error for order ${order.id}:`, err)
        }
      }

      // DPD tracking
      if (!isDelivered && isDpdConfigured() && order.carrier === 'dpd') {
        try {
          const dpdResult = await trackDpdShipment(order.tracking_number)
          if (!dpdResult.error) {
            if (dpdResult.delivered) {
              isDelivered = true
            } else if (dpdResult.events.length > 0 && order.tracking_status === 'shipped') {
              await supabase
                .from('orders')
                .update({ tracking_status: 'in_transit' })
                .eq('id', order.id)
            }
          }
        } catch (err) {
          if (process.env.NODE_ENV !== 'production') console.error(`[tracking-check] DPD API error for order ${order.id}:`, err)
        }
      }

      // DHL Express tracking
      if (!isDelivered && isDhlConfigured() && order.carrier === 'dhl') {
        try {
          const dhlResult = await trackDhlShipment(order.tracking_number)
          if (!dhlResult.error) {
            if (dhlResult.delivered) {
              isDelivered = true
            } else if (dhlResult.events.length > 0 && order.tracking_status === 'shipped') {
              await supabase
                .from('orders')
                .update({ tracking_status: 'in_transit' })
                .eq('id', order.id)
            }
          }
        } catch (err) {
          if (process.env.NODE_ENV !== 'production') console.error(`[tracking-check] DHL API error for order ${order.id}:`, err)
        }
      }

      // Sendcloud carriers: strip prefix and try underlying carrier API as webhook fallback
      if (!isDelivered && order.carrier?.startsWith('sendcloud_')) {
        const underlyingCarrier = order.carrier.replace('sendcloud_', '')
        // Try Mondial Relay for sendcloud_mondial_relay
        if (isMondialRelayConfigured() && underlyingCarrier === 'mondial_relay') {
          try {
            const mrResult = await mrTrackShipment(order.tracking_number)
            if (!mrResult.error) {
              if (mrResult.delivered) {
                isDelivered = true
              } else if (mrResult.events.length > 0 && order.tracking_status === 'shipped') {
                await supabase
                  .from('orders')
                  .update({ tracking_status: 'in_transit' })
                  .eq('id', order.id)
              }
            }
          } catch (err) {
            if (process.env.NODE_ENV !== 'production') console.error(`[tracking-check] Sendcloud/MR fallback error for order ${order.id}:`, err)
          }
        }
        // Try DPD for sendcloud_dpd
        if (!isDelivered && isDpdConfigured() && underlyingCarrier === 'dpd') {
          try {
            const dpdResult = await trackDpdShipment(order.tracking_number)
            if (!dpdResult.error && dpdResult.delivered) isDelivered = true
          } catch { /* ignore */ }
        }
        // Try DHL for sendcloud_dhl
        if (!isDelivered && isDhlConfigured() && underlyingCarrier === 'dhl') {
          try {
            const dhlResult = await trackDhlShipment(order.tracking_number)
            if (!dhlResult.error && dhlResult.delivered) isDelivered = true
          } catch { /* ignore */ }
        }
      }

      // No auto-release fallback: payment is ONLY released when tracking confirms delivery
      // or when the buyer manually confirms receipt

      // Release payment if delivered
      if (isDelivered) {
        const claimDeadline = new Date(now.getTime() + 48 * 60 * 60 * 1000)

        // Get payout schedule
        let payoutScheduledAt: string | null = null
        const { data: trust } = await supabase
          .from('seller_trust')
          .select('payout_delay_days')
          .eq('seller_id', order.seller_id)
          .single()
        const delayDays = trust?.payout_delay_days || 7
        const payoutDate = new Date(now.getTime() + delayDays * 24 * 60 * 60 * 1000)
        payoutScheduledAt = payoutDate.toISOString()

        await supabase
          .from('orders')
          .update({
            tracking_status: 'delivered',
            delivered_at: now.toISOString(),
            status: 'delivered',
            payout_status: 'released',
            claim_deadline: claimDeadline.toISOString(),
            payout_scheduled_at: payoutScheduledAt,
          })
          .eq('id', order.id)

        // If PayPal seller, update paypal_payouts status to 'ready'
        if (order.payout_method === 'paypal') {
          await supabase
            .from('paypal_payouts')
            .update({ status: 'ready' })
            .eq('order_id', order.id)
            .eq('status', 'pending')
        }

        // Notify buyer
        notifyUser(order.buyer_id, 'order_delivered', 'Colis livre', 'Votre colis a ete livre. Vous avez 48h pour signaler un probleme.', { order_id: order.id })

        updated++
        if (process.env.NODE_ENV !== 'production') console.log(`[tracking-check] Order ${order.id} marked as delivered, payout released`)
      }
    }
  } catch (err) {
    console.error('[tracking-check] Error:', err)
  }

  return updated
}

// =============================================
// POST /api/admin/orders/:id/shipping-adjustment — Admin records a weight surplus
// When the carrier charges more because actual weight > declared weight,
// the surplus (minus safety margin already collected) is debited from seller's shipping_balance
// =============================================
router.post('/api/admin/orders/:id/shipping-adjustment', adminLimiter, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orderId = paramStr(req.params.id)
    const { actual_cost } = req.body

    if (!actual_cost || typeof actual_cost !== 'number' || actual_cost <= 0) {
      res.status(400).json({ error: 'actual_cost (number > 0) is required' })
      return
    }

    const { data: order, error: fetchErr } = await supabase
      .from('orders')
      .select('id, seller_id, shipping_cost, carrier')
      .eq('id', orderId)
      .single()

    if (fetchErr || !order) {
      res.status(404).json({ error: 'Order not found' })
      return
    }

    // shipping_cost already includes the 15% margin
    // Calculate how much the buyer actually paid vs what the carrier actually charged
    const buyerPaid = order.shipping_cost || 0
    const surplus = Math.round((actual_cost - buyerPaid) * 100) / 100

    if (surplus <= 0) {
      // No adjustment needed — margin covered it
      res.json({ success: true, message: 'No adjustment needed, margin covered the cost', surplus: 0 })
      return
    }

    // Debit the surplus from seller's shipping_balance (negative = seller owes)
    const { data: trust } = await supabase
      .from('seller_trust')
      .select('shipping_balance')
      .eq('seller_id', order.seller_id)
      .single()

    const currentBalance = trust ? Number((trust as Record<string, unknown>).shipping_balance || 0) : 0
    const newBalance = Math.round((currentBalance - surplus) * 100) / 100

    if (trust) {
      await supabase
        .from('seller_trust')
        .update({ shipping_balance: newBalance })
        .eq('seller_id', order.seller_id)
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[shipping-adjustment] Order ${orderId}: actual_cost=${actual_cost}, buyer_paid=${buyerPaid}, surplus=${surplus}, seller_balance: ${currentBalance} -> ${newBalance}`)
    }

    res.json({
      success: true,
      actual_cost,
      buyer_paid: buyerPaid,
      surplus,
      seller_balance: newBalance,
      margin_rate: SHIPPING_SAFETY_MARGIN,
    })
  } catch (err) {
    console.error('POST /api/admin/orders/:id/shipping-adjustment error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
