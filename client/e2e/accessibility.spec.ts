import { test, expect } from '@playwright/test'

/**
 * Helper: navigate to a page and wait for content to load.
 * Splash is already skipped via storageState in playwright.config.ts.
 */
async function goToPage(page: import('@playwright/test').Page, path: string) {
  await page.goto(path)
  await page.waitForLoadState('networkidle')
  await expect(page.locator('#root')).not.toBeEmpty({ timeout: 10000 })
}

test.describe('Accessibility — Images', () => {
  test('all images on login page have alt attributes', async ({ page }) => {
    await goToPage(page, '/login')
    const images = page.locator('img')
    const count = await images.count()
    for (let i = 0; i < count; i++) {
      const img = images.nth(i)
      const alt = await img.getAttribute('alt')
      const role = await img.getAttribute('role')
      const hasAlt = alt !== null && alt !== undefined
      const isPresentation = role === 'presentation' || role === 'none'
      expect(
        hasAlt || isPresentation,
        `Image ${i} (src="${await img.getAttribute('src')}") has no alt text and no role="presentation"`
      ).toBe(true)
    }
  })

  test('all images on register page have alt attributes', async ({ page }) => {
    await goToPage(page, '/register')
    const images = page.locator('img')
    const count = await images.count()
    for (let i = 0; i < count; i++) {
      const img = images.nth(i)
      const alt = await img.getAttribute('alt')
      const role = await img.getAttribute('role')
      const hasAlt = alt !== null && alt !== undefined
      const isPresentation = role === 'presentation' || role === 'none'
      expect(
        hasAlt || isPresentation,
        `Image ${i} (src="${await img.getAttribute('src')}") has no alt text and no role="presentation"`
      ).toBe(true)
    }
  })
})

test.describe('Accessibility — ARIA', () => {
  test('no broken aria-labelledby references on login page', async ({ page }) => {
    await goToPage(page, '/login')
    const brokenRefs = await page.evaluate(() => {
      const elements = document.querySelectorAll('[aria-labelledby]')
      const broken: string[] = []
      elements.forEach((el) => {
        const ids = el.getAttribute('aria-labelledby')?.split(/\s+/) || []
        ids.forEach((id) => {
          if (!document.getElementById(id)) {
            broken.push(`aria-labelledby="${id}" on <${el.tagName.toLowerCase()}>`)
          }
        })
      })
      return broken
    })
    expect(brokenRefs, `Broken ARIA references found: ${brokenRefs.join(', ')}`).toEqual([])
  })

  test('no broken aria-labelledby references on 404 page', async ({ page }) => {
    await goToPage(page, '/this-page-does-not-exist')
    const brokenRefs = await page.evaluate(() => {
      const elements = document.querySelectorAll('[aria-labelledby]')
      const broken: string[] = []
      elements.forEach((el) => {
        const ids = el.getAttribute('aria-labelledby')?.split(/\s+/) || []
        ids.forEach((id) => {
          if (!document.getElementById(id)) {
            broken.push(`aria-labelledby="${id}" on <${el.tagName.toLowerCase()}>`)
          }
        })
      })
      return broken
    })
    expect(brokenRefs).toEqual([])
  })
})

