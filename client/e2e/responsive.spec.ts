import { test, expect } from '@playwright/test'

async function checkNoHorizontalOverflow(page: import('@playwright/test').Page) {
  const hasOverflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth
  })
  return hasOverflow
}

test.describe('Responsive — iPhone SE (375x667)', () => {
  test.use({ viewport: { width: 375, height: 667 } })

  test('login page renders without horizontal overflow', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    const hasOverflow = await checkNoHorizontalOverflow(page)
    expect(hasOverflow).toBe(false)
  })

  test('register page renders without horizontal overflow', async ({ page }) => {
    await page.goto('/register')
    await page.waitForLoadState('networkidle')
    const hasOverflow = await checkNoHorizontalOverflow(page)
    expect(hasOverflow).toBe(false)
  })

  test('404 page renders without horizontal overflow', async ({ page }) => {
    await page.goto('/this-page-does-not-exist')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('404')).toBeVisible({ timeout: 10000 })
    const hasOverflow = await checkNoHorizontalOverflow(page)
    expect(hasOverflow).toBe(false)
  })
})

test.describe('Responsive — iPhone 14 Pro (390x844)', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('login page renders without horizontal overflow', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    const hasOverflow = await checkNoHorizontalOverflow(page)
    expect(hasOverflow).toBe(false)
  })

  test('register page renders without horizontal overflow', async ({ page }) => {
    await page.goto('/register')
    await page.waitForLoadState('networkidle')
    const hasOverflow = await checkNoHorizontalOverflow(page)
    expect(hasOverflow).toBe(false)
  })

  test('404 page renders without horizontal overflow', async ({ page }) => {
    await page.goto('/this-page-does-not-exist')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('404')).toBeVisible({ timeout: 10000 })
    const hasOverflow = await checkNoHorizontalOverflow(page)
    expect(hasOverflow).toBe(false)
  })
})

test.describe('Responsive — iPad (768x1024)', () => {
  test.use({ viewport: { width: 768, height: 1024 } })

  test('login page renders without horizontal overflow', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    const hasOverflow = await checkNoHorizontalOverflow(page)
    expect(hasOverflow).toBe(false)
  })

  test('register page renders without horizontal overflow', async ({ page }) => {
    await page.goto('/register')
    await page.waitForLoadState('networkidle')
    const hasOverflow = await checkNoHorizontalOverflow(page)
    expect(hasOverflow).toBe(false)
  })

  test('404 page renders without horizontal overflow', async ({ page }) => {
    await page.goto('/this-page-does-not-exist')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('404')).toBeVisible({ timeout: 10000 })
    const hasOverflow = await checkNoHorizontalOverflow(page)
    expect(hasOverflow).toBe(false)
  })
})

test.describe('Responsive — Touch targets', () => {
  test('login submit button meets minimum 44x44px touch target', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    const submitButton = page.getByRole('button', {
      name: /Se connecter|Sign in|התחבר|Iniciar sesión/,
    })
    await expect(submitButton).toBeVisible()
    const box = await submitButton.boundingBox()
    expect(box).not.toBeNull()
    expect(box!.width).toBeGreaterThanOrEqual(44)
    expect(box!.height).toBeGreaterThanOrEqual(44)
  })

  test('login social buttons meet minimum 44x44px touch target', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    const appleButton = page.getByRole('button', {
      name: /Continuer avec Apple|Continue with Apple|המשך עם Apple|Continuar con Apple/,
    })
    await expect(appleButton).toBeVisible()
    const appleBox = await appleButton.boundingBox()
    expect(appleBox).not.toBeNull()
    expect(appleBox!.width).toBeGreaterThanOrEqual(44)
    expect(appleBox!.height).toBeGreaterThanOrEqual(44)

    const googleButton = page.getByRole('button', {
      name: /Continuer avec Google|Continue with Google|המשך עם Google|Continuar con Google/,
    })
    await expect(googleButton).toBeVisible()
    const googleBox = await googleButton.boundingBox()
    expect(googleBox).not.toBeNull()
    expect(googleBox!.width).toBeGreaterThanOrEqual(44)
    expect(googleBox!.height).toBeGreaterThanOrEqual(44)
  })

  test('register submit button meets minimum 44x44px touch target', async ({ page }) => {
    await page.goto('/register')
    await page.waitForLoadState('networkidle')
    const signUpButton = page.locator('button[type="submit"]').first()
    await expect(signUpButton).toBeVisible()
    const box = await signUpButton.boundingBox()
    expect(box).not.toBeNull()
    expect(box!.width).toBeGreaterThanOrEqual(44)
    expect(box!.height).toBeGreaterThanOrEqual(44)
  })

  test('404 Go Home button meets minimum 44x44px touch target', async ({ page }) => {
    await page.goto('/this-page-does-not-exist')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('404')).toBeVisible({ timeout: 10000 })
    const goHomeButton = page.getByRole('button', {
      name: /Retour|Go Home|חזרה|Volver/,
    })
    await expect(goHomeButton).toBeVisible()
    const box = await goHomeButton.boundingBox()
    expect(box).not.toBeNull()
    expect(box!.width).toBeGreaterThanOrEqual(44)
    expect(box!.height).toBeGreaterThanOrEqual(44)
  })
})

test.describe('Responsive — Content layout at various widths', () => {
  test.use({ viewport: { width: 320, height: 568 } })

  test('login page at 320px wide does not overflow', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    const hasOverflow = await checkNoHorizontalOverflow(page)
    expect(hasOverflow).toBe(false)
  })

  test('form inputs at 320px are fully visible and usable', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    const emailInput = page.locator('input[type="email"]')
    await expect(emailInput).toBeVisible()
    const box = await emailInput.boundingBox()
    expect(box).not.toBeNull()
    expect(box!.x + box!.width).toBeLessThanOrEqual(320)
    expect(box!.width).toBeGreaterThanOrEqual(200)
  })
})
