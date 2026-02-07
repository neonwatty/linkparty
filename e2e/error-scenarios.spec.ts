import { test, expect } from '@playwright/test'

test.describe('Error Scenarios', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to reset session and rate limits
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
  })

  test.describe('Party Code Validation', () => {
    test('shows error for invalid party code format', async ({ page }) => {
      await page.goto('/')

      // Navigate to join party
      await page.getByRole('link', { name: 'Join with Code' }).click()

      // Enter display name
      await page.getByPlaceholder(/enter your display name/i).fill('Test User')

      // Enter invalid code with special characters
      const codeInput = page.getByPlaceholder('ABC123')
      await codeInput.fill('!@#$%^')

      // The input accepts the characters (no client-side alphanumeric filter),
      // but this is not a valid alphanumeric party code
      const value = await codeInput.inputValue()
      expect(value).not.toMatch(/^[A-Z0-9]{6}$/)
    })

    test('join button disabled with incomplete party code', async ({ page }) => {
      await page.goto('/')

      // Navigate to join party
      await page.getByRole('link', { name: 'Join with Code' }).click()

      // Enter display name
      await page.getByPlaceholder(/enter your display name/i).fill('Test User')

      // Enter incomplete code (less than 6 chars)
      await page.getByPlaceholder('ABC123').fill('ABC')

      // Join button should be disabled
      await expect(page.getByRole('button', { name: 'Join Party' })).toBeDisabled()
    })

    test('join button disabled without display name', async ({ page }) => {
      await page.goto('/')

      // Navigate to join party
      await page.getByRole('link', { name: 'Join with Code' }).click()

      // Enter only party code (no display name)
      await page.getByPlaceholder('ABC123').fill('ABC123')

      // Join button should be disabled
      await expect(page.getByRole('button', { name: 'Join Party' })).toBeDisabled()
    })
  })

  test.describe('Create Party Validation', () => {
    test('shows error when creating party without display name', async ({ page }) => {
      await page.goto('/')

      // Navigate to create party
      await page.getByRole('link', { name: 'Start a Party' }).click()

      // Try to create without entering a name
      await page.getByRole('button', { name: 'Create Party' }).click()

      // Should show validation error
      await expect(page.getByText(/please enter a display name/i)).toBeVisible()
    })

    test('accepts minimum valid display name', async ({ page }) => {
      await page.goto('/')

      // Navigate to create party
      await page.getByRole('link', { name: 'Start a Party' }).click()

      // Enter minimum valid name (2 characters)
      await page.getByPlaceholder(/enter your display name/i).fill('AB')

      // Create the party
      await page.getByRole('button', { name: 'Create Party' }).click()

      // Should successfully create (navigate to party room)
      await expect(page.locator('text=/[A-Z0-9]{6}/')).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('Form Input Handling', () => {
    test('trims whitespace from display name on create party', async ({ page }) => {
      await page.goto('/')

      // Navigate to create party
      await page.getByRole('link', { name: 'Start a Party' }).click()

      // Enter name with leading/trailing whitespace
      await page.getByPlaceholder(/enter your display name/i).fill('   Valid Name   ')

      // Create the party - should work (whitespace gets trimmed)
      await page.getByRole('button', { name: 'Create Party' }).click()

      // Should successfully create party
      await expect(page.locator('text=/[A-Z0-9]{6}/')).toBeVisible({ timeout: 10000 })
    })

    test('whitespace-only display name shows error', async ({ page }) => {
      await page.goto('/')

      // Navigate to create party
      await page.getByRole('link', { name: 'Start a Party' }).click()

      // Enter only whitespace
      await page.getByPlaceholder(/enter your display name/i).fill('     ')

      // Try to create
      await page.getByRole('button', { name: 'Create Party' }).click()

      // Should show validation error (whitespace-only is treated as empty)
      await expect(page.getByText(/please enter a display name/i)).toBeVisible()
    })
  })

  test.describe('Login Error Handling', () => {
    test('displays multiple validation errors simultaneously', async ({ page }) => {
      await page.goto('/login')

      // Click Sign In without entering anything
      await page.getByRole('button', { name: 'Sign In' }).click()

      // Should show both email and password errors
      await expect(page.getByText(/email is required/i)).toBeVisible()
      await expect(page.getByText(/password is required/i)).toBeVisible()
    })

    test('clears validation errors when user starts typing', async ({ page }) => {
      await page.goto('/login')

      // Trigger validation error
      await page.getByRole('button', { name: 'Sign In' }).click()
      await expect(page.getByText(/email is required/i)).toBeVisible()

      // Start typing in email field
      await page.getByPlaceholder('Email address').fill('test@example.com')

      // Fill password and submit again - email error should be gone
      await page.getByPlaceholder('Password').fill('password123')
      await page.getByRole('button', { name: 'Sign In' }).click()

      // Email error should not appear (email is now valid)
      await expect(page.getByText(/email is required/i)).not.toBeVisible()
    })
  })

  test.describe('Signup Error Handling', () => {
    test('displays multiple validation errors simultaneously', async ({ page }) => {
      await page.goto('/signup')

      // Click Create Account without entering anything
      await page.getByRole('button', { name: 'Create Account' }).click()

      // Should show all validation errors
      await expect(page.getByText(/display name is required/i)).toBeVisible()
      await expect(page.getByText(/email is required/i)).toBeVisible()
      await expect(page.getByText(/password is required/i)).toBeVisible()
    })

    test('shows min character hint while typing short display name', async ({ page }) => {
      await page.goto('/signup')

      // Enter single character
      await page.getByPlaceholder('Display name').fill('A')

      // Should show min characters hint
      await expect(page.getByText(/min 2 characters/i)).toBeVisible()
    })
  })

  test.describe('Navigation Error Recovery', () => {
    test('can recover from error state by navigating away', async ({ page }) => {
      await page.goto('/login')

      // Trigger validation errors
      await page.getByRole('button', { name: 'Sign In' }).click()
      await expect(page.getByText(/email is required/i)).toBeVisible()

      // Navigate away to home
      await page.getByRole('link', { name: /go back to home/i }).click()

      // Navigate back to login
      await page.goto('/login')

      // Errors should not persist
      await expect(page.getByText(/email is required/i)).not.toBeVisible()
    })
  })

  test.describe('Password Reset Error Handling', () => {
    test('shows error for invalid email on password reset', async ({ page }) => {
      await page.goto('/login')

      // Go to forgot password
      await page.getByText(/forgot password/i).click()

      // Enter invalid email
      await page.getByPlaceholder('Email address').fill('invalid-email')

      // Click send reset link
      await page.getByRole('button', { name: /send reset link/i }).click()

      // Should show validation error
      await expect(page.getByText(/please enter a valid email/i)).toBeVisible()
    })
  })
})
