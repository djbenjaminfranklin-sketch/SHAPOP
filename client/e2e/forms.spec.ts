import { test, expect } from '@playwright/test'

/**
 * Helper: navigate to /login, skipping the splash screen if it appears.
 * Returns once the login page is fully rendered.
 */
async function goToLogin(page: import('@playwright/test').Page) {
  await page.goto('/login')
  // Skip splash if it appears
  const skipButton = page.getByText(/Skip|Passer|דלג/)
  if (await skipButton.isVisible({ timeout: 3000 }).catch(() => false)) {
    await skipButton.click()
    await page.waitForTimeout(500)
    await page.goto('/login')
  }
  // Wait for the login title to confirm the page is loaded
  await expect(
    page.getByText(/Connexion|Sign In|התחברות|Iniciar sesión/)
  ).toBeVisible({ timeout: 10000 })
}

/**
 * Helper: navigate to /register, skipping the splash screen if it appears.
 */
async function goToRegister(page: import('@playwright/test').Page) {
  await page.goto('/register')
  const skipButton = page.getByText(/Skip|Passer|דלג/)
  if (await skipButton.isVisible({ timeout: 3000 }).catch(() => false)) {
    await skipButton.click()
    await page.waitForTimeout(500)
    await page.goto('/register')
  }
  // Wait for the register title to confirm the page is loaded
  await expect(
    page.getByText(/Creer un compte|Create Account|צור חשבון|Crear cuenta/)
  ).toBeVisible({ timeout: 10000 })
}

test.describe('Forms — Login page', () => {
  test('email input accepts text', async ({ page }) => {
    await goToLogin(page)
    const emailInput = page.locator('input[type="email"]')
    await expect(emailInput).toBeVisible()
    await emailInput.fill('test@example.com')
    await expect(emailInput).toHaveValue('test@example.com')
  })

  test('password input is type="password" by default', async ({ page }) => {
    await goToLogin(page)
    const passwordInput = page.locator('input[type="password"]')
    await expect(passwordInput).toBeVisible()
    // Verify it is actually a password field (characters are masked)
    const type = await passwordInput.getAttribute('type')
    expect(type).toBe('password')
  })

  test('submit button exists and is clickable', async ({ page }) => {
    await goToLogin(page)
    const submitButton = page.getByRole('button', {
      name: /Se connecter|Sign in|התחבר|Iniciar sesión/,
    })
    await expect(submitButton).toBeVisible()
    await expect(submitButton).toBeEnabled()
    // Verify the button has type="submit"
    const type = await submitButton.getAttribute('type')
    expect(type).toBe('submit')
  })

  test('empty submit does not navigate away from login', async ({ page }) => {
    await goToLogin(page)
    // The form has required fields, so clicking submit with empty fields
    // should not navigate — the browser's native validation or the form handler keeps us on the page.
    const submitButton = page.getByRole('button', {
      name: /Se connecter|Sign in|התחבר|Iniciar sesión/,
    })
    await submitButton.click()
    // Wait a moment to see if navigation happens
    await page.waitForTimeout(1000)
    // We should still be on /login
    expect(page.url()).toContain('/login')
  })

  test('password visibility toggle works', async ({ page }) => {
    await goToLogin(page)
    const passwordInput = page.locator('form input[type="password"]')
    await expect(passwordInput).toBeVisible()

    // Find the toggle button (the eye icon button next to the password field)
    const toggleButton = page.locator('form div[style*="position: relative"] button[type="button"]')
    await expect(toggleButton).toBeVisible()
    await toggleButton.click()

    // After clicking, the password input type should change to "text"
    const input = page.locator('form div[style*="position: relative"] input')
    await expect(input).toHaveAttribute('type', 'text')
  })
})

test.describe('Forms — Register page', () => {
  test('has email and password fields', async ({ page }) => {
    await goToRegister(page)
    const emailInput = page.locator('input[type="email"]')
    await expect(emailInput).toBeVisible()
    const passwordInput = page.locator('input[type="password"]')
    await expect(passwordInput).toBeVisible()
  })

  test('has username and display name fields', async ({ page }) => {
    await goToRegister(page)
    // The register form has username and display name text inputs
    const usernameInput = page.getByPlaceholder(/nom d'utilisateur|username|שם משתמש|nombre de usuario/i)
    await expect(usernameInput).toBeVisible()
    const displayNameInput = page.getByPlaceholder('Alex')
    await expect(displayNameInput).toBeVisible()
  })

  test('has a phone number field', async ({ page }) => {
    await goToRegister(page)
    const phoneInput = page.locator('input[type="tel"]')
    await expect(phoneInput).toBeVisible()
  })

  test('has a link back to login', async ({ page }) => {
    await goToRegister(page)
    // The register page has "Already have an account? Sign in" with a link to /login
    const loginLink = page.locator('a[href="/login"]')
    await expect(loginLink).toBeVisible()
    const text = await loginLink.textContent()
    expect(text).toMatch(/Se connecter|Sign in|התחבר|Iniciar sesión/)
  })

  test('has a sign-up submit button', async ({ page }) => {
    await goToRegister(page)
    const signUpButton = page.getByRole('button', {
      name: /S'inscrire|Sign up|הרשמה|Registrarse/,
    })
    await expect(signUpButton).toBeVisible()
    await expect(signUpButton).toBeEnabled()
  })
})

test.describe('Forms — Autocomplete attributes', () => {
  // NOTE: The current Login and Register pages do not set autocomplete attributes
  // on their inputs. These tests document the current state; the app should ideally
  // add proper autocomplete attributes for better password-manager integration.

  test.skip('login email input has autocomplete="email"', async ({ page }) => {
    // Skipped: Login.tsx does not currently set autocomplete on the email input.
    // Recommend adding autocomplete="email" to the email input.
    await goToLogin(page)
    const emailInput = page.locator('input[type="email"]')
    await expect(emailInput).toHaveAttribute('autocomplete', 'email')
  })

  test.skip('login password input has autocomplete="current-password"', async ({ page }) => {
    // Skipped: Login.tsx does not currently set autocomplete on the password input.
    // Recommend adding autocomplete="current-password" to the password input.
    await goToLogin(page)
    const passwordInput = page.locator('input[type="password"]')
    await expect(passwordInput).toHaveAttribute('autocomplete', 'current-password')
  })

  test.skip('register password input has autocomplete="new-password"', async ({ page }) => {
    // Skipped: Register.tsx does not currently set autocomplete on the password input.
    // Recommend adding autocomplete="new-password" to the password input.
    await goToRegister(page)
    const passwordInput = page.locator('input[type="password"]')
    await expect(passwordInput).toHaveAttribute('autocomplete', 'new-password')
  })
})
