import { test, expect } from '@playwright/test'
import { goTo, expectNoErrorBoundary } from './helpers'

test.describe('Profile page', () => {
  test('loads and shows display name', async ({ page }) => {
    await goTo(page, '/profile')
    // Should show the display name or username in an h1
    const heading = page.locator('h1').first()
    await expect(heading).toBeVisible({ timeout: 10000 })
    const text = await heading.textContent()
    expect(text?.length).toBeGreaterThan(0)
  })

  test('edit profile button is visible', async ({ page }) => {
    await goTo(page, '/profile')
    const editBtn = page.getByText(/Modifier le profil|Edit profile|ערוך פרופיל|Editar perfil/)
    await expect(editBtn).toBeVisible({ timeout: 10000 })
  })

  test('can enter edit mode and see name input', async ({ page }) => {
    await goTo(page, '/profile')
    const editBtn = page.getByText(/Modifier le profil|Edit profile|ערוך פרופיל|Editar perfil/)
    await expect(editBtn).toBeVisible({ timeout: 10000 })
    await editBtn.click()
    // Name input should be visible with a value
    const nameInput = page.locator('input[type="text"]').first()
    await expect(nameInput).toBeVisible({ timeout: 5000 })
    const value = await nameInput.inputValue()
    expect(value.length).toBeGreaterThan(0)
  })

  test('can see bio textarea in edit mode', async ({ page }) => {
    await goTo(page, '/profile')
    await page.getByText(/Modifier le profil|Edit profile|ערוך פרופיל|Editar perfil/).click()
    const bioTextarea = page.locator('textarea').first()
    await expect(bioTextarea).toBeVisible({ timeout: 5000 })
  })

  test('cancel button exits edit mode', async ({ page }) => {
    await goTo(page, '/profile')
    await page.getByText(/Modifier le profil|Edit profile|ערוך פרופיל|Editar perfil/).click()
    await expect(page.locator('textarea').first()).toBeVisible({ timeout: 5000 })
    // Click cancel
    await page.getByText(/Annuler|Cancel|ביטול|Cancelar/).click()
    // Edit button should reappear
    await expect(
      page.getByText(/Modifier le profil|Edit profile|ערוך פרופיל|Editar perfil/)
    ).toBeVisible({ timeout: 5000 })
  })

  test('sign out button is visible', async ({ page }) => {
    await goTo(page, '/profile')
    // Scroll down to find sign out button
    const signOutBtn = page.getByText(/Se deconnecter|Sign out|התנתקות|Cerrar sesion/)
    await signOutBtn.scrollIntoViewIfNeeded()
    await expect(signOutBtn).toBeVisible({ timeout: 10000 })
  })
})
