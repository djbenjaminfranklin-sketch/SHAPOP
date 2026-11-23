import { useEffect } from 'react'

/** Écran de direct : coupe le filtre du thème clair (classe « live-screen » sur <html>, voir App.tsx). */
export function useLiveScreen() {
  useEffect(() => {
    const html = document.documentElement
    html.classList.add('live-screen')
    return () => { html.classList.remove('live-screen') }
  }, [])
}
