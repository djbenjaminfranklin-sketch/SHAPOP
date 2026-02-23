import { test, expect } from '@playwright/test'
import { goTo, expectAuthenticated, expectNoErrorBoundary } from './helpers'

test.describe('Authenticated navigation', () => {
  test('bottom nav is visible on home', async ({ page }) => {
    await goTo(page, '/')
    // The bottom nav is a <nav> element
    const nav = page.locator('nav').first()
    await expect(nav).toBeVisible({ timeout: 10000 })
  })

  test('Explore tab is clickable and navigates', async ({ page }) => {
    await goTo(page, '/')
    const exploreLink = page.locator('a[href="/explore"]').first()
    await expect(exploreLink).toBeVisible({ timeout: 10000 })
    await exploreLink.click()
    await expect(page).toHaveURL(/\/explore/)
    await expectNoErrorBoundary(page)
  })

  test('Map tab is clickable and navigates', async ({ page }) => {
    await goTo(page, '/')
    const mapLink = page.locator('a[href="/map"]').first()
    await expect(mapLink).toBeVisible({ timeout: 10000 })
    await mapLink.click()
    await expect(page).toHaveURL(/\/map/)
    await expectNoErrorBoundary(page)
  })

  test('Sell button is visible in bottom nav', async ({ page }) => {
    await goTo(page, '/')
    // The sell button is a button (not a link) inside the nav
    const sellBtn = page.locator('nav button').first()
    await expect(sellBtn).toBeVisible({ timeout: 10000 })
  })

  test('Activity tab is clickable and navigates', async ({ page }) => {
    await goTo(page, '/')
    const activityLink = page.locator('a[href="/activity"]').first()
    await expect(activityLink).toBeVisible({ timeout: 10000 })
    await activityLink.click()
    await expect(page).toHaveURL(/\/activity/)
    await expectNoErrorBoundary(page)
  })

  test('Profile tab opens menu sheet', async ({ page }) => {
    await goTo(page, '/')
    // Profile tab is the last button in the nav (avatar button)
    const profileBtn = page.locator('nav button').last()
    await expect(profileBtn).toBeVisible({ timeout: 10000 })
    await profileBtn.click()
    // Should show profile menu sheet with "Mon compte" / "My account" etc.
    await expect(
      page.getByText(/Mon compte|My account|החשבון שלי|Mi cuenta/)
    ).toBeVisible({ timeout: 5000 })
  })

  test('Profile menu navigates to profile page', async ({ page }) => {
    await goTo(page, '/')
    // Open profile menu
    const profileBtn = page.locator('nav button').last()
    await profileBtn.click()
    // Click "Mon compte" / "My account"
    await page.getByText(/Mon compte|My account|החשבון שלי|Mi cuenta/).click()
    await expect(page).toHaveURL(/\/profile/)
    await expectNoErrorBoundary(page)
  })

  test('Profile menu navigates to messages', async ({ page }) => {
    await goTo(page, '/')
    const profileBtn = page.locator('nav button').last()
    await profileBtn.click()
    await page.getByText(/^Messages$|^הודעות$|^Mensajes$/).click()
    await expect(page).toHaveURL(/\/messages/)
    await expectNoErrorBoundary(page)
  })
})
