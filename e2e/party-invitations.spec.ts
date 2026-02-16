import { test, expect } from '@playwright/test'

const FAKE_AUTH_COOKIE = { name: 'sb-mock-auth-token', value: 'test-session', domain: 'localhost', path: '/' }

test.describe('Party Invitations (Phase 4)', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().addCookies([FAKE_AUTH_COOKIE])
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.clear()
      localStorage.setItem('link-party-display-name', 'Test User')
    })
    await page.reload()
  })

  test.describe('Create Page — Invite Friends Section', () => {
    test('shows invite friends toggle on create page', async ({ page }) => {
      await page.getByRole('link', { name: 'Start a Party' }).first().click()

      // The "Invite friends" collapsible section should be visible
      await expect(page.getByText(/invite friends/i)).toBeVisible()
    })

    test('expanding invite friends shows FriendsPicker and visibility toggle', async ({ page }) => {
      await page.getByRole('link', { name: 'Start a Party' }).first().click()

      // Click the invite friends toggle to expand
      await page.getByText(/invite friends/i).click()

      // FriendsPicker should render (in mock mode, it will show empty or error state)
      // The visible_to_friends toggle should appear
      await expect(page.getByText(/visible to friends/i)).toBeVisible()
      await expect(page.getByText(/friends can see this party/i)).toBeVisible()
    })

    test('visible to friends toggle can be switched on and off', async ({ page }) => {
      await page.getByRole('link', { name: 'Start a Party' }).first().click()

      // Expand friends section
      await page.getByText(/invite friends/i).click()

      // Find the toggle switch
      const toggle = page.getByRole('switch', { name: '' }).nth(1) // Second toggle (first is password)
      await expect(toggle).toBeVisible()

      // Toggle should default to off
      await expect(toggle).toHaveAttribute('aria-checked', 'false')

      // Click to enable
      await toggle.click()
      await expect(toggle).toHaveAttribute('aria-checked', 'true')

      // Click again to disable
      await toggle.click()
      await expect(toggle).toHaveAttribute('aria-checked', 'false')
    })

    test('create party button still works with friends section expanded', async ({ page }) => {
      await page.getByRole('link', { name: 'Start a Party' }).first().click()

      // Expand friends section
      await page.getByText(/invite friends/i).click()

      // Create party should still work
      await page.getByRole('button', { name: 'Create Party' }).click()
      await expect(page.getByTestId('party-code')).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('Party Room — Invite Modal Tabs', () => {
    test.beforeEach(async ({ page }) => {
      // Create a party first
      await page.getByRole('link', { name: 'Start a Party' }).first().click()
      await page.getByRole('button', { name: 'Create Party' }).click()
      await expect(page.getByTestId('party-code')).toBeVisible({ timeout: 10000 })
    })

    test('invite modal has Email and Friends tabs', async ({ page }) => {
      // Click the invite button in party header
      await page.getByRole('button', { name: /invite by email/i }).click()

      // The invite modal should be visible
      await expect(page.getByRole('dialog', { name: /invite a friend/i })).toBeVisible()

      // Should have both tabs
      await expect(page.getByRole('dialog').getByText('Email')).toBeVisible()
      await expect(page.getByRole('dialog').getByText('Friends')).toBeVisible()
    })

    test('email tab is active by default', async ({ page }) => {
      await page.getByRole('button', { name: /invite by email/i }).click()
      await expect(page.getByRole('dialog', { name: /invite a friend/i })).toBeVisible()

      // Email form should be visible
      await expect(page.getByPlaceholder('friend@example.com')).toBeVisible()
    })

    test('can switch to Friends tab', async ({ page }) => {
      await page.getByRole('button', { name: /invite by email/i }).click()
      await expect(page.getByRole('dialog', { name: /invite a friend/i })).toBeVisible()

      // Switch to Friends tab
      await page.getByRole('dialog').getByText('Friends').click()

      // Email form should no longer be visible
      await expect(page.getByPlaceholder('friend@example.com')).toBeHidden()

      // Friends tab content should be visible (FriendsPicker or empty state)
      // The Send Invites button should exist but be disabled (no friends selected)
      await expect(page.getByRole('button', { name: /send invites/i })).toBeVisible()
      await expect(page.getByRole('button', { name: /send invites/i })).toBeDisabled()
    })

    test('FriendsPicker shows empty or loading state when no friends', async ({ page }) => {
      await page.getByRole('button', { name: /invite by email/i }).click()
      await expect(page.getByRole('dialog', { name: /invite a friend/i })).toBeVisible()

      // Switch to Friends tab
      await page.getByRole('dialog').getByText('Friends').click()

      // In mock mode, listFriends() may show: loading spinner, empty state, or error
      // Wait up to 5 seconds for one of these states
      const dialog = page.getByRole('dialog', { name: /invite a friend/i })
      await expect(
        dialog.getByText(/no friends yet|failed to load|search friends/i).or(dialog.locator('.card')),
      ).toBeVisible({ timeout: 5000 })
    })

    test('can switch back to Email tab', async ({ page }) => {
      await page.getByRole('button', { name: /invite by email/i }).click()
      await expect(page.getByRole('dialog', { name: /invite a friend/i })).toBeVisible()

      // Switch to Friends
      await page.getByRole('dialog').getByText('Friends').click()
      await expect(page.getByPlaceholder('friend@example.com')).toBeHidden()

      // Switch back to Email
      await page.getByRole('dialog').getByText('Email').click()
      await expect(page.getByPlaceholder('friend@example.com')).toBeVisible()
    })

    test('closing modal resets to Email tab', async ({ page }) => {
      await page.getByRole('button', { name: /invite by email/i }).click()
      await expect(page.getByRole('dialog', { name: /invite a friend/i })).toBeVisible()

      // Switch to Friends tab
      await page.getByRole('dialog').getByText('Friends').click()

      // Close modal
      await page.keyboard.press('Escape')
      await expect(page.getByRole('dialog', { name: /invite a friend/i })).toBeHidden()

      // Reopen modal
      await page.getByRole('button', { name: /invite by email/i }).click()
      await expect(page.getByRole('dialog', { name: /invite a friend/i })).toBeVisible()

      // Should be back on Email tab
      await expect(page.getByPlaceholder('friend@example.com')).toBeVisible()
    })
  })
})
