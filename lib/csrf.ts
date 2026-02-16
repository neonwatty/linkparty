import { NextRequest } from 'next/server'

const ALLOWED_ORIGINS = ['https://linkparty.app', 'http://localhost:3000', 'http://localhost:5173']

export function validateOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin')
  const referer = request.headers.get('referer')
  if (!origin && !referer) return true
  if (origin && ALLOWED_ORIGINS.some((allowed) => origin.startsWith(allowed))) return true
  if (referer && ALLOWED_ORIGINS.some((allowed) => referer.startsWith(allowed))) return true
  return false
}
