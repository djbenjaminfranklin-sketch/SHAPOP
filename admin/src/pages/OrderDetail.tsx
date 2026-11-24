import { Address, Badge, Link, Loading, Photos, UserLink, date, money, useApi, type Row } from '../lib'

function Field({ k, v }: { k: string; v: React.ReactNode }) { return <><dt>{k}</dt><dd>{v ?? '—'}</dd></> }

export default function OrderDetail({ id }: { id: string }) {
  const { data: o, error, loading } = useApi<Row>(`/api/admin/orders/${id}`)
  if (!o) return <Loading error={error} loading={loading} />
  const proofUrls = [o.proofs?.parcel_url, o.proofs?.slip_url, o.proofs?.shipping_proof_url, ...(o.shipping_proofs || []).map((p: Row) => p.signed_url)].filter(Boolean)
  return (
    <div>
      <div className="row between"><h1>Commande <code>#{o.ref}</code> <Badge s={o.status} /></h1><Link to="/commandes">← Toutes les commandes</Link></div>
      <div className="grid2">
        <section className="card">
          <h2>Article</h2>
          <div className="row gap top"><Photos urls={o.item?.image_urls} size={90} /></div>
          <p><b>{o.item?.title || '—'}</b> {o.item?.moderation_status && <Badge s={o.item.moderation_status} />}</p>
          <dl className="dl">
            <Field k="Acheteur" v={<><UserLink p={o.buyer} id={o.buyer_id} /> <span className="muted small">{o.buyer_email}</span></>} />
            <Field k="Vendeur" v={<><UserLink p={o.seller_profile} id={o.seller_id} /> <span className="muted small">{o.seller_email}</span></>} />
            <Field k="Créée" v={date(o.created_at)} />
            <Field k="Payée" v={date(o.paid_at)} />
            <Field k="Préparée" v={date(o.prepared_at)} />
            <Field k="Expédiée" v={date(o.shipped_at)} />
            <Field k="Remise en main propre" v={date(o.handed_over_at)} />
            <Field k="Livrée" v={date(o.delivered_at)} />
          </dl>
        </section>
        <section className="card">
          <h2>Paiement</h2>
          <dl className="dl">
            <Field k="Montant" v={<b>{money(o.amount, o.currency)}</b>} />
            <Field k="Livraison" v={money(o.shipping_cost, o.currency)} />
            <Field k="Total payé" v={money(o.total_amount ?? o.amount, o.currency)} />
            <Field k="Commission plateforme" v={money(o.platform_fee, o.currency)} />
            <Field k="Frais de paiement" v={money(o.processing_fee, o.currency)} />
            <Field k="Net vendeur" v={money(o.seller_payout, o.currency)} />
            <Field k="Moyen" v={o.payment_provider || 'stripe'} />
            <Field k="Identifiant paiement" v={<code className="small">{o.airwallex_intent_id || o.stripe_payment_intent_id || o.rapyd_payment_id || '—'}</code>} />
            <Field k="Versement" v={<><Badge s={o.payout_status} /> {o.payout_method || ''} {o.payout_released_at ? `le ${date(o.payout_released_at)}` : ''}</>} />
            <Field k="Virement" v={<code className="small">{o.payout_transfer_id || '—'}</code>} />
          </dl>
        </section>
        <section className="card">
          <h2>Remise / livraison</h2>
          <dl className="dl">
            <Field k="Mode" v={<Badge s={o.fulfillment_method} />} />
            <Field k="Adresse" v={<Address a={o.shipping_address} />} />
            <Field k="Transporteur" v={o.carrier} />
            <Field k="Suivi" v={o.tracking_number} />
            <Field k="Point relais" v={o.relay_point_name} />
            <Field k="Preuves envoyées le" v={date(o.proof_submitted_at)} />
            <Field k="Date limite de remise" v={date(o.handover_deadline)} />
          </dl>
          <h3>Photos colis / bordereau</h3>
          {proofUrls.length ? <Photos urls={proofUrls} size={110} /> : <p className="muted">Aucune preuve.</p>}
          {o.proofs?.label_url && <p><a href={o.proofs.label_url} target="_blank" rel="noreferrer">Étiquette d’envoi</a></p>}
        </section>
        <section className="card">
          <h2>Litiges et avis</h2>
          {o.disputes.length === 0 && <p className="muted">Aucun litige.</p>}
          {o.disputes.map((d: Row) => (
            <div key={d.id} className="note"><Badge s={d.status} /> <b>{d.reason}</b> — {d.description} <div className="muted small">{date(d.created_at)} {d.resolution_note ? `· ${d.resolution_note}` : ''}</div>
              <Photos urls={[...(d.photo_urls || []), ...(d.evidence_urls || []), ...(d.seller_photo_urls || [])]} size={60} /></div>
          ))}
          {o.reviews.map((r: Row) => <div key={r.id} className="note">{'★'.repeat(r.rating || 0)} {r.comment}</div>)}
        </section>
      </div>
    </div>
  )
}
