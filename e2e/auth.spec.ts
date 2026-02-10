import { test, expect } from '@playwright/test'

test.describe('Authentication Flows', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to reset session
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
  })

  test.describe('Login Page', () => {
    test('displays login page with all elements', async ({ page }) => {
      await page.goto('/login')

      // Check heading
      await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible()

      // Check Google sign-in button
      await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible()

      // Check email and password inputs
      await expect(page.getByPlaceholder('Email address')).toBeVisible()
      await expect(page.getByPlaceholder('Password')).toBeVisible()

      // Check Sign In button
      await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible()

      // Check forgot password link
      await expect(page.getByText(/forgot password/i)).toBeVisible()

      // Check signup link
      await expect(page.getByText(/don't have an account/i)).toBeVisible()
    })

    test('shows validation error for empty email', async ({ page }) => {
      await page.goto('/login')

      // Enter only password
      await page.getByPlaceholder('Password').fill('password123')

      // Click Sign In
      await page.getByRole('button', { name: 'Sign In' }).click()

      // Should show email validation error
      await expect(page.getByText(/email is required/i)).toBeVisible()
    })

    test('shows validation error for invalid email format', async ({ page }) => {
      await page.goto('/login')

      // Enter invalid email
      await page.getByPlaceholder('Email address').fill('notanemail')
      await page.getByPlaceholder('Password').fill('password123')

      // Click Sign In
      await page.getByRole('button', { name: 'Sign In' }).click()

      // Should show email format error
      await expect(page.getByText(/please enter a valid email/i)).toBeVisible()
    })

    test('shows validation error for empty password', async ({ page }) => {
      await page.goto('/login')

      // Enter only email
      await page.getByPlaceholder('Email address').fill('test@example.com')

      // Click Sign In
      await page.getByRole('button', { name: 'Sign In' }).click()

      // Should show password validation error
      await expect(page.getByText(/password is required/i)).toBeVisible()
    })

    test('shows validation error for short password', async ({ page }) => {
      await page.goto('/login')

      // Enter email and short password
      await page.getByPlaceholder('Email address').fill('test@example.com')
      await page.getByPlaceholder('Password').fill('short')

      // Click Sign In
      await page.getByRole('button', { name: 'Sign In' }).click()

      // Should show password length error
      await expect(page.getByText(/password must be at least 8 characters/i)).toBeVisible()
    })

    test('navigates to forgot password flow', async ({ page }) => {
      await page.goto('/login')

      // Click forgot password
      await page.getByText(/forgot password/i).click()

      // Should show reset password heading
      await expect(page.getByRole('heading', { name: /reset password/i })).toBeVisible()
      await expect(page.getByText(/enter your email to receive a reset link/i)).toBeVisible()

      // Should have email input and send button
      await expect(page.getByPlaceholder('Email address')).toBeVisible()
      await expect(page.getByRole('button', { name: /send reset link/i })).toBeVisible()
    })

    test('forgot password validates email', async ({ page }) => {
      await page.goto('/login')

      // Go to forgot password
      await page.getByText(/forgot password/i).click()

      // Try to send without email
      await page.getByRole('button', { name: /send reset link/i }).click()

      // Should show validation error
      await expect(page.getByText(/email is required/i)).toBeVisible()
    })

    test('can return from forgot password to login', async ({ page }) => {
      await page.goto('/login')

      // Go to forgot password
      await page.getByText(/forgot password/i).click()

      // Verify on reset password screen
      await expect(page.getByRole('heading', { name: /reset password/i })).toBeVisible()

      // Click back button
      await page.getByRole('button', { name: /go back to sign in/i }).click()

      // Should be back on login screen
      await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible()
    })

    test('navigates to signup page', async ({ page }) => {
      await page.goto('/login')

      // Click signup link
      await page.getByRole('link', { name: /sign up/i }).click()

      // Should be on signup page
      await expect(page.getByRole('heading', { name: /create account/i })).toBeVisible()
    })

    test('can navigate back to home', async ({ page }) => {
      await page.goto('/login')

      // Click back button (first button/link with aria-label)
      await page.getByRole('link', { name: /go back to home/i }).click()

      // Should be on home page
      await expect(page.getByRole('link', { name: 'Start a Party' }).first()).toBeVisible()
    })
  })

  test.describe('Signup Page', () => {
    test('displays signup page with all elements', async ({ page }) => {
      await page.goto('/signup')

      // Check heading
      await expect(page.getByRole('heading', { name: /create account/i })).toBeVisible()

      // Check Google sign-in button
      await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible()

      // Check form inputs
      await expect(page.getByPlaceholder('Display name')).toBeVisible()
      await expect(page.getByPlaceholder('Email address')).toBeVisible()
      await expect(page.getByPlaceholder('Password')).toBeVisible()

      // Check Create Account button
      await expect(page.getByRole('button', { name: 'Create Account' })).toBeVisible()

      // Check login link
      await expect(page.getByText(/already have an account/i)).toBeVisible()
    })

    test('shows validation error for empty display name', async ({ page }) => {
      await page.goto('/signup')

      // Enter email and password but not display name
      await page.getByPlaceholder('Email address').fill('test@example.com')
      await page.getByPlaceholder('Password').fill('password123')

      // Click Create Account
      await page.getByRole('button', { name: 'Create Account' }).click()

      // Should show display name validation error
      await expect(page.getByText(/display name is required/i)).toBeVisible()
    })

    test('shows validation error for short display name', async ({ page }) => {
      await page.goto('/signup')

      // Enter single character display name
      await page.getByPlaceholder('Display name').fill('A')
      await page.getByPlaceholder('Email address').fill('test@example.com')
      await page.getByPlaceholder('Password').fill('password123')

      // Click Create Account
      await page.getByRole('button', { name: 'Create Account' }).click()

      // Should show display name length error
      await expect(page.getByText(/display name must be 2-50 characters/i)).toBeVisible()
    })

    test('shows validation error for empty email', async ({ page }) => {
      await page.goto('/signup')

      // Enter display name and password but not email
      await page.getByPlaceholder('Display name').fill('Test User')
      await page.getByPlaceholder('Password').fill('password123')

      // Click Create Account
      await page.getByRole('button', { name: 'Create Account' }).click()

      // Should show email validation error
      await expect(page.getByText(/email is required/i)).toBeVisible()
    })

    test('shows validation error for invalid email', async ({ page }) => {
      await page.goto('/signup')

      // Enter invalid email
      await page.getByPlaceholder('Display name').fill('Test User')
      await page.getByPlaceholder('Email address').fill('notanemail')
      await page.getByPlaceholder('Password').fill('password123')

      // Click Create Account
      await page.getByRole('button', { name: 'Create Account' }).click()

      // Should show email format error
      await expect(page.getByText(/please enter a valid email/i)).toBeVisible()
    })

    test('shows validation error for empty password', async ({ page }) => {
      await page.goto('/signup')

      // Enter display name and email but not password
      await page.getByPlaceholder('Display name').fill('Test User')
      await page.getByPlaceholder('Email address').fill('test@example.com')

      // Click Create Account
      await page.getByRole('button', { name: 'Create Account' }).click()

      // Should show password validation error
      await expect(page.getByText(/password is required/i)).toBeVisible()
    })

    test('shows validation error for short password', async ({ page }) => {
      await page.goto('/signup')

      // Enter short password
      await page.getByPlaceholder('Display name').fill('Test User')
      await page.getByPlaceholder('Email address').fill('test@example.com')
      await page.getByPlaceholder('Password').fill('short')

      // Click Create Account
      await page.getByRole('button', { name: 'Create Account' }).click()

      // Should show password length error
      await expect(page.getByText(/password must be at least 8 characters/i)).toBeVisible()
    })

    test('shows character counter for display name', async ({ page }) => {
      await page.goto('/signup')

      // Enter display name
      await page.getByPlaceholder('Display name').fill('Test User')

      // Should show character count
      await expect(page.getByText('9/50')).toBeVisible()
    })

    test('limits display name to 50 characters', async ({ page }) => {
      await page.goto('/signup')

      // Enter more than 50 characters
      const longName = 'a'.repeat(60)
      await page.getByPlaceholder('Display name').fill(longName)

      // Input should be limited to 50 characters
      const input = page.getByPlaceholder('Display name')
      await expect(input).toHaveValue('a'.repeat(50))
    })

    test('navigates to login page', async ({ page }) => {
      await page.goto('/signup')

      // Click login link
      await page.getByRole('link', { name: /sign in/i }).click()

      // Should be on login page
      await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible()
    })

    test('can navigate back to home', async ({ page }) => {
      await page.goto('/signup')

      // Click back button
      await page.getByRole('link', { name: /go back to home/i }).click()

      // Should be on home page
      await expect(page.getByRole('link', { name: 'Start a Party' }).first()).toBeVisible()
    })
  })

  test.describe('Navigation between auth pages', () => {
    test('can navigate from home to login', async ({ page }) => {
      await page.goto('/')

      // Look for sign in link (if it exists on home page)
      const signInLink = page.getByRole('link', { name: /sign in/i })
      if (await signInLink.isVisible()) {
        await signInLink.click()
        await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible()
      }
    })

    test('can navigate login -> signup -> login', async ({ page }) => {
      // Start at login
      await page.goto('/login')
      await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible()

      // Go to signup
      await page.getByRole('link', { name: /sign up/i }).click()
      await expect(page.getByRole('heading', { name: /create account/i })).toBeVisible()

      // Go back to login
      await page.getByRole('link', { name: /sign in/i }).click()
      await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible()
    })
  })
})
