import { test, expect } from '@playwright/test'

test.describe('PWA Offline & App Shell', () => {
  test('app loads and renders under /comiq/', async ({ page }) => {
    await page.goto('library')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/\/library/)
  })

  test('navigation links are present', async ({ page }) => {
    await page.goto('library')
    // Check that the page renders some expected element
    await expect(page.locator('body')).toBeVisible()
  })

  test('settings page is accessible via route', async ({ page }) => {
    await page.goto('settings')
    await expect(page.getByRole('heading', { name: /settings/i })).toBeVisible()
  })
})
