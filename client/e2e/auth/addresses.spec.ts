import { test, expect } from '@playwright/test'
import { goTo, expectNoErrorBoundary } from './helpers'

test.describe('Addresses page', () => {
  test('loads and shows title', async ({ page }) => {
    await goTo(page, '/addresses')
    // Title should be visible in the header
    await expect(
      page.getByText(/^Adresses$|^Addresses$|^כתובות$|^Direcciones$/)
    ).toBeVisible({ timeout: 10000 })
  })

  test('add address button or form is visible', async ({ page }) => {
    await goTo(page, '/addresses')
    // Either the "Add address" button is shown (if no addresses) or addresses are listed
    const addBtn = page.getByText(/Ajouter une adresse|Add address|הוסף כתובת|Agregar direccion/)
    await expect(addBtn).toBeVisible({ timeout: 10000 })
  })

  test('form has all required fields', async ({ page }) => {
    await goTo(page, '/addresses')
    // Open the form if needed
    const addBtn = page.getByText(/Ajouter une adresse|Add address|הוסף כתובת|Agregar direccion/)
    if (await addBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await addBtn.click()
    }
    // Count input fields -- should have at least 5 (name, street, city, zip, phone)
    const inputs = page
      .locator('input')
      .filter({ hasNot: page.locator('[type="hidden"], [type="file"]') })
    const count = await inputs.count()
    expect(count).toBeGreaterThanOrEqual(5)
  })

  test('save button is visible in form', async ({ page }) => {
    await goTo(page, '/addresses')
    const addBtn = page.getByText(/Ajouter une adresse|Add address|הוסף כתובת|Agregar direccion/)
    if (await addBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await addBtn.click()
    }
    const saveBtn = page.getByText(/Enregistrer|Save address|שמור כתובת|Guardar direccion/)
    await expect(saveBtn).toBeVisible({ timeout: 5000 })
  })

  test('cancel button is visible in form', async ({ page }) => {
    await goTo(page, '/addresses')
    const addBtn = page.getByText(/Ajouter une adresse|Add address|הוסף כתובת|Agregar direccion/)
    if (await addBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await addBtn.click()
    }
    const cancelBtn = page.getByText(/^Annuler$|^Cancel$|^ביטול$|^Cancelar$/)
    await expect(cancelBtn).toBeVisible({ timeout: 5000 })
  })
})
