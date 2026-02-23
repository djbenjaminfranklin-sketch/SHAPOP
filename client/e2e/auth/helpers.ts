import { expect, type Page } from '@playwright/test'

/** Common console error patterns to ignore */
const IGNORED_PATTERNS = [
  'favicon',
  'net::ERR',
  'Failed to load resource',
  'splash.mp4',
  'CORS',
  'Access-Control',
  'supabase',
  'ERR_CONNECTION_REFUSED',
  'Warning:',
  'auth',
  'session',
  '401',
  'Not authenticated',
  'ResizeObserver',
  'AbortError',
  'Failed to fetch',
  'NetworkError',
  'serviceWorker',
  'workbox',
]

/** Verify no error boundary crash is visible */
export async function expectNoErrorBoundary(page: Page) {
  // Check all 4 languages for error boundary title
  const errorBoundary = page.getByText(
    /Une erreur technique est survenue|Oups, une erreur est survenue|Something went wrong|משהו השתבש|Algo salio mal/
  )
  await expect(errorBoundary).not.toBeVisible()
}

/** Verify user is authenticated by checking bottom nav has explore link */
export async function expectAuthenticated(page: Page) {
  await expect(page.locator('a[href="/explore"]').first()).toBeVisible({ timeout: 10000 })
}

/** Navigate to a path, wait for load, and verify no crash */
export async function goTo(page: Page, path: string) {
  await page.goto(path)
  await page.waitForLoadState('networkidle')
  await expectNoErrorBoundary(page)
}

/** Common console error filter -- ignores known harmless errors */
export function isHarmlessConsoleError(text: string): boolean {
  const lower = text.toLowerCase()
  return IGNORED_PATTERNS.some((p) => lower.includes(p.toLowerCase()))
}

/** Collect console errors, filtering out known harmless ones */
export function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text()
      if (!isHarmlessConsoleError(text)) {
        errors.push(text)
      }
    }
  })
  return errors
}
