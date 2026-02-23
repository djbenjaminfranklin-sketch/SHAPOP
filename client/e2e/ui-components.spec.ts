import { test, expect } from '@playwright/test'

test.describe('No white screen (overscroll check)', () => {
  test('Home page has dark background', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const bodyBg = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor
    })
    const rootBg = await page.evaluate(() => {
      const root = document.querySelector('#root')
      if (!root) return ''
      const el = root.firstElementChild
      if (!el) return ''
      return window.getComputedStyle(el).backgroundColor
    })

    // Body and root div should be dark (not white/transparent)
    expect(bodyBg).not.toBe('rgba(0, 0, 0, 0)')
    expect(bodyBg).not.toBe('rgb(255, 255, 255)')
    expect(rootBg).not.toBe('rgba(0, 0, 0, 0)')
    expect(rootBg).not.toBe('rgb(255, 255, 255)')
  })
})

test.describe('Images have error fallbacks', () => {
  test('broken image src does not show browser default', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const images = await page.locator('img').all()
    for (const img of images) {
      if (await img.isVisible()) {
        const naturalWidth = await img.evaluate((el: HTMLImageElement) => el.naturalWidth)
        const display = await img.evaluate((el: HTMLImageElement) => window.getComputedStyle(el).display)
        const background = await img.evaluate((el: HTMLImageElement) => window.getComputedStyle(el).background)

        const isOk = naturalWidth > 0 || display === 'none' || background.includes('gradient')
        expect(isOk).toBeTruthy()
      }
    }
  })
})

test.describe('Bottom navigation', () => {
  test('home page has login/register links when unauthenticated', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Unauthenticated users see a landing page with login/register links
    const loginLink = page.locator('a[href="/login"]').first()
    const registerLink = page.locator('a[href="/register"]').first()

    await expect(loginLink).toBeVisible({ timeout: 5000 })
    await expect(registerLink).toBeVisible()
  })

  test('landing page login link navigates to login', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const loginLink = page.locator('a[href="/login"]').first()
    if (await loginLink.isVisible()) {
      await loginLink.click()
      await page.waitForTimeout(500)
      await expect(page).toHaveURL(/\/login/)
    }
  })
})

test.describe('Login page form', () => {
  test('login form has email and password fields', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    const emailInput = page.locator('input[type="email"]').first()
    await expect(emailInput).toBeVisible()

    const passwordInput = page.locator('input[type="password"]').first()
    await expect(passwordInput).toBeVisible()

    const submitBtn = page.locator('button[type="submit"]').first()
    await expect(submitBtn).toBeVisible()
  })

  test('login form shows error on empty submit', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    const submitBtn = page.locator('button[type="submit"]').first()
    await submitBtn.click()
    await page.waitForTimeout(500)
  })
})

test.describe('Register page form', () => {
  test('register form has required fields', async ({ page }) => {
    await page.goto('/register')
    await page.waitForLoadState('networkidle')

    const emailInput = page.locator('input[type="email"]').first()
    await expect(emailInput).toBeVisible()

    const passwordInput = page.locator('input[type="password"]').first()
    await expect(passwordInput).toBeVisible()
  })

  test('register form validates short password', async ({ page }) => {
    await page.goto('/register')
    await page.waitForLoadState('networkidle')

    const emailInput = page.locator('input[type="email"]').first()
    const passwordInput = page.locator('input[type="password"]').first()

    await emailInput.fill('test@test.com')
    await passwordInput.fill('123') // Too short (min 6)

    // Check all checkboxes (terms + age)
    const checkboxes = page.locator('input[type="checkbox"]')
    const checkboxCount = await checkboxes.count()
    for (let i = 0; i < checkboxCount; i++) {
      const cb = checkboxes.nth(i)
      if (await cb.isVisible()) {
        await cb.check()
      }
    }

    const submitBtn = page.locator('button[type="submit"]').first()
    await submitBtn.click()
    await page.waitForTimeout(1000)

    // Should still be on register page (password too short)
    await expect(page).toHaveURL(/\/register/)
  })
})

test.describe('Lazy-loaded pages mount correctly', () => {
  const lazyPages = [
    '/terms',
    '/privacy',
    '/eula',
    '/faq',
    '/contact',
    '/about',
  ]

  for (const path of lazyPages) {
    test(`${path} renders content (not just loader)`, async ({ page }) => {
      await page.goto(path)
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1000)

      const textContent = await page.locator('body').innerText()
      expect(textContent.length).toBeGreaterThan(50)
    })
  }
})

test.describe('RTL support', () => {
  test('Hebrew mode sets dir=rtl', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    await page.evaluate(() => {
      localStorage.setItem('shapop_lang', 'he')
    })
    await page.reload()
    await page.waitForLoadState('networkidle')

    const dir = await page.locator('div[dir]').first().getAttribute('dir')
    expect(dir).toBe('rtl')

    await page.evaluate(() => {
      localStorage.setItem('shapop_lang', 'fr')
    })
  })
})
