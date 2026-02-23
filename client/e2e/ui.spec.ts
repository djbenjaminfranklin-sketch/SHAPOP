import { test, expect } from '@playwright/test'

test.describe('UI & Theming', () => {
  test('dark theme is applied — background is black', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    const bgColor = await page.evaluate(() => {
      const root = document.querySelector('#root')
      if (!root) return ''
      const el = root.firstElementChild
      if (!el) return ''
      return window.getComputedStyle(el).backgroundColor
    })
    expect(bgColor).toMatch(/rgb\(0, 0, 0\)|rgb\(10, 10, 10\)/)
  })

  test('splash screen appears on first load', async ({ page, context }) => {
    // Clear splash flag so splash actually shows
    await context.clearCookies()
    await page.goto('/')
    await page.evaluate(() => localStorage.removeItem('shapop_splash_seen'))
    await page.reload()
    const skipButton = page.getByText(/Skip|Passer|דלג/)
    await expect(skipButton).toBeVisible({ timeout: 5000 })
  })

  test('splash screen can be skipped', async ({ page }) => {
    // Clear splash flag so splash actually shows
    await page.goto('/')
    await page.evaluate(() => localStorage.removeItem('shapop_splash_seen'))
    await page.reload()
    // Target the splash Skip button specifically (not "Skip to content" a11y link)
    const skipButton = page.locator('button', { hasText: /^(Skip|Passer|דלג)$/ })
    await expect(skipButton).toBeVisible({ timeout: 5000 })
    await skipButton.click()
    // After skipping, splash overlay should disappear
    await expect(skipButton).not.toBeVisible({ timeout: 5000 })
    await expect(page.locator('#root')).not.toBeEmpty()
  })

  test('responsive layout — content fits within mobile viewport', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth
    })
    expect(hasOverflow).toBe(false)
  })

  test('no console errors on page load', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text()
        const ignoredPatterns = [
          'supabase',
          'Failed to fetch',
          'NetworkError',
          'net::ERR',
          'ERR_CONNECTION_REFUSED',
          'serviceWorker',
          'workbox',
          'SW',
          'favicon',
          'splash.mp4',
          'CORS',
          'Access-Control',
          'blocked by CORS',
        ]
        const isIgnored = ignoredPatterns.some((p) => text.toLowerCase().includes(p.toLowerCase()))
        if (!isIgnored) {
          errors.push(text)
        }
      }
    })
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    expect(errors).toEqual([])
  })

  test('html lang attribute is set', async ({ page }) => {
    await page.goto('/')
    const lang = await page.getAttribute('html', 'lang')
    expect(lang).toBe('fr')
  })

  test('login page has email and password inputs', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    const emailInput = page.locator('input[type="email"]')
    const passwordInput = page.locator('input[type="password"]')
    await expect(emailInput).toBeVisible({ timeout: 5000 })
    await expect(passwordInput).toBeVisible()
  })

  test('login page has sign-in button', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await expect(
      page.getByRole('button', { name: /Se connecter|Sign in|התחבר/ })
    ).toBeVisible({ timeout: 5000 })
  })

  test('404 page has correct styling', async ({ page }) => {
    await page.goto('/nonexistent-route')
    await page.waitForLoadState('networkidle')
    const heading = page.getByText('404')
    await expect(heading).toBeVisible({ timeout: 5000 })
    const color = await heading.evaluate((el) => window.getComputedStyle(el).color)
    expect(color).toBe('rgb(232, 52, 78)')
  })

  test('404 page has a "Go Home" button', async ({ page }) => {
    await page.goto('/nonexistent-route')
    await page.waitForLoadState('networkidle')
    const btn = page.getByRole('button', { name: /Retour|Go Home|חזרה|Volver/ })
    await expect(btn).toBeVisible({ timeout: 5000 })
  })
})