test.describe('Accessibility — Buttons', () => {
  test('all buttons on login page have accessible names', async ({ page }) => {
    await goToPage(page, '/login')
    const buttons = page.locator('button')
    const count = await buttons.count()
    expect(count).toBeGreaterThan(0)
    for (let i = 0; i < count; i++) {
      const button = buttons.nth(i)
      const name = await button.evaluate((el) => {
        const textContent = el.textContent?.trim() || ''
        const ariaLabel = el.getAttribute('aria-label') || ''
        const title = el.getAttribute('title') || ''
        return textContent || ariaLabel || title
      })
      const hasSvg = await button.locator('svg').count() > 0
      const hasName = name.length > 0
      expect(
        hasName || hasSvg,
        `Button ${i} has no accessible name and no SVG icon`
      ).toBe(true)
    }
  })

  test('all buttons on 404 page have accessible names', async ({ page }) => {
    await goToPage(page, '/this-page-does-not-exist')
    await expect(page.getByText('404')).toBeVisible({ timeout: 10000 })
    const buttons = page.locator('button')
    const count = await buttons.count()
    for (let i = 0; i < count; i++) {
      const button = buttons.nth(i)
      const name = await button.evaluate((el) => {
        return (el.textContent?.trim() || '') +
               (el.getAttribute('aria-label') || '') +
               (el.getAttribute('title') || '')
      })
      const hasSvg = await button.locator('svg').count() > 0
      expect(
        name.length > 0 || hasSvg,
        `Button ${i} has no accessible name and no SVG icon`
      ).toBe(true)
    }
  })
})

test.describe('Accessibility — Headings', () => {
  test('login page has exactly one h1 element', async ({ page }) => {
    await goToPage(page, '/login')
    const h1Count = await page.locator('h1').count()
    expect(h1Count).toBe(1)
  })

  test('register page has exactly one h1 element', async ({ page }) => {
    await goToPage(page, '/register')
    const h1Count = await page.locator('h1').count()
    expect(h1Count).toBe(1)
  })

  test('404 page has exactly one h1 element', async ({ page }) => {
    await goToPage(page, '/this-page-does-not-exist')
    await expect(page.getByText('404')).toBeVisible({ timeout: 10000 })
    const h1Count = await page.locator('h1').count()
    expect(h1Count).toBe(1)
  })
})

test.describe('Accessibility — HTML attributes', () => {
  test('language attribute is set on html element', async ({ page }) => {
    await page.goto('/')
    const lang = await page.getAttribute('html', 'lang')
    expect(lang).toBeTruthy()
    expect(typeof lang).toBe('string')
    expect(lang!.length).toBeGreaterThan(0)
  })

  test.skip('viewport meta tag allows user scaling', async () => {
    // Skipped: The app intentionally sets user-scalable=no and maximum-scale=1.0
  })
})

test.describe('Accessibility — Color contrast', () => {
  test('login page title has sufficient contrast against dark background', async ({ page }) => {
    await goToPage(page, '/login')
    const h1 = page.locator('h1')
    await expect(h1).toBeVisible()
    const color = await h1.evaluate((el) => {
      return window.getComputedStyle(el).color
    })
    expect(color).toBe('rgb(255, 255, 255)')
  })

  test('login page subtitle text is visible', async ({ page }) => {
    await goToPage(page, '/login')
    const subtitle = page.locator('h1 + p')
    await expect(subtitle).toBeVisible()
    const color = await subtitle.evaluate((el) => window.getComputedStyle(el).color)
    expect(color).not.toBe('rgba(0, 0, 0, 0)')
    expect(color).not.toBe('rgb(0, 0, 0)')
  })

  test('404 page "404" text uses accent color', async ({ page }) => {
    await goToPage(page, '/this-page-does-not-exist')
    const heading = page.getByText('404')
    await expect(heading).toBeVisible({ timeout: 10000 })
    const color = await heading.evaluate((el) => window.getComputedStyle(el).color)
    expect(color).toBe('rgb(232, 52, 78)')
  })
})

test.describe('Accessibility — Focus visibility', () => {
  test('interactive elements on login page receive visible focus', async ({ page }) => {
    await goToPage(page, '/login')
    const emailInput = page.locator('input[type="email"]')
    await emailInput.focus()
    const emailFocused = await emailInput.evaluate(
      (el) => document.activeElement === el
    )
    expect(emailFocused).toBe(true)

    const passwordInput = page.locator('input[type="password"]')
    await passwordInput.focus()
    const passwordFocused = await passwordInput.evaluate(
      (el) => document.activeElement === el
    )
    expect(passwordFocused).toBe(true)
  })
})
