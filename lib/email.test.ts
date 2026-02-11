import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Store original env
const originalEnv = process.env

describe('email service', () => {
  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    process.env = originalEnv
    vi.restoreAllMocks()
  })

  async function loadModule() {
    return import('./email')
  }

  describe('sendEmail', () => {
    it('returns error when RESEND_API_KEY is not configured', async () => {
      delete process.env.RESEND_API_KEY
      const { sendEmail } = await loadModule()
      const result = await sendEmail({ to: 'test@example.com', subject: 'Test', html: '<p>Hi</p>' })
      expect(result.success).toBe(false)
      expect(result.error).toBe('Email service not configured')
    })

    it('sends email with correct parameters', async () => {
      process.env.RESEND_API_KEY = 'test-api-key'
      const mockResponse = { ok: true, json: () => Promise.resolve({ id: 'email-123' }) }
      global.fetch = vi.fn().mockResolvedValue(mockResponse)

      const { sendEmail } = await loadModule()
      const result = await sendEmail({
        to: 'user@example.com',
        subject: 'Hello',
        html: '<p>Body</p>',
        text: 'Body',
        replyTo: 'reply@example.com',
        tags: [{ name: 'type', value: 'test' }],
      })

      expect(result.success).toBe(true)
      expect(result.id).toBe('email-123')
      expect(global.fetch).toHaveBeenCalledWith('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer test-api-key',
          'Content-Type': 'application/json',
        },
        body: expect.any(String),
      })

      const body = JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body)
      expect(body.to).toEqual(['user@example.com'])
      expect(body.subject).toBe('Hello')
      expect(body.reply_to).toBe('reply@example.com')
      expect(body.tags).toEqual([{ name: 'type', value: 'test' }])
    })

    it('wraps single email in array', async () => {
      process.env.RESEND_API_KEY = 'test-key'
      global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ id: 'x' }) })

      const { sendEmail } = await loadModule()
      await sendEmail({ to: 'single@example.com', subject: 'Test', html: '<p>Hi</p>' })

      const body = JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body)
      expect(body.to).toEqual(['single@example.com'])
    })

    it('passes array of emails directly', async () => {
      process.env.RESEND_API_KEY = 'test-key'
      global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ id: 'x' }) })

      const { sendEmail } = await loadModule()
      await sendEmail({ to: ['a@example.com', 'b@example.com'], subject: 'Test', html: '<p>Hi</p>' })

      const body = JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body)
      expect(body.to).toEqual(['a@example.com', 'b@example.com'])
    })

    it('handles Resend API error response', async () => {
      process.env.RESEND_API_KEY = 'test-key'
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ message: 'Invalid API key' }),
      })

      const { sendEmail } = await loadModule()
      const result = await sendEmail({ to: 'test@example.com', subject: 'Test', html: '<p>Hi</p>' })
      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid API key')
    })

    it('handles fetch exceptions', async () => {
      process.env.RESEND_API_KEY = 'test-key'
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

      const { sendEmail } = await loadModule()
      const result = await sendEmail({ to: 'test@example.com', subject: 'Test', html: '<p>Hi</p>' })
      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to send email')
    })
  })

  describe('sendPartyInvitation', () => {
    beforeEach(() => {
      process.env.RESEND_API_KEY = 'test-key'
      global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ id: 'inv-123' }) })
    })

    it('sends invitation with correct subject and tags', async () => {
      const { sendPartyInvitation } = await loadModule()
      const result = await sendPartyInvitation({
        to: 'friend@example.com',
        partyCode: 'ABC123',
        partyName: 'Movie Night',
        inviterName: 'Alice',
      })

      expect(result.success).toBe(true)
      const body = JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body)
      expect(body.subject).toBe('Alice invited you to join "Movie Night" on Link Party')
      expect(body.tags).toContainEqual({ name: 'type', value: 'party-invitation' })
      expect(body.tags).toContainEqual({ name: 'party-code', value: 'ABC123' })
    })

    it('includes personal message in HTML when provided', async () => {
      const { sendPartyInvitation } = await loadModule()
      await sendPartyInvitation({
        to: 'friend@example.com',
        partyCode: 'XYZ789',
        partyName: 'Fun Party',
        inviterName: 'Bob',
        personalMessage: 'Come join us!',
      })

      const body = JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body)
      expect(body.html).toContain('Come join us!')
      expect(body.text).toContain('Come join us!')
    })

    it('omits personal message section when not provided', async () => {
      const { sendPartyInvitation } = await loadModule()
      await sendPartyInvitation({
        to: 'friend@example.com',
        partyCode: 'XYZ789',
        partyName: 'Fun Party',
        inviterName: 'Bob',
      })

      const body = JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body)
      expect(body.text).not.toContain('Message from Bob')
    })

    it('includes join URL with party code', async () => {
      const { sendPartyInvitation } = await loadModule()
      await sendPartyInvitation({
        to: 'friend@example.com',
        partyCode: 'TEST99',
        partyName: 'Test Party',
        inviterName: 'Tester',
      })

      const body = JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body)
      expect(body.html).toContain('/join?code=TEST99')
      expect(body.text).toContain('/join?code=TEST99')
    })

    it('escapes HTML in user-provided strings', async () => {
      const { sendPartyInvitation } = await loadModule()
      await sendPartyInvitation({
        to: 'friend@example.com',
        partyCode: 'ABC123',
        partyName: '<script>alert("xss")</script>',
        inviterName: 'Alice & Bob',
        personalMessage: 'Test "quotes" & <tags>',
      })

      const body = JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body)
      expect(body.html).not.toContain('<script>')
      expect(body.html).toContain('&lt;script&gt;')
      expect(body.html).toContain('Alice &amp; Bob')
      expect(body.html).toContain('&lt;tags&gt;')
      expect(body.html).toContain('&quot;quotes&quot;')
    })
  })
})
