import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateOrigin } from '@/lib/csrf'
import { createRateLimiter } from '@/lib/serverRateLimit'
import disposableDomains from 'disposable-email-domains'
import { sendWaitlistConfirmation } from '@/lib/email/waitlistConfirmation'

export const dynamic = 'force-dynamic'

const ipLimiter = createRateLimiter({ maxRequests: 5, windowMs: 60 * 60 * 1000 })
const emailLimiter = createRateLimiter({ maxRequests: 3, windowMs: 60 * 60 * 1000 })

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const disposableSet = new Set(disposableDomains)

export async function POST(request: NextRequest) {
  try {
    if (!validateOrigin(request)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const { limited: ipLimited } = ipLimiter.check(ip)
    if (ipLimited) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const body = await request.json()
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const name = typeof body.name === 'string' ? body.name.trim().slice(0, 100) : undefined
    const source = typeof body.source === 'string' ? body.source.trim() : 'landing_page'

    if (!email || !EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email' }, { status: 400 })
    }

    const { limited: emailLimited } = emailLimiter.check(email)
    if (emailLimited) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const domain = email.split('@')[1]
    if (disposableSet.has(domain)) {
      return NextResponse.json({ error: 'Please use a non-disposable email address' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

    if (!supabaseUrl || supabaseUrl.includes('placeholder') || !serviceRoleKey) {
      return NextResponse.json({ success: true, waitlisted: true })
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)
    const { error } = await supabase
      .from('waitlist')
      .upsert({ email, name: name || null, source }, { onConflict: 'email', ignoreDuplicates: true })

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ success: true, waitlisted: false })
      }
      console.error('Waitlist insert error:', error)
      return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    }

    sendWaitlistConfirmation(email, name).catch((err) => console.error('Waitlist confirmation email failed:', err))

    syncToResendAudience(email, name).catch((err) => console.error('Resend audience sync failed:', err))

    return NextResponse.json({ success: true, waitlisted: true })
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

async function syncToResendAudience(email: string, name?: string) {
  const apiKey = process.env.RESEND_API_KEY
  const audienceId = process.env.RESEND_WAITLIST_AUDIENCE_ID
  if (!apiKey || !audienceId) return

  await fetch(`https://api.resend.com/audiences/${audienceId}/contacts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      first_name: name || undefined,
      unsubscribed: false,
    }),
  })
}
