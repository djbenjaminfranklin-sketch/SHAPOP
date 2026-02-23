import { test, expect } from '@playwright/test'
import { goTo, expectNoErrorBoundary } from './helpers'

test.describe('Activity page', () => {
  test('loads without crash', async ({ page }) => {
    await goTo(page, '/activity')
    await expect(page.locator('div').first()).toBeVisible({ timeout: 10000 })
  })

  test('tab buttons are visible', async ({ page }) => {
    await goTo(page, '/activity')
    await page.waitForLoadState('networkidle')
    // Should have multiple tab-like buttons
    const buttons = page.locator('button')
    const count = await buttons.count()
    expect(count).toBeGreaterThan(0)
  })

  test('purchases tab is visible', async ({ page }) => {
    await goTo(page, '/activity')
    const purchasesTab = page.getByText(/Achats|Purchases|רכישות|Compras/)
    await expect(purchasesTab).toBeVisible({ timeout: 10000 })
  })

  test('sales tab is visible', async ({ page }) => {
    await goTo(page, '/activity')
    const salesTab = page.getByText(/Ventes|Sales|מכירות|Ventas/)
    await expect(salesTab).toBeVisible({ timeout: 10000 })
  })

  test('can switch to favorites tab', async ({ page }) => {
    await goTo(page, '/activity')
    const favTab = page.getByText(/Favoris|Favorites|מועדפים|Favoritos/)
    await expect(favTab).toBeVisible({ timeout: 10000 })
    await favTab.click()
    await expectNoErrorBoundary(page)
  })

  test('each tab renders without crash', async ({ page }) => {
    await goTo(page, '/activity')
    const tabLabels = [
      /Achats|Purchases|רכישות|Compras/,
      /Ventes|Sales|מכירות|Ventas/,
      /Suivis|Following|עוקב|Siguiendo/,
      /Favoris|Favorites|מועדפים|Favoritos/,
      /Offres|Offers|הצעות|Ofertas/,
    ]
    for (const label of tabLabels) {
      const tab = page.getByText(label).first()
      if (await tab.isVisible()) {
        await tab.click()
        await page.waitForTimeout(500)
        await expectNoErrorBoundary(page)
      }
    }
  })
})
