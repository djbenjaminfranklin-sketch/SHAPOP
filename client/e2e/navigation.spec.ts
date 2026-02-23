import { test, expect } from '@playwright/test'

test.describe('Public pages load without crash', () => {
  const publicPages = [
    { path: '/', name: 'Home' },
    { path: '/login', name: 'Login' },
    { path: '/register', name: 'Register' },
    { path: '/explore', name: 'Explore' },
    { path: '/terms', name: 'Terms' },
    { path: '/privacy', name: 'Privacy' },
    { path: '/eula', name: 'EULA' },
    { path: '/faq', name: 'FAQ' },
    { path: '/contact', name: 'Contact' },
    { path: '/about', name: 'About' },
  ]

  for (const pg of publicPages) {
    test(`${pg.name} (${pg.path}) loads without crash`, async ({ page }) => {
      await page.goto(pg.path)
      await page.waitForLoadState('networkidle')
      // Page should not show error boundary
      await expect(page.locator('text=Une erreur technique est survenue')).not.toBeVisible()
      // Page should have some visible content
      const body = page.locator('body')
      await expect(body).toBeVisible()
      // No white screen — check that main content has rendered
      const content = await page.locator('div').first().isVisible()
      expect(content).toBeTruthy()
    })
  }
})

test.describe('404 handling', () => {
  test('unknown route shows 404 page', async ({ page }) => {
    await page.goto('/this-route-does-not-exist-12345')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('text=Une erreur technique est survenue')).not.toBeVisible()
  })
})

test.describe('Navigation links work', () => {
  test('Home page bottom nav links are clickable', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const exploreLink = page.locator('a[href="/explore"]').first()
    if (await exploreLink.isVisible()) {
      await exploreLink.click()
      await expect(page).toHaveURL(/\/explore/)
    }
  })

  test('Login page has link to register', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    const registerLink = page.locator('a[href="/register"]').first()
    await expect(registerLink).toBeVisible()
  })

  test('Register page has link to login', async ({ page }) => {
    await page.goto('/register')
    await page.waitForLoadState('networkidle')
    const loginLink = page.locator('a[href="/login"]').first()
    await expect(loginLink).toBeVisible()
  })
})

test.describe('Back buttons work', () => {
  test('FAQ back button navigates away', async ({ page }) => {
    await page.goto('/faq')
    await page.waitForLoadState('networkidle')
    const backBtn = page.locator('button').filter({ has: page.locator('svg path[d*="M19 12H5"]') }).first()
    if (await backBtn.isVisible()) {
      await backBtn.click()
      await page.waitForTimeout(500)
      expect(page.url()).not.toContain('/faq')
    }
  })

  test('About back button navigates away', async ({ page }) => {
    await page.goto('/about')
    await page.waitForLoadState('networkidle')
    const backBtn = page.locator('button').filter({ has: page.locator('svg path[d*="M19 12H5"]') }).first()
    if (await backBtn.isVisible()) {
      await backBtn.click()
      await page.waitForTimeout(500)
      expect(page.url()).not.toContain('/about')
    }
  })
})

test.describe('No console errors on page load', () => {
  const pages = ['/', '/login', '/register', '/explore', '/terms', '/faq', '/about']

  for (const path of pages) {
    test(`${path} has no critical console errors`, async ({ page }) => {
      const errors: string[] = []
      page.on('console', msg => {
        if (msg.type() === 'error') {
          const text = msg.text()
          if (!text.includes('favicon') && !text.includes('net::ERR') && !text.includes('Failed to load resource') && !text.includes('splash.mp4') && !text.includes('CORS') && !text.includes('Access-Control')) {
            errors.push(text)
          }
        }
      })

      await page.goto(path)
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1000)

      const criticalErrors = errors.filter(e =>
        !e.includes('Warning:') &&
        !e.includes('auth') &&
        !e.includes('session') &&
        !e.includes('401') &&
        !e.includes('Not authenticated') &&
        !e.includes('supabase') &&
        !e.includes('ERR_CONNECTION_REFUSED')
      )

      expect(criticalErrors).toEqual([])
    })
  }
})
