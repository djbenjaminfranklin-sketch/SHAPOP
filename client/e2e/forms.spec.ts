import { test, expect } from '@playwright/test'

test.describe('Forms — Login page', () => {
  test('email input accepts text', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    const emailInput = page.locator('input[type="email"]')
    await expect(emailInput).toBeVisible()
    await emailInput.fill('test@example.com')
    await expect(emailInput).toHaveValue('test@example.com')
  })

  test('password input is type="password" by default', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    const passwordInput = page.locator('input[type="password"]')
    await expect(passwordInput).toBeVisible()
    const type = await passwordInput.getAttribute('type')
    expect(type).toBe('password')
  })

  test('submit button exists and is clickable', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    const submitButton = page.getByRole('button', {
      name: /Se connecter|Sign in|התחבר|Iniciar sesión/,
    })
    await expect(submitButton).toBeVisible()
    await expect(submitButton).toBeEnabled()
    const type = await submitButton.getAttribute('type')
    expect(type).toBe('submit')
  })

  test('empty submit does not navigate away from login', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    const submitButton = page.getByRole('button', {
      name: /Se connecter|Sign in|התחבר|Iniciar sesión/,
    })
    await submitButton.click()
    await page.waitForTimeout(1000)
    expect(page.url()).toContain('/login')
  })

  test('password visibility toggle works', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    const passwordInput = page.locator('form input[type="password"]')
    await expect(passwordInput).toBeVisible()

    const toggleButton = page.locator('form div[style*="position: relative"] button[type="button"]')
    await expect(toggleButton).toBeVisible()
    await toggleButton.click()

    const input = page.locator('form div[style*="position: relative"] input')
    await expect(input).toHaveAttribute('type', 'text')
  })
})

test.describe('Forms — Register page', () => {
  test('has email and password fields', async ({ page }) => {
    await page.goto('/register')
    await page.waitForLoadState('networkidle')
    const emailInput = page.locator('input[type="email"]')
    await expect(emailInput).toBeVisible()
    const passwordInput = page.locator('input[type="password"]')
    await expect(passwordInput).toBeVisible()
  })

  test('has username and display name fields', async ({ page }) => {
    await page.goto('/register')
    await page.waitForLoadState('networkidle')
    const usernameInput = page.getByPlaceholder(/nom d'utilisateur|username|שם משתמש|nombre de usuario/i)
    await expect(usernameInput).toBeVisible()
    const displayNameInput = page.getByPlaceholder('Alex')
    await expect(displayNameInput).toBeVisible()
  })

  test('has a phone number field', async ({ page }) => {
    await page.goto('/register')
    await page.waitForLoadState('networkidle')
    const phoneInput = page.locator('input[type="tel"]')
    await expect(phoneInput).toBeVisible()
  })

  test('has a link back to login', async ({ page }) => {
    await page.goto('/register')
    await page.waitForLoadState('networkidle')
    const loginLink = page.locator('a[href="/login"]')
    await expect(loginLink).toBeVisible()
    const text = await loginLink.textContent()
    expect(text).toMatch(/Se connecter|Sign in|התחבר|Iniciar sesión/)
  })

  test('has a sign-up submit button', async ({ page }) => {
    await page.goto('/register')
    await page.waitForLoadState('networkidle')
    // The submit button exists but may be disabled until terms/age checkboxes are checked
    const signUpButton = page.locator('button[type="submit"]').first()
    await expect(signUpButton).toBeVisible()
  })
})

test.describe('Forms — Autocomplete attributes', () => {
  test.skip('login email input has autocomplete="email"', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    const emailInput = page.locator('input[type="email"]')
    await expect(emailInput).toHaveAttribute('autocomplete', 'email')
  })

  test.skip('login password input has autocomplete="current-password"', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    const passwordInput = page.locator('input[type="password"]')
    await expect(passwordInput).toHaveAttribute('autocomplete', 'current-password')
  })

  test.skip('register password input has autocomplete="new-password"', async ({ page }) => {
    await page.goto('/register')
    await page.waitForLoadState('networkidle')
    const passwordInput = page.locator('input[type="password"]')
    await expect(passwordInput).toHaveAttribute('autocomplete', 'new-password')
  })
})
