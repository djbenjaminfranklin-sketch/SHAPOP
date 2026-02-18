import { test, expect } from '@playwright/test'

test.describe('UI & Theming', () => {
  test('dark theme is applied — background is black', async ({ page }) => {
    await page.goto('/')
    // Wait for splash screen to finish (the app shows a splash then transitions to content).
    // The outer wrapper div has class "min-h-screen bg-black" or inline backgroundColor: '#000'.
    // We check the body or root-level element background color.
    await page.waitForTimeout(3500) // Allow splash animation to complete
    const bgColor = await page.evaluate(() => {
      const root = document.querySelector('#root')
      if (!root) return ''
      const el = root.firstElementChild
      if (!el) return ''
      return window.getComputedStyle(el).backgroundColor
    })
    // The background should be black (rgb(0, 0, 0)) or very dark
    // During splash, the background is #000; after splash, the wrapper also has bg-black
    expect(bgColor).toMatch(/rgb\(0, 0, 0\)/)
  })

  test('splash screen appears on first load', async ({ page }) => {
    await page.goto('/')
    // The splash screen has a skip button and a video element
    // It should be visible immediately after page load
    const skipButton = page.getByText(/Skip|Passer|דלג/)
    await expect(skipButton).toBeVisible({ timeout: 5000 })
  })

  test('splash screen can be skipped', async ({ page }) => {
    await page.goto('/')
    const skipButton = page.getByText(/Skip|Passer|דלג/)
    await expect(skipButton).toBeVisible({ timeout: 5000 })
    await skipButton.click()
    // After skipping, splash should disappear and main content should render
    await expect(skipButton).not.toBeVisible({ timeout: 3000 })
    // The root should now have content (router + app shell)
    await expect(page.locator('#root')).not.toBeEmpty()
  })

  test('responsive layout — content fits within mobile viewport', async ({ page }) => {
    // Viewport is already set to 390x844 (iPhone 14 Pro) in config
    await page.goto('/')
    await page.waitForTimeout(3500) // Wait for splash
    // Ensure no horizontal overflow
    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth
    })
    expect(hasOverflow).toBe(false)
  })

  test('no console errors on page load', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        // Ignore expected errors (e.g. Supabase connection failures without backend,
        // failed network requests, service worker registration errors)
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
        ]
        const isIgnored = ignoredPatterns.some((p) => text.toLowerCase().includes(p.toLowerCase()))
        if (!isIgnored) {
          errors.push(text)
        }
      }
    })
    await page.goto('/')
    await page.waitForTimeout(4000) // Wait for splash + initial load
    expect(errors).toEqual([])
  })

  test('html lang attribute is set', async ({ page }) => {
    await page.goto('/')
    const lang = await page.getAttribute('html', 'lang')
    // The index.html has lang="fr" by default
    expect(lang).toBe('fr')
  })

  test('login page has email and password inputs', async ({ page }) => {
    await page.goto('/login')
    // Wait for splash to finish and login page to load
    await page.waitForTimeout(3500)
    // Click skip if splash is still showing
    const skipButton = page.getByText(/Skip|Passer|דלג/)
    if (await skipButton.isVisible().catch(() => false)) {
      await skipButton.click()
      await page.waitForTimeout(500)
    }
    // Navigate to login after splash
    await page.goto('/login')
    await page.waitForTimeout(2000)
    // The login page should have email and password input fields
    const emailInput = page.getByPlaceholder(/email/i)
    const passwordInput = page.getByPlaceholder(/••••••••/)
    await expect(emailInput).toBeVisible({ timeout: 5000 })
    await expect(passwordInput).toBeVisible()
  })

  test('login page has sign-in button', async ({ page }) => {
    await page.goto('/login')
    await page.waitForTimeout(3500)
    const skipButton = page.getByText(/Skip|Passer|דלג/)
    if (await skipButton.isVisible().catch(() => false)) {
      await skipButton.click()
      await page.waitForTimeout(500)
    }
    await page.goto('/login')
    // Check for sign in button in any of the supported languages
    await expect(
      page.getByRole('button', { name: /Se connecter|Sign in|התחבר/ })
    ).toBeVisible({ timeout: 5000 })
  })

  test('404 page has correct styling', async ({ page }) => {
    await page.goto('/nonexistent-route')
    await page.waitForTimeout(3500)
    // The 404 page has a large "404" in accent color (#E8344E)
    const heading = page.getByText('404')
    await expect(heading).toBeVisible({ timeout: 5000 })
    const color = await heading.evaluate((el) => window.getComputedStyle(el).color)
    // #E8344E in RGB is rgb(232, 52, 78)
    expect(color).toBe('rgb(232, 52, 78)')
  })

  test('404 page has a "Go Home" button', async ({ page }) => {
    await page.goto('/nonexistent-route')
    await page.waitForTimeout(3500)
    // The button text depends on locale: "Retour a l'accueil" / "Go Home" / etc.
    const btn = page.getByRole('button', { name: /Retour|Go Home|חזרה|Volver/ })
    await expect(btn).toBeVisible({ timeout: 5000 })
  })
})
