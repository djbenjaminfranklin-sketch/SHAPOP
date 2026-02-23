import { test, expect } from '@playwright/test'
import { goTo, expectNoErrorBoundary } from './helpers'

test.describe('Communities page', () => {
  test('loads without crash', async ({ page }) => {
    await goTo(page, '/communities')
    await expect(page.locator('div').first()).toBeVisible({ timeout: 10000 })
  })

  test('shows community list', async ({ page }) => {
    await goTo(page, '/communities')
    // Should display community-related content
    const text = await page.locator('body').textContent()
    expect(
      text?.match(/communaut|communit|קהילו|comunidad/i) !== null
    ).toBeTruthy()
  })

  test('search input is functional', async ({ page }) => {
    await goTo(page, '/communities')
    const searchInput = page.locator('input[type="text"], input[type="search"]').first()
    if (await searchInput.isVisible()) {
      await searchInput.fill('Paris')
      await page.waitForTimeout(500)
      await expectNoErrorBoundary(page)
    }
  })

  test('clicking a community navigates to detail', async ({ page }) => {
    await goTo(page, '/communities')
    // Find a clickable community card/button
    const communityCard = page
      .locator('button, a')
      .filter({
        hasText: /Paris|Lyon|Tel Aviv|Marseille|Madrid|Barcelona/,
      })
      .first()
    if (await communityCard.isVisible()) {
      await communityCard.click()
      await page.waitForTimeout(1000)
      await expectNoErrorBoundary(page)
      // Should navigate to /community/ detail
      expect(page.url()).toMatch(/\/community\//)
    }
  })
})
