import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

vi.mock('../supabase', () => ({
  supabase: { auth: { getSession: async () => ({ data: { session: { access_token: 'tok' } } }) } },
}))

import { formatMoney, isAwaitingHandover, isPaidStatus, fulfillmentApi } from '../fulfillment'
import { FULFILLMENT_TEXTS, ft, statusLabel } from '../fulfillmentText'
import DeliveryChoice from '../../components/checkout/DeliveryChoice'

describe('formatMoney', () => {
  it('utilise la devise de la commande (pas de symbole en dur)', () => {
    expect(formatMoney(29, 'ILS', 'en')).toContain('29')
    expect(formatMoney(29, 'ILS', 'en')).toMatch(/₪|ILS/)
    expect(formatMoney(9.59, 'EUR', 'fr')).toMatch(/9,59\s?€/)
    expect(formatMoney(11.1, 'USD', 'en')).toBe('$11.10')
  })
  it('résiste à une devise inconnue', () => {
    expect(formatMoney(5, 'XXX-BAD', 'en')).toContain('5')
  })
})

describe('Textes de la remise en 5 langues', () => {
  const langs = ['fr', 'en', 'es', 'ru', 'he'] as const
  it('chaque langue a toutes les clés, non vides', () => {
    const keys = Object.keys(FULFILLMENT_TEXTS.fr)
    for (const l of langs) {
      for (const k of keys) {
        const v = (FULFILLMENT_TEXTS[l] as Record<string, string>)[k]
        expect(v, `${l}.${k}`).toBeTruthy()
      }
    }
  })
  it('aucun transporteur ni pays imposé dans les textes', () => {
    const all = JSON.stringify(FULFILLMENT_TEXTS)
    expect(all).not.toMatch(/Mondial|Sendcloud|DHL|DPD|Colissimo|Israel Post|israélienne|étiquette/i)
  })
  it('statuts nouveaux traduits', () => {
    expect(statusLabel('handed_over', 'fr')).toBe('Remise en main propre')
    expect(statusLabel('handed_over', 'he')).toBe(FULFILLMENT_TEXTS.he.status_handed_over)
    expect(ft('xx').save).toBe(FULFILLMENT_TEXTS.en.save)
  })
})

describe('États de commande', () => {
  it('payée = coordonnées visibles ; en attente de paiement = non', () => {
    expect(isPaidStatus('paid')).toBe(true)
    expect(isPaidStatus('handed_over')).toBe(true)
    expect(isPaidStatus('pending_payment')).toBe(false)
    expect(isPaidStatus('cancelled')).toBe(false)
  })
  it('attend une preuve seulement si payée et retrait / poste', () => {
    expect(isAwaitingHandover({ status: 'paid', fulfillment_method: 'pickup' })).toBe(true)
    expect(isAwaitingHandover({ status: 'paid', fulfillment_method: 'legacy_carrier' })).toBe(false)
    expect(isAwaitingHandover({ status: 'handed_over', fulfillment_method: 'pickup' })).toBe(false)
  })
})

describe('DeliveryChoice (paiement)', () => {
  const base = {
    order_id: 'o1', status: 'pending_payment' as const, amount: 100, currency: 'ILS',
    pickup: { allowed: true, area: 'Florentin' }, post: { price: 24.5 }, selected_method: null,
    whatsapp: '+972521112233', country: 'IL', dial_code: '972', saved_address: null,
  }
  beforeEach(() => {
    localStorage.setItem('shapop_lang', 'fr')
    vi.restoreAllMocks()
  })

  it('retrait autorisé : choix proposé, pas d\'adresse demandée, 0 de port', async () => {
    vi.spyOn(fulfillmentApi, 'checkoutOptions').mockResolvedValue(base)
    const choose = vi.spyOn(fulfillmentApi, 'choose').mockResolvedValue({ fulfillment_method: 'pickup', shipping_cost: 0, total_amount: 100, currency: 'ILS' })
    const onConfirmed = vi.fn()
    render(<DeliveryChoice orderId="o1" onConfirmed={onConfirmed} />)
    await screen.findByText('Retrait en main propre')
    expect(screen.queryByLabelText('Adresse')).toBeNull()
    fireEvent.click(screen.getByText('Continuer vers le paiement'))
    await waitFor(() => expect(onConfirmed).toHaveBeenCalled())
    expect(choose).toHaveBeenCalledWith('o1', { method: 'pickup', address: undefined, whatsapp: undefined })
  })

  it('poste : adresse demandée, frais de port ajoutés au total', async () => {
    vi.spyOn(fulfillmentApi, 'checkoutOptions').mockResolvedValue({ ...base, pickup: { allowed: false, area: null } })
    render(<DeliveryChoice orderId="o1" onConfirmed={vi.fn()} />)
    await screen.findByText('Ce vendeur envoie uniquement par la poste.')
    expect(screen.getByLabelText('Adresse')).toBeTruthy()
    expect(screen.queryByText('Retrait en main propre')).toBeNull()
    const btn = screen.getByText('Continuer vers le paiement') as HTMLButtonElement
    expect(btn.closest('button')!.disabled).toBe(true)
    const norm = (x: string) => x.replace(/\s/g, ' ')
    expect(norm(document.body.textContent || '')).toContain(norm(formatMoney(124.5, 'ILS', 'fr')))
  })

  it('demande le WhatsApp si l\'acheteur n\'en a pas', async () => {
    vi.spyOn(fulfillmentApi, 'checkoutOptions').mockResolvedValue({ ...base, whatsapp: null })
    render(<DeliveryChoice orderId="o1" onConfirmed={vi.fn()} />)
    expect(await screen.findByLabelText('Ton numéro WhatsApp')).toBeTruthy()
  })
})

