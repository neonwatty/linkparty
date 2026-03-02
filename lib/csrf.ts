import { NextRequest } from 'next/server'

const ALLOWED_ORIGINS = ['https://linkparty.app', 'http://localhost:3000', 'http://localhost:5173']

export function validateOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin')
  const referer = request.headers.get('referer')
  // Reject requests with no origin AND no referer — prevents CSRF via non-browser tools
  if (!origin && !referer) return false
  // Origin header is scheme+host only (no path) — use exact match to prevent subdomain bypass
  if (origin && ALLOWED_ORIGINS.includes(origin)) return true
  // Referer header includes path — use startsWith since it extends beyond the origin
  if (referer && ALLOWED_ORIGINS.some((allowed) => referer.startsWith(allowed))) return true
  return false
}
