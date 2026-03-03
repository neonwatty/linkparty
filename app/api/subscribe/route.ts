import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateOrigin } from '@/lib/csrf'
import { createRateLimiter } from '@/lib/serverRateLimit'

export const dynamic = 'force-dynamic'

const rateLimiter = createRateLimiter({ maxRequests: 5, windowMs: 60 * 60 * 1000 })

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: NextRequest) {
  try {
    if (!validateOrigin(request)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const { limited } = rateLimiter.check(ip)
    if (limited) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const body = await request.json()
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''

    if (!email || !EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

    if (!supabaseUrl || supabaseUrl.includes('placeholder') || !serviceRoleKey) {
      return NextResponse.json({ success: true })
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)
    const { error } = await supabase
      .from('newsletter_subscribers')
      .upsert({ email, source: body.source || 'landing_page' }, { onConflict: 'email', ignoreDuplicates: true })

    if (error) {
      console.error('Subscribe error:', error)
      return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
