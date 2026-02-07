import { test, expect } from '@playwright/test'

test.describe('Party Room', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage and create a party first
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()

    // Navigate to create party
    await page.getByRole('link', { name: 'Start a Party' }).click()

    // Enter display name and create party
    await page.getByPlaceholder(/enter your display name/i).fill('Test Host')
    await page.getByRole('button', { name: 'Create Party' }).click()

    // Wait for party room to load - look for party code
    await expect(page.locator('text=/[A-Z0-9]{6}/')).toBeVisible({ timeout: 10000 })
  })

  test('displays party code in the header', async ({ page }) => {
    // Should show a party code (6 uppercase alphanumeric characters)
    await expect(page.locator('text=/[A-Z0-9]{6}/')).toBeVisible()
  })

  test('party room has interactive elements', async ({ page }) => {
    // The party room should have multiple buttons for interaction
    const buttons = page.locator('button')
    const buttonCount = await buttons.count()

    // Verify there are interactive elements in the party room
    expect(buttonCount).toBeGreaterThan(0)
  })
})
