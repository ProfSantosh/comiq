import { test, expect } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

test.describe('Quick Read Flow', () => {
  test('landing page shows Quick Read option', async ({ page }) => {
    await page.goto('quick-read')
    await expect(page.getByRole('heading', { name: /quick read/i })).toBeVisible()
  })

  test('shows dropzone for file upload', async ({ page }) => {
    await page.goto('quick-read')
    await expect(page.getByText(/drop a file here/i)).toBeVisible()
  })

  test('shows error message for unsupported file type', async ({ page }) => {
    await page.goto('quick-read')

    // Simulate a file drop with unsupported extension
    await page.evaluate(() => {
      const dataTransfer = new DataTransfer()
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      Object.defineProperty(dataTransfer, 'files', { value: [file] })

      const dropzone = document.querySelector('label')!
      const dropEvent = new DragEvent('drop', { dataTransfer, bubbles: true })
      dropzone.dispatchEvent(dropEvent)
    })

    await expect(page.getByText(/not a supported format|unsupported/i)).toBeVisible({ timeout: 5000 })
  })

  test('has link to navigate back to Library', async ({ page }) => {
    await page.goto('quick-read')
    await expect(page.getByRole('link', { name: /go to library/i }).or(page.getByText(/go to library/i))).toBeVisible()
  })
})
