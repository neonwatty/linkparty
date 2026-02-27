import { describe, it, expect } from 'vitest'

describe('Notifications API', () => {
  it('POST returns 403 with server-side-only message', async () => {
    const { POST } = await import('./route')
    const response = await POST()
    expect(response.status).toBe(403)
    const body = await response.json()
    expect(body.error).toBe('Notifications are sent server-side only')
  })
})
