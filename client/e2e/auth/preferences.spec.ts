import { test, expect } from '@playwright/test'
import { goTo, expectNoErrorBoundary } from './helpers'

test.describe('Preferences page', () => {
  test('loads without crash', async ({ page }) => {
    await goTo(page, '/preferences')
    await expect(page.locator('div').first()).toBeVisible({ timeout: 10000 })
  })

  test('language selector is visible', async ({ page }) => {
    await goTo(page, '/preferences')
    // Should have a language-related label
    const langElement = page.getByText(/Langue|Language|שפה|Idioma/)
    await expect(langElement).toBeVisible({ timeout: 10000 })
  })

  test('profile fields are displayed', async ({ page }) => {
    await goTo(page, '/preferences')
    // Should show profile section header
    const profileSection = page.getByText(/^Profil$|^Profile$|^פרופיל$|^Perfil$/).first()
    await expect(profileSection).toBeVisible({ timeout: 10000 })
    // Should have text inputs for display name and username
    const inputs = page.locator('input[type="text"]')
    const count = await inputs.count()
    expect(count).toBeGreaterThanOrEqual(2)
  })

  test('save button is visible', async ({ page }) => {
    await goTo(page, '/preferences')
    const saveBtn = page.getByText(/^Enregistrer$|^Save$|^שמירה$|^Guardar$/)
    await expect(saveBtn).toBeVisible({ timeout: 10000 })
  })
})
