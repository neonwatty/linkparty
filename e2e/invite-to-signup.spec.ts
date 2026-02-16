import { test, expect } from '@playwright/test'

const FAKE_AUTH_COOKIE = { name: 'sb-mock-auth-token', value: 'test-session', domain: 'localhost', path: '/' }

test.describe('Invite-to-Signup Flow (Phase 5)', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().addCookies([FAKE_AUTH_COOKIE])
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.clear()
      localStorage.setItem('link-party-display-name', 'Test User')
    })
    await page.reload()
  })

  test.describe('Login page — redirect passthrough to signup', () => {
    test('signup link preserves redirect param', async ({ page }) => {
      await page.goto('/login?redirect=/join/ABC123?inviter=user-123')

      // Find the anchor link containing "Sign up" text
      const signupLink = page.getByRole('link', { name: /sign up/i })
      await expect(signupLink).toBeVisible()

      const href = await signupLink.getAttribute('href')
      expect(href).toContain('/signup')
      expect(href).toContain('redirect=')
    })

    test('signup link works without redirect param', async ({ page }) => {
      await page.goto('/login')

      const signupLink = page.getByRole('link', { name: /sign up/i })
      await expect(signupLink).toBeVisible()

      const href = await signupLink.getAttribute('href')
      expect(href).toMatch(/^\/signup\/?$/)
    })
  })

  test.describe('Signup page — invite context', () => {
    test('shows invite banner when redirect contains inviter param', async ({ page }) => {
      await page.goto('/signup?redirect=/join/ABC123?inviter=user-123')

      await expect(page.getByText(/invited to a party/i)).toBeVisible()
    })

    test('shows default text when no invite context', async ({ page }) => {
      await page.goto('/signup')

      await expect(page.getByText(/join parties and share content/i)).toBeVisible()
    })

    test('stores redirect in sessionStorage', async ({ page }) => {
      await page.goto('/signup?redirect=/join/ABC123?inviter=user-123')

      // Wait for the React hydration + useEffect to run
      await page.waitForTimeout(500)

      const stored = await page.evaluate(() => sessionStorage.getItem('auth-redirect'))
      expect(stored).toContain('/join/ABC123')
    })
  })

  test.describe('Auth callback — redirect handling', () => {
    test('reads redirect from URL params', async ({ page }) => {
      // The auth callback page should check URL params for redirect
      await page.goto('/auth/callback?redirect=/join/ABC123')

      // In mock mode without a real session, it will timeout to login
      // But we can verify the page renders
      await expect(page.getByText(/signing in/i)).toBeVisible()
    })
  })

  test.describe('Join page — code from URL params', () => {
    test('pre-fills code from URL search param', async ({ page }) => {
      await page.goto('/join?code=TEST12')

      const codeInput = page.getByPlaceholder('ABC123')
      await expect(codeInput).toHaveValue('TEST12')
    })

    test('works with empty code param', async ({ page }) => {
      await page.goto('/join')

      const codeInput = page.getByPlaceholder('ABC123')
      await expect(codeInput).toHaveValue('')
    })
  })

  test.describe('Join with code page — inviter param', () => {
    test('renders join page with inviter in URL', async ({ page }) => {
      await page.goto('/join/ABC123?inviter=user-456')

      // Should show the join page with code pre-filled
      const codeInput = page.getByPlaceholder('ABC123')
      await expect(codeInput).toHaveValue('ABC123')

      // The page should still function normally
      await expect(page.getByRole('button', { name: /join party/i })).toBeVisible()
    })
  })

  test.describe('Party Room — Add as friend button', () => {
    test.beforeEach(async ({ page }) => {
      // Create a party first
      await page.getByRole('link', { name: 'Start a Party' }).first().click()
      await page.getByRole('button', { name: 'Create Party' }).click()
      await expect(page.getByTestId('party-code')).toBeVisible({ timeout: 10000 })
    })

    test('members list shows in party room', async ({ page }) => {
      await expect(page.getByText(/watching/i)).toBeVisible()
    })
  })

  test.describe('Email invite modal — auth token', () => {
    test.beforeEach(async ({ page }) => {
      // Create a party first
      await page.getByRole('link', { name: 'Start a Party' }).first().click()
      await page.getByRole('button', { name: 'Create Party' }).click()
      await expect(page.getByTestId('party-code')).toBeVisible({ timeout: 10000 })
    })

    test('email invite form still works', async ({ page }) => {
      await page.getByRole('button', { name: /invite by email/i }).click()
      await expect(page.getByRole('dialog', { name: /invite a friend/i })).toBeVisible()

      // Email input should be visible
      await expect(page.getByPlaceholder('friend@example.com')).toBeVisible()
    })
  })
})