import FulfillmentPanel from '../../components/orders/FulfillmentPanel'
import type { OrderFulfillment } from '../fulfillment'

describe('FulfillmentPanel (détail de commande)', () => {
  const base: OrderFulfillment = {
    order_id: 'o1', role: 'buyer', status: 'paid', fulfillment_method: 'pickup', currency: 'ILS', amount: 100,
    shipping_cost: 0, total_amount: 100, paid_at: null, handover_deadline: null, handed_over_at: null,
    proof_submitted_at: null, shipped_at: null, tracking_number: null, payout_status: 'held', payout_released_at: null,
    shipping_address: null, pickup_area: null, handover: { code: '4821', locked: false },
    proofs: { parcel_url: null, slip_url: null },
    contact: { name: 'Dana', whatsapp: '+972541234567', whatsapp_link: 'https://wa.me/972541234567?text=x', email: 'd@x.dev', email_link: 'mailto:d@x.dev' },
  }
  beforeEach(() => { localStorage.setItem('shapop_lang', 'fr'); vi.restoreAllMocks() })

  it('acheteur : voit son code et le bouton WhatsApp', async () => {
    vi.spyOn(fulfillmentApi, 'get').mockResolvedValue(base)
    render(<FulfillmentPanel orderId="o1" />)
    expect(await screen.findByText('4821')).toBeTruthy()
    expect((screen.getByText('Contacter sur WhatsApp') as HTMLAnchorElement).getAttribute('href')).toContain('https://wa.me/972541234567')
  })

  it('vendeur : saisit le code, ne le voit jamais', async () => {
    vi.spyOn(fulfillmentApi, 'get').mockResolvedValue({ ...base, role: 'seller', handover: { attempts_left: 5, locked: false } })
    const submit = vi.spyOn(fulfillmentApi, 'submitCode').mockResolvedValue({ success: true })
    render(<FulfillmentPanel orderId="o1" />)
    const input = await screen.findByLabelText('Code de l\'acheteur')
    expect(screen.queryByText('4821')).toBeNull()
    fireEvent.change(input, { target: { value: '4821' } })
    fireEvent.click(screen.getByText('Valider la remise'))
    await waitFor(() => expect(submit).toHaveBeenCalledWith('o1', '4821'))
  })

  it('avant paiement : pas de coordonnées', async () => {
    vi.spyOn(fulfillmentApi, 'get').mockResolvedValue({ ...base, status: 'pending_payment', handover: null, contact: null })
    render(<FulfillmentPanel orderId="o1" />)
    expect(await screen.findByText('Les coordonnées s\'affichent après le paiement.')).toBeTruthy()
    expect(screen.queryByText('Contacter sur WhatsApp')).toBeNull()
  })

  it('vendeur, envoi par la poste : 2 photos demandées', async () => {
    vi.spyOn(fulfillmentApi, 'get').mockResolvedValue({ ...base, role: 'seller', fulfillment_method: 'post', handover: null })
    render(<FulfillmentPanel orderId="o1" />)
    expect(await screen.findByText('Envoie les 2 photos pour être payé')).toBeTruthy()
    expect(screen.getAllByText('Prendre la photo')).toHaveLength(2)
  })
})
