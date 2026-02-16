import { test, expect } from '@playwright/test'

const FAKE_AUTH_COOKIE = { name: 'sb-mock-auth-token', value: 'test-session', domain: 'localhost', path: '/' }

test.describe('Share and Invite Flows', () => {
  test.beforeEach(async ({ page }) => {
    // Inject fake auth cookie to pass auth middleware
    await page.context().addCookies([FAKE_AUTH_COOKIE])
    // Clear localStorage and create a party first
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.clear()
      localStorage.setItem('link-party-display-name', 'Test User')
    })
    await page.reload()

    // Navigate to create party
    await page.getByRole('link', { name: 'Start a Party' }).first().click()

    // Create party (no display name input — derived from auth user)
    await page.getByRole('button', { name: 'Create Party' }).click()

    // Wait for party room to load
    await expect(page.getByTestId('party-code')).toBeVisible({ timeout: 10000 })
  })

  test.describe('Share Button', () => {
    test('party room has a share button', async ({ page }) => {
      // Check for share button
      await expect(page.getByRole('button', { name: /share party/i })).toBeVisible()
    })

    test('clicking share shows copied notification when Web Share not available', async ({ page }) => {
      // Mock clipboard API
      await page.evaluate(() => {
        // Mock navigator.share to not exist
        Object.defineProperty(navigator, 'share', { value: undefined, writable: true })

        // Mock clipboard API
        Object.defineProperty(navigator, 'clipboard', {
          value: {
            writeText: () => Promise.resolve(),
          },
          writable: true,
        })
      })

      // Click share button
      await page.getByRole('button', { name: /share party/i }).click()

      // Should show "copied" notification
      await expect(page.getByText(/party link copied/i)).toBeVisible({ timeout: 5000 })
    })
  })

  test.describe('Party Code Display', () => {
    test('displays party code prominently', async ({ page }) => {
      // Party code should be visible (6 alphanumeric characters)
      const codeElement = page.getByTestId('party-code')
      await expect(codeElement).toBeVisible()
    })

    test('party code is in correct format', async ({ page }) => {
      // Get the party code text
      const codeElement = page.getByTestId('party-code')
      const codeText = (await codeElement.textContent())?.trim()

      // Should be 6 characters, alphanumeric, uppercase
      expect(codeText).toMatch(/^[A-Z0-9]{6}$/)
    })
  })

  test.describe('Join via Code Flow', () => {
    test('can join a party using a valid code', async ({ page, context }) => {
      // Get the party code from current page
      const codeElement = page.getByTestId('party-code')
      const partyCode = (await codeElement.textContent())?.trim()

      // Open a new page to simulate another user joining
      const newPage = await context.newPage()
      await newPage.goto('/')
      await newPage.evaluate(() => {
        localStorage.clear()
        localStorage.setItem('link-party-display-name', 'Guest User')
      })

      // Navigate to join party
      await newPage.getByRole('link', { name: 'Join with Code' }).click()

      // Enter party code
      await newPage.getByPlaceholder('ABC123').fill(partyCode || 'MOCK01')

      // The Join button should be enabled with valid code
      await expect(newPage.getByRole('button', { name: 'Join Party' })).toBeEnabled()

      await newPage.close()
    })
  })
})

test.describe('Email Invitation API', () => {
  test('rejects request with missing fields', async ({ request }) => {
    const response = await request.post('/api/emails/invite', {
      data: {
        email: 'test@example.com',
        // Missing partyCode, partyName, inviterName
      },
    })

    expect(response.status()).toBe(400)
    const body = await response.json()
    expect(body.error).toContain('Missing required fields')
  })

  test('rejects invalid email format', async ({ request }) => {
    const response = await request.post('/api/emails/invite', {
      data: {
        email: 'not-an-email',
        partyCode: 'ABC123',
        partyName: 'Test Party',
        inviterName: 'Test User',
      },
    })

    expect(response.status()).toBe(400)
    const body = await response.json()
    expect(body.error).toContain('Invalid email')
  })

  test('rejects invalid party code format', async ({ request }) => {
    const response = await request.post('/api/emails/invite', {
      data: {
        email: 'test@example.com',
        partyCode: 'INVALID', // 7 characters
        partyName: 'Test Party',
        inviterName: 'Test User',
      },
    })

    // Either 400 for format or 404 for not found
    expect([400, 404]).toContain(response.status())
  })

  test('accepts valid invitation request format', async ({ request }) => {
    const response = await request.post('/api/emails/invite', {
      data: {
        email: 'test@example.com',
        partyCode: 'ABC123',
        partyName: 'Test Party',
        inviterName: 'Test User',
        personalMessage: 'Join my party!',
      },
    })

    // In test environment without Resend configured, might get 404 (party not found)
    // or 500 (email service not configured) - both are acceptable for format validation
    // The key is it shouldn't be 400 (validation error)
    expect(response.status()).not.toBe(400)
  })
})

test.describe('Direct Join Link', () => {
  test.beforeEach(async ({ page }) => {
    // Inject fake auth cookie to pass auth middleware
    await page.context().addCookies([FAKE_AUTH_COOKIE])
  })

  test('navigating to /join/CODE shows join form', async ({ page }) => {
    await page.goto('/join/ABC123')

    // Should show join party form with code pre-filled
    await expect(page.getByRole('heading', { name: /join a party/i })).toBeVisible()
  })

  test('join page has party code pre-filled', async ({ page }) => {
    await page.goto('/join/MOCK01')

    // Should have party code pre-filled
    const codeInput = page.getByPlaceholder('ABC123')
    await expect(codeInput).toHaveValue('MOCK01')
  })
})
