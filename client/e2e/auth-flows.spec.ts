import { test, expect } from '@playwright/test'

test.describe('Protected pages redirect to login or handle gracefully', () => {
  const protectedPages = [
    '/profile',
    '/dashboard',
    '/activity',
    '/notifications',
    '/payments',
    '/addresses',
    '/preferences',
    '/referrals',
    '/go-live',
    '/direct-sales',
    '/verification',
    '/account-controls',
    '/security',
    '/change-password',
    '/change-email',
    '/team',
    '/messages',
    '/account-status',
    '/admin',
    '/ai-listing',
  ]

  for (const path of protectedPages) {
    test(`${path} does not crash without auth`, async ({ page }) => {
      await page.goto(path)
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1500)

      const errorBoundary = page.locator('text=Une erreur technique est survenue')
      await expect(errorBoundary).not.toBeVisible()

      const bodyText = await page.locator('body').innerText()
      expect(bodyText.length).toBeGreaterThan(0)
    })
  }
})

test.describe('Login form interaction', () => {
  test('can type in login form fields', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    const emailInput = page.locator('input[type="email"]').first()
    const passwordInput = page.locator('input[type="password"]').first()

    await emailInput.fill('user@example.com')
    await passwordInput.fill('password123')

    await expect(emailInput).toHaveValue('user@example.com')
    await expect(passwordInput).toHaveValue('password123')
  })

  test('login with invalid credentials shows error', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    const emailInput = page.locator('input[type="email"]').first()
    const passwordInput = page.locator('input[type="password"]').first()
    const submitBtn = page.locator('button[type="submit"]').first()

    await emailInput.fill('nonexistent@example.com')
    await passwordInput.fill('wrongpassword')
    await submitBtn.click()

    await page.waitForTimeout(3000)

    await expect(page).toHaveURL(/\/login/)

    const errorBoundary = page.locator('text=Une erreur technique est survenue')
    await expect(errorBoundary).not.toBeVisible()
  })
})

test.describe('Register form interaction', () => {
  test('can fill registration form', async ({ page }) => {
    await page.goto('/register')
    await page.waitForLoadState('networkidle')

    const emailInput = page.locator('input[type="email"]').first()
    const passwordInput = page.locator('input[type="password"]').first()

    await emailInput.fill('newuser@example.com')
    await passwordInput.fill('SecurePass123')

    await expect(emailInput).toHaveValue('newuser@example.com')
    await expect(passwordInput).toHaveValue('SecurePass123')
  })
})

test.describe('Dynamic route pages handle missing data', () => {
  const dynamicPages = [
    '/stream/nonexistent-id',
    '/item/nonexistent-id',
    '/seller/nonexistent-id',
    '/order/nonexistent-id',
    '/community/nonexistent-id',
    '/conversation/nonexistent-id',
    '/dispute/nonexistent-id',
    '/prepare-live/nonexistent-id',
    '/live-seller/nonexistent-id',
    '/live-recap/nonexistent-id',
  ]

  for (const path of dynamicPages) {
    test(`${path} handles missing data without crash`, async ({ page }) => {
      await page.goto(path)
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(2000)

      const errorBoundary = page.locator('text=Une erreur technique est survenue')
      await expect(errorBoundary).not.toBeVisible()
    })
  }
})

test.describe('Legal pages have content', () => {
  test('Terms page has substantial content', async ({ page }) => {
    await page.goto('/terms')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)
    const text = await page.locator('body').innerText()
    expect(text.length).toBeGreaterThan(500)
  })

  test('Privacy page has substantial content', async ({ page }) => {
    await page.goto('/privacy')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)
    const text = await page.locator('body').innerText()
    expect(text.length).toBeGreaterThan(500)
  })

  test('EULA page has substantial content', async ({ page }) => {
    await page.goto('/eula')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)
    const text = await page.locator('body').innerText()
    expect(text.length).toBeGreaterThan(500)
  })
})

test.describe('Language switching', () => {
  const languages = [
    { code: 'fr', sample: /connexion|accueil|bienvenue|Se connecter/i },
    { code: 'en', sample: /login|home|welcome|Sign in/i },
    { code: 'he', sample: /כניסה|בית|ברוך|התחברות/i },
    { code: 'es', sample: /iniciar|inicio|bienvenido|sesión/i },
  ]

  for (const lang of languages) {
    test(`App renders in ${lang.code}`, async ({ page }) => {
      await page.goto('/login')
      await page.waitForLoadState('networkidle')
      await page.evaluate((code) => {
        localStorage.setItem('shapop_lang', code)
      }, lang.code)
      await page.reload()
      await page.waitForLoadState('networkidle')

      // Wait for React to render the login form
      await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10000 })

      const bodyText = await page.locator('body').innerText()
      expect(bodyText.length).toBeGreaterThan(10)

      const errorBoundary = page.locator('text=Une erreur technique est survenue')
      await expect(errorBoundary).not.toBeVisible()
    })
  }
})
