// Base URL for the API server
// In dev: empty (Vite proxy handles /api → localhost:4000)
// In production (Capacitor): the deployed server URL
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

// Helper for API fetch calls
export function apiFetch(path: string, options?: RequestInit): Promise<Response> {
  return fetch(`${API_URL}${path}`, options)
}

// WebSocket URL builder
export function wsUrl(path: string): string {
  if (API_URL) {
    // Production: use the API URL with ws/wss protocol
    const url = new URL(API_URL)
    const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${protocol}//${url.host}${path}`
  }
  // Dev: use current host (Vite proxy)
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}${path}`
}
