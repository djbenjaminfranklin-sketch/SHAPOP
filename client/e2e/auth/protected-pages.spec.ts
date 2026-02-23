import { test, expect } from '@playwright/test'
import { goTo, expectAuthenticated, collectConsoleErrors } from './helpers'

test.describe('Protected pages load when authenticated', () => {
  const protectedPages = [
    { path: '/', name: 'Home' },
    { path: '/profile', name: 'Profile' },
    { path: '/dashboard', name: 'Dashboard' },
    { path: '/activity', name: 'Activity' },
    { path: '/notifications', name: 'Notifications' },
    { path: '/payments', name: 'Payments' },
    { path: '/addresses', name: 'Addresses' },
    { path: '/preferences', name: 'Preferences' },
    { path: '/referrals', name: 'Referrals' },
    { path: '/go-live', name: 'Go Live' },
    { path: '/direct-sales', name: 'Direct Sales' },
    { path: '/verification', name: 'Verification' },
    { path: '/account-controls', name: 'Account Controls' },
    { path: '/security', name: 'Security' },
    { path: '/change-password', name: 'Change Password' },
    { path: '/change-email', name: 'Change Email' },
    { path: '/team', name: 'Team' },
    { path: '/messages', name: 'Messages' },
    { path: '/account-status', name: 'Account Status' },
    { path: '/communities', name: 'Communities' },
  ]

  for (const pg of protectedPages) {
    test(`${pg.name} (${pg.path}) loads without crash`, async ({ page }) => {
      await goTo(page, pg.path)
      // Page should have visible content
      await expect(page.locator('div').first()).toBeVisible()
      // Page should have rendered actual content (not white screen)
      const bodyText = await page.locator('body').innerText()
      expect(bodyText.length).toBeGreaterThan(0)
    })
  }
})

test.describe('Protected pages have no critical console errors', () => {
  const pages = [
    { path: '/', name: 'Home' },
    { path: '/profile', name: 'Profile' },
    { path: '/activity', name: 'Activity' },
    { path: '/preferences', name: 'Preferences' },
  ]

  for (const pg of pages) {
    test(`${pg.name} has no critical console errors`, async ({ page }) => {
      const errors = collectConsoleErrors(page)
      await goTo(page, pg.path)
      await page.waitForTimeout(2000)
      expect(errors).toEqual([])
    })
  }
})
