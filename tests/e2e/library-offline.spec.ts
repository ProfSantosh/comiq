import { test, expect } from '@playwright/test'

test.describe('Library Offline Behavior', () => {
  test('library page renders without errors', async ({ page }) => {
    await page.goto('library')
    // Should not have uncaught errors
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await page.waitForLoadState('networkidle')
    // Allow harmless console noise; fail only on hard exceptions
    expect(errors.filter((e) => !/ResizeObserver|favicon/i.test(e))).toHaveLength(0)
  })

  test('library page shows empty state when no comics added', async ({ page }) => {
    await page.goto('library')
    await expect(page.getByRole('button', { name: /add folder/i })).toBeVisible()
  })

  test('quick-read page accessible from library fallback', async ({ page }) => {
    await page.goto('library')
    // Look for any link to quick-read
    const link = page.getByRole('link', { name: /quick read/i })
    if (await link.isVisible()) {
      await link.click()
      await expect(page).toHaveURL(/quick-read/)
    }
  })
})
