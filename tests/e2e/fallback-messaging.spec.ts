import { test, expect } from '@playwright/test'

test.describe('Library Mode Fallback Messaging', () => {
  test('shows library view on desktop (assumed)', async ({ page }) => {
    // On desktop browsers (no coarse pointer), library mode should be available
    await page.goto('library')

    // Should not show "Library not available" banner on desktop
    const banner = page.getByText(/library mode is not available/i)
    await expect(banner).not.toBeVisible()
  })

  test('library page has Add Folder button on desktop', async ({ page }) => {
    await page.goto('library')
    await expect(page.getByRole('button', { name: /add folder/i })).toBeVisible()
  })

  test('navigating to library redirects to quick-read when capability missing (simulated)', async ({
    page,
  }) => {
    // Override the capability detection for mobile simulation by injecting CSS
    await page.emulateMedia({ media: 'screen' })
    // Override the window API to simulate unsupported
    await page.addInitScript(() => {
      Object.defineProperty(window, 'showDirectoryPicker', {
        get: () => undefined,
        configurable: true,
      })
    })

    await page.goto('library')
    // Wait for the client-side redirect (React Router Navigate) to settle
    await page.waitForLoadState('networkidle')
    // Should either show fallback banner or redirect
    const url = page.url()
    const hasBanner = await page.getByText(/not available/i).isVisible().catch(() => false)
    expect(url.includes('quick-read') || hasBanner).toBe(true)
  })
})
