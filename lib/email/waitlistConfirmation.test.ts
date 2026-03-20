import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSendEmail = vi.fn()
vi.mock('@/lib/email', () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
}))

const originalEnv = process.env

describe('waitlistConfirmation', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    process.env = { ...originalEnv, APP_URL: 'https://linkparty.app' }
    mockSendEmail.mockResolvedValue({ success: true, id: 'email-123' })
  })

  it('sends confirmation email with name', async () => {
    const { sendWaitlistConfirmation } = await import('./waitlistConfirmation')
    const result = await sendWaitlistConfirmation('test@example.com', 'Alice')

    expect(mockSendEmail).toHaveBeenCalledOnce()
    const call = mockSendEmail.mock.calls[0][0]
    expect(call.to).toBe('test@example.com')
    expect(call.subject).toBe("You're on the Link Party waitlist!")
    expect(call.html).toContain('Alice')
    expect(call.html).toContain('https://linkparty.app')
    expect(call.text).toContain('Alice')
    expect(call.tags).toEqual([{ name: 'type', value: 'waitlist-confirmation' }])
    expect(result).toEqual({ success: true, id: 'email-123' })
  })

  it('sends confirmation email without name (fallback greeting)', async () => {
    const { sendWaitlistConfirmation } = await import('./waitlistConfirmation')
    await sendWaitlistConfirmation('test@example.com')

    const call = mockSendEmail.mock.calls[0][0]
    expect(call.html).toContain('Hey there')
    expect(call.html).not.toContain('undefined')
  })

  it('escapes HTML in name to prevent XSS', async () => {
    const { sendWaitlistConfirmation } = await import('./waitlistConfirmation')
    await sendWaitlistConfirmation('test@example.com', '<script>alert("xss")</script>')

    const call = mockSendEmail.mock.calls[0][0]
    expect(call.html).not.toContain('<script>')
    expect(call.html).toContain('&lt;script&gt;')
  })
})
