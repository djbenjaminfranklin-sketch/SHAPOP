let toastTimeout: ReturnType<typeof setTimeout> | null = null

export function showToast(message: string, type: 'success' | 'error' = 'success') {
  // Remove existing toast
  const existing = document.getElementById('shapop-toast')
  if (existing) existing.remove()
  if (toastTimeout) clearTimeout(toastTimeout)

  const toast = document.createElement('div')
  toast.id = 'shapop-toast'
  toast.textContent = message
  const bg = type === 'error'
    ? 'linear-gradient(135deg, #DC2626, #EF4444)'
    : 'linear-gradient(135deg, #22C55E, #16A34A)'

  Object.assign(toast.style, {
    position: 'fixed',
    top: 'calc(env(safe-area-inset-top, 0px) + 16px)',
    left: '16px',
    right: '16px',
    padding: '14px 20px',
    borderRadius: '14px',
    background: bg,
    color: '#fff',
    fontSize: '14px',
    fontWeight: '600',
    textAlign: 'center',
    zIndex: '9999',
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
    transform: 'translateY(-20px)',
    opacity: '0',
    transition: 'transform 0.3s ease, opacity 0.3s ease',
    pointerEvents: 'none',
  })

  document.body.appendChild(toast)

  // Trigger animation
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      toast.style.transform = 'translateY(0)'
      toast.style.opacity = '1'
    })
  })

  toastTimeout = setTimeout(() => {
    toast.style.transform = 'translateY(-20px)'
    toast.style.opacity = '0'
    setTimeout(() => toast.remove(), 300)
  }, 2500)
}
