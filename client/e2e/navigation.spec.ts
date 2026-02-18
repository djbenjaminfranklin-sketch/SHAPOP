import { test, expect } from '@playwright/test'

test.describe('Navigation', () => {
  test('page loads without crashing', async ({ page }) => {
    const response = await page.goto('/')
    expect(response).not.toBeNull()
    expect(response!.status()).toBeLessThan(400)
  })

  test('page has correct title', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/ShaPop/)
  })

  test('page has correct viewport meta tag', async ({ page }) => {
    await page.goto('/')
    const viewport = await page.getAttribute('meta[name="viewport"]', 'content')
    expect(viewport).toContain('width=device-width')
    expect(viewport).toContain('initial-scale=1.0')
  })

  test('login page is accessible', async ({ page }) => {
    await page.goto('/login')
    // Wait for the splash screen to complete and the lazy-loaded Login page to render.
    // The login page shows a title in one of the supported languages (fr/en/he).
    await expect(
      page.getByText(/Connexion|Sign In|התחברות/)
    ).toBeVisible({ timeout: 10000 })
  })

  test('register page is accessible', async ({ page }) => {
    await page.goto('/register')
    // The register page should load without errors — check that the root element is present
    await expect(page.locator('#root')).not.toBeEmpty()
  })

  test('404 page shows for unknown routes', async ({ page }) => {
    await page.goto('/this-page-does-not-exist-12345')
    // The NotFoundPage renders a "404" heading and a description in fr/en/he
    await expect(page.getByText('404')).toBeVisible({ timeout: 10000 })
    await expect(
      page.getByText(/Page introuvable|Page not found|הדף לא נמצא/)
    ).toBeVisible()
  })

  test('navigation to /login works via direct URL', async ({ page }) => {
    await page.goto('/login')
    expect(page.url()).toContain('/login')
  })

  test('navigation to /about works', async ({ page }) => {
    await page.goto('/about')
    await expect(page.locator('#root')).not.toBeEmpty()
  })

  test('navigation to /terms works', async ({ page }) => {
    await page.goto('/terms')
    await expect(page.locator('#root')).not.toBeEmpty()
  })

  test('navigation to /privacy works', async ({ page }) => {
    await page.goto('/privacy')
    await expect(page.locator('#root')).not.toBeEmpty()
  })

  test('navigation to /faq works', async ({ page }) => {
    await page.goto('/faq')
    await expect(page.locator('#root')).not.toBeEmpty()
  })

  test('back button works', async ({ page }) => {
    await page.goto('/')
    await page.goto('/login')
    await page.goBack()
    // After going back, we should be at the root path
    expect(page.url()).toMatch(/\/$/)
  })
})
