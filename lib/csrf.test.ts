import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { validateOrigin } from './csrf'

function mockRequest(headers: Record<string, string>): NextRequest {
  return {
    headers: {
      get: (key: string) => headers[key.toLowerCase()] ?? null,
    },
  } as unknown as NextRequest
}

describe('validateOrigin', () => {
  it('allows requests with no origin or referer', () => {
    expect(validateOrigin(mockRequest({}))).toBe(true)
  })

  it('allows requests from https://linkparty.app', () => {
    expect(validateOrigin(mockRequest({ origin: 'https://linkparty.app' }))).toBe(true)
  })

  it('allows requests from linkparty.app with path', () => {
    expect(validateOrigin(mockRequest({ origin: 'https://linkparty.app/party/123' }))).toBe(true)
  })

  it('allows requests from http://localhost:3000', () => {
    expect(validateOrigin(mockRequest({ origin: 'http://localhost:3000' }))).toBe(true)
  })

  it('allows requests from http://localhost:5173', () => {
    expect(validateOrigin(mockRequest({ origin: 'http://localhost:5173' }))).toBe(true)
  })

  it('rejects requests from unknown origins', () => {
    expect(validateOrigin(mockRequest({ origin: 'https://evil.com' }))).toBe(false)
  })

  it('rejects requests from similar but wrong origins', () => {
    expect(validateOrigin(mockRequest({ origin: 'https://notlinkparty.app' }))).toBe(false)
  })

  it('rejects requests from localhost on wrong port', () => {
    expect(validateOrigin(mockRequest({ origin: 'http://localhost:4000' }))).toBe(false)
  })

  it('checks referer as fallback when origin is absent', () => {
    expect(validateOrigin(mockRequest({ referer: 'https://linkparty.app/party/123' }))).toBe(true)
  })

  it('rejects unknown referer when origin is absent', () => {
    expect(validateOrigin(mockRequest({ referer: 'https://evil.com/steal' }))).toBe(false)
  })

  it('allows when origin is valid even if referer is invalid', () => {
    expect(
      validateOrigin(
        mockRequest({
          origin: 'https://linkparty.app',
          referer: 'https://evil.com',
        }),
      ),
    ).toBe(true)
  })

  it('allows when referer is valid even if origin is invalid', () => {
    expect(
      validateOrigin(
        mockRequest({
          origin: 'https://evil.com',
          referer: 'https://linkparty.app/page',
        }),
      ),
    ).toBe(true)
  })

  it('rejects when both origin and referer are invalid', () => {
    expect(
      validateOrigin(
        mockRequest({
          origin: 'https://evil.com',
          referer: 'https://malicious.net',
        }),
      ),
    ).toBe(false)
  })
})
