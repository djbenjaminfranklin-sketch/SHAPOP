import { test, expect } from '@playwright/test'
import { goTo, expectNoErrorBoundary } from './helpers'

test.describe('Account status page', () => {
  test('loads and shows email', async ({ page }) => {
    await goTo(page, '/account-status')
    // Should display email or account status info
    await expect(page.locator('div').first()).toBeVisible({ timeout: 10000 })
    const text = await page.locator('body').textContent()
    // Should contain either "Actif"/"Active" or the email (@)
    expect(
      text?.match(/Actif|Active|פעיל|Activo|@/) !== null
    ).toBeTruthy()
  })

  test('shows account active status', async ({ page }) => {
    await goTo(page, '/account-status')
    const statusText = page.getByText(/Actif|Active|פעיל|Activo/)
    await expect(statusText).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Security page', () => {
  test('loads without crash', async ({ page }) => {
    await goTo(page, '/security')
    await expect(page.locator('div').first()).toBeVisible({ timeout: 10000 })
  })

  test('shows security content', async ({ page }) => {
    await goTo(page, '/security')
    const text = await page.locator('body').textContent()
    // Security page shows sessions, email, or security-related content
    expect(
      text?.match(/session|Security|Securite|אבטחה|Seguridad|@|Active|Actif/i) !== null
    ).toBeTruthy()
  })
})

test.describe('Referrals page', () => {
  test('loads and shows referral content', async ({ page }) => {
    await goTo(page, '/referrals')
    await expect(page.locator('div').first()).toBeVisible({ timeout: 10000 })
    // Should contain some referral-related content
    const text = await page.locator('body').textContent()
    expect(
      text?.match(/parrainage|referral|הפניה|referido|code/i) !== null
    ).toBeTruthy()
  })
})

test.describe('Notifications page', () => {
  test('loads without crash', async ({ page }) => {
    await goTo(page, '/notifications')
    await expect(page.locator('div').first()).toBeVisible({ timeout: 10000 })
  })

  test('has notification-related content', async ({ page }) => {
    await goTo(page, '/notifications')
    const text = await page.locator('body').textContent()
    expect(
      text?.match(/notification|התראות|notificacion/i) !== null
    ).toBeTruthy()
  })
})

test.describe('Messages page', () => {
  test('loads without crash', async ({ page }) => {
    await goTo(page, '/messages')
    await expect(page.locator('div').first()).toBeVisible({ timeout: 10000 })
  })

  test('shows empty state or message list', async ({ page }) => {
    await goTo(page, '/messages')
    // Page should render content (empty state or list)
    const text = await page.locator('body').textContent()
    expect(text?.length).toBeGreaterThan(10)
  })
})
