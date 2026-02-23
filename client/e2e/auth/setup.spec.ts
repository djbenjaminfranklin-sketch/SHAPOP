import { test, expect } from '@playwright/test'
import { fileURLToPath } from 'url'
import path from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const authFile = path.join(__dirname, '../.auth/user.json')

test('authenticate -- create account or login', async ({ page }) => {
  // Use env vars or fallback to test account
  const testEmail = process.env.E2E_TEST_EMAIL || 'shapopcontact@gmail.com'
  const testPassword = process.env.E2E_TEST_PASSWORD || 'Elsamila1979'

  await page.goto('/login')
  await page.waitForLoadState('networkidle')

  await page.locator('input[type="email"]').fill(testEmail)
  await page.locator('input[type="password"]').fill(testPassword)

  // Click sign in button (multilingual)
  await page.getByRole('button', { name: /Se connecter|Sign in|התחבר|Iniciar sesión/ }).click()

  // Wait for redirect to home
  await expect(page).toHaveURL('/', { timeout: 15000 })

  // Handle onboarding / preferences modals — skip all of them
  for (let i = 0; i < 5; i++) {
    const skipBtn = page.getByRole('button', { name: /Skip|Passer|דלג|Saltar/i })
    if (await skipBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await skipBtn.click()
      await page.waitForTimeout(500)
    } else {
      break
    }
  }

  // Also handle "Next" button if onboarding wizard has multiple steps
  for (let i = 0; i < 5; i++) {
    const nextBtn = page.getByRole('button', { name: /Next|Suivant|הבא|Siguiente/i })
    const skipBtn = page.getByRole('button', { name: /Skip|Passer|דלג|Saltar/i })
    if (await skipBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await skipBtn.click()
      await page.waitForTimeout(500)
    } else if (await nextBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await nextBtn.click()
      await page.waitForTimeout(500)
    } else {
      break
    }
  }

  // Close any remaining modal/overlay by pressing Escape
  await page.keyboard.press('Escape')
  await page.waitForTimeout(500)

  // Ensure splash screen is marked as seen
  await page.evaluate(() => {
    localStorage.setItem('shapop_splash_seen', '1')
  })

  // Verify we are authenticated — bottom nav should exist in DOM
  await expect(page.locator('a[href="/explore"]').first()).toBeAttached({ timeout: 10000 })

  // Save auth state
  await page.context().storageState({ path: authFile })
})
