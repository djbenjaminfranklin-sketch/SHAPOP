// Paiement Stripe partagé (fenêtre « Tu as gagné » du direct et page « Payer » d'une commande).
import { loadStripe, type Stripe } from '@stripe/stripe-js'
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { apiFetch } from '../../lib/api'

// Stripe Elements loader — initialized once
let stripePromise: Promise<Stripe | null> | null = null
export function getStripePromise() {
  if (!stripePromise) {
    stripePromise = apiFetch('/api/stripe/config')
      .then(r => r.json())
      .then(({ publishable_key }) => loadStripe(publishable_key))
      .catch(() => null)
  }
  return stripePromise
}

// Inner payment form rendered inside <Elements>
export function PaymentFormInner({ onSuccess, onError, loading, setLoading, payNowLabel, paymentFailedLabel }: {
  onSuccess: (paymentIntentId: string) => void
  onError: (msg: string) => void
  loading: boolean
  setLoading: (v: boolean) => void
  payNowLabel: string
  paymentFailedLabel: string
}) {
  const stripe = useStripe()
  const elements = useElements()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return
    setLoading(true)

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: window.location.href },
      redirect: 'if_required',
    })

    if (error) {
      onError(error.message || paymentFailedLabel)
      setLoading(false)
    } else if (paymentIntent) {
      onSuccess(paymentIntent.id)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement options={{ layout: 'tabs' }} />
      <button
        type="submit"
        disabled={!stripe || loading}
        style={{
          width: '100%', marginTop: '16px', padding: '16px',
          background: loading ? '#555' : 'linear-gradient(135deg, #22C55E, #16A34A)',
          borderRadius: '14px', border: 'none',
          color: '#fff', fontSize: 'calc(16px * var(--fs, 1))', fontWeight: 700,
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? '...' : payNowLabel}
      </button>
    </form>
  )
}

