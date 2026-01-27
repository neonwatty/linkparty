import { test, expect } from '@playwright/test'

test.describe('TV Mode', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage and create a party first
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()

    // Navigate to create party
    await page.getByRole('button', { name: 'Start a Party' }).click()

    // Enter display name and create party
    await page.getByPlaceholder(/enter your display name/i).fill('Test Host')
    await page.getByRole('button', { name: 'Create Party' }).click()

    // Wait for party room to load - look for party code
    await expect(page.locator('text=/[A-Z0-9]{6}/')).toBeVisible({ timeout: 10000 })
  })

  test('party room loads after creation', async ({ page }) => {
    // Verify we're in the party room by checking for the party code
    await expect(page.locator('text=/[A-Z0-9]{6}/')).toBeVisible()

    // Should have some interactive elements
    await expect(page.locator('button').first()).toBeVisible()
  })
})
