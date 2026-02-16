import { test, expect } from '@playwright/test'

const FAKE_AUTH_COOKIE = { name: 'sb-mock-auth-token', value: 'test-session', domain: 'localhost', path: '/' }

test.describe('Notification Bell and Dropdown', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().addCookies([FAKE_AUTH_COOKIE])
    await page.goto('/')
  })

  test('NotificationBell renders in the home page header', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Notifications/ })).toBeVisible()
  })

  test('clicking bell opens dropdown', async ({ page }) => {
    await page.getByRole('button', { name: /Notifications/ }).click()
    await expect(page.getByRole('menu', { name: 'Notifications' })).toBeVisible()
  })

  test('dropdown shows "No notifications" empty state', async ({ page }) => {
    await page.getByRole('button', { name: /Notifications/ }).click()
    await expect(page.getByRole('menu', { name: 'Notifications' })).toBeVisible()
    await expect(page.getByText('No notifications')).toBeVisible()
  })

  test('clicking outside closes dropdown', async ({ page }) => {
    // Open the dropdown
    await page.getByRole('button', { name: /Notifications/ }).click()
    await expect(page.getByRole('menu', { name: 'Notifications' })).toBeVisible()

    // Click outside the notification area (on the page body/hero area)
    await page.locator('h1').click()

    // Dropdown should be closed
    await expect(page.getByRole('menu', { name: 'Notifications' })).not.toBeVisible()
  })
})
