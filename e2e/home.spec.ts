import { test, expect } from '@playwright/test'

test.describe('Home Screen', () => {
  test('displays the home screen with party options', async ({ page }) => {
    await page.goto('/')

    // Check for Start a Party button
    await expect(page.getByRole('link', { name: 'Start a Party' }).first()).toBeVisible()

    // Check for Join with Code link
    await expect(page.getByRole('link', { name: 'Join with Code' })).toBeVisible()
  })

  test('navigates to create party screen', async ({ page }) => {
    await page.goto('/')

    // Click Start a Party link
    await page.getByRole('link', { name: 'Start a Party' }).first().click()

    // Should show the create party form
    await expect(page.getByRole('heading', { name: /start a party/i })).toBeVisible()
    await expect(page.getByPlaceholder(/enter your display name/i)).toBeVisible()
  })

  test('navigates to join party screen', async ({ page }) => {
    await page.goto('/')

    // Click Join with Code link
    await page.getByRole('link', { name: 'Join with Code' }).click()

    // Should show the join party form
    await expect(page.getByRole('heading', { name: /join a party/i })).toBeVisible()
  })
})
