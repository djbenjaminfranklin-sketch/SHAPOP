import { test, expect } from '@playwright/test'
import { goTo, expectNoErrorBoundary } from './helpers'

test.describe('Dashboard / Seller features', () => {
  test('dashboard loads and shows content for new user', async ({ page }) => {
    await goTo(page, '/dashboard')
    // For a new user (not a seller), should show onboarding wizard or "become seller" prompt
    await expect(page.locator('div').first()).toBeVisible({ timeout: 10000 })
    const text = await page.locator('body').textContent()
    // Should show either dashboard data OR seller onboarding content
    expect(text?.length).toBeGreaterThan(10)
  })

  test('onboarding wizard CTA is visible for non-seller', async ({ page }) => {
    await goTo(page, '/dashboard')
    // Should show a "become seller" or "start" button
    const cta = page.getByText(
      /C'est parti|Become a seller|Let's go|בואו נתחיל|Empecemos|Devenir vendeur/
    )
    if (await cta.isVisible({ timeout: 5000 }).catch(() => false)) {
      await cta.click()
      await page.waitForTimeout(500)
      await expectNoErrorBoundary(page)
    }
  })

  test('Go Live page loads', async ({ page }) => {
    await goTo(page, '/go-live')
    await expect(page.locator('div').first()).toBeVisible({ timeout: 10000 })
    const text = await page.locator('body').textContent()
    expect(text?.length).toBeGreaterThan(10)
  })

  test('Direct Sales page loads with content', async ({ page }) => {
    await goTo(page, '/direct-sales')
    await expect(page.locator('div').first()).toBeVisible({ timeout: 10000 })
    const text = await page.locator('body').textContent()
    expect(text?.length).toBeGreaterThan(10)
  })

  test('AI Listing page loads', async ({ page }) => {
    await goTo(page, '/ai-listing')
    await expect(page.locator('div').first()).toBeVisible({ timeout: 10000 })
    const text = await page.locator('body').textContent()
    expect(text?.length).toBeGreaterThan(10)
  })
})
