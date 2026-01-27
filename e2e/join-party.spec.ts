import { test, expect } from '@playwright/test'

test.describe('Join Party Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to reset session
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
  })

  test('shows validation error without display name', async ({ page }) => {
    await page.goto('/')

    // Navigate to join party
    await page.getByRole('button', { name: 'Join with Code' }).click()

    // Enter only party code (no display name)
    await page.getByPlaceholder('ABC123').fill('XYZ789')

    // The Join button is disabled when display name is empty
    await expect(page.getByRole('button', { name: 'Join Party' })).toBeDisabled()
  })

  test('shows validation error without complete party code', async ({ page }) => {
    await page.goto('/')

    // Navigate to join party
    await page.getByRole('button', { name: 'Join with Code' }).click()

    // Enter display name but incomplete party code
    await page.getByPlaceholder(/enter your display name/i).fill('Test User')
    await page.getByPlaceholder('ABC123').fill('ABC')

    // The Join button is disabled when code is not 6 characters
    await expect(page.getByRole('button', { name: 'Join Party' })).toBeDisabled()
  })

  test('converts party code to uppercase', async ({ page }) => {
    await page.goto('/')

    // Navigate to join party
    await page.getByRole('button', { name: 'Join with Code' }).click()

    // Enter lowercase party code
    const codeInput = page.getByPlaceholder('ABC123')
    await codeInput.fill('abc123')

    // Should convert to uppercase
    await expect(codeInput).toHaveValue('ABC123')
  })

  test('limits party code to 6 characters', async ({ page }) => {
    await page.goto('/')

    // Navigate to join party
    await page.getByRole('button', { name: 'Join with Code' }).click()

    // Enter more than 6 characters
    const codeInput = page.getByPlaceholder('ABC123')
    await codeInput.fill('ABC123456789')

    // Should be limited to 6 characters
    await expect(codeInput).toHaveValue('ABC123')
  })

  test('can go back to home from join party screen', async ({ page }) => {
    await page.goto('/')

    // Navigate to join party
    await page.getByRole('button', { name: 'Join with Code' }).click()

    // Should be on join party screen
    await expect(page.getByRole('heading', { name: /join a party/i })).toBeVisible()

    // Click back button
    await page.locator('button').first().click()

    // Should be back on home screen - look for the Start a Party button
    await expect(page.getByRole('button', { name: 'Start a Party' })).toBeVisible()
  })
})
