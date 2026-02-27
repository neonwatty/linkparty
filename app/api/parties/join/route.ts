import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyPassword } from '@/lib/passwordHash'
import { LIMITS } from '@/lib/errorMessages'
import { validateOrigin } from '@/lib/csrf'
import { createRateLimiter } from '@/lib/serverRateLimit'
import {
  MAX_MEMBERS,
  JOIN_RATE_LIMIT,
  JOIN_RATE_WINDOW_MS,
  CODE_THROTTLE_LIMIT,
  CODE_THROTTLE_WINDOW_MS,
} from '@/lib/partyLimits'

export const dynamic = 'force-dynamic'

// 60 requests per minute per IP
const rateLimiter = createRateLimiter({ maxRequests: JOIN_RATE_LIMIT, windowMs: JOIN_RATE_WINDOW_MS })

// 10 attempts per party code per minute — prevents brute-force code guessing
const codeThrottle = createRateLimiter({ maxRequests: CODE_THROTTLE_LIMIT, windowMs: CODE_THROTTLE_WINDOW_MS })

export async function POST(request: NextRequest) {
  try {
    if (!validateOrigin(request)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Rate limit by IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const { limited, retryAfterMs } = rateLimiter.check(ip)
    if (limited) {
      const retryAfterSec = Math.ceil(retryAfterMs / 1000)
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429, headers: { 'Retry-After': retryAfterSec.toString() } },
      )
    }

    const body = await request.json()
    const { code, sessionId, displayName, avatar, password, userId } = body

    // Per-code throttle: prevent brute-force code guessing
    const upperCode = typeof code === 'string' ? code.toUpperCase() : ''
    if (upperCode) {
      const { limited: codeLimited, retryAfterMs: codeRetryMs } = codeThrottle.check(upperCode)
      if (codeLimited) {
        return NextResponse.json(
          { error: 'Too many attempts for this code. Try again shortly.' },
          { status: 429, headers: { 'Retry-After': String(Math.ceil(codeRetryMs / 1000)) } },
        )
      }
    }

    // Validate required fields
    if (!code || typeof code !== 'string' || code.length !== 6) {
      return NextResponse.json({ error: 'Invalid party code' }, { status: 400 })
    }
    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid sessionId' }, { status: 400 })
    }
    const trimmedName = typeof displayName === 'string' ? displayName.trim() : ''
    if (trimmedName.length < 2 || trimmedName.length > 50) {
      return NextResponse.json({ error: 'Display name must be 2-50 characters' }, { status: 400 })
    }

    // Get Supabase client with service role key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('FATAL: Supabase service role key not configured')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // S8: If userId is provided, verify it matches the authenticated user
    if (userId) {
      const authHeader = request.headers.get('authorization')
      const token = authHeader?.replace('Bearer ', '')
      if (!token) {
        return NextResponse.json({ error: 'Authentication required when userId is provided' }, { status: 401 })
      }
      const {
        data: { user },
      } = await supabase.auth.getUser(token)
      if (!user || user.id !== userId) {
        return NextResponse.json({ error: 'userId does not match authenticated user' }, { status: 403 })
      }
    }

    // Look up party by code (select * to be resilient to schema drift)
    const { data: party, error: partyError } = await supabase
      .from('parties')
      .select('*')
      .eq('code', code.toUpperCase())
      .single()

    if (partyError || !party) {
      return NextResponse.json({ error: LIMITS.PARTY_NOT_FOUND }, { status: 404 })
    }

    // Check if expired
    if (new Date(party.expires_at) < new Date()) {
      return NextResponse.json({ error: LIMITS.PARTY_EXPIRED }, { status: 410 })
    }

    // Check if this session already has a row (re-join) — skip password and member limit
    const { data: existingMember } = await supabase
      .from('party_members')
      .select('id')
      .eq('party_id', party.id)
      .eq('session_id', sessionId)
      .maybeSingle()

    // Password verification (server-side) — skip for existing members
    if (party.password_hash && !existingMember) {
      if (!password) {
        // Client needs to show password field
        return NextResponse.json({ success: false, needsPassword: true })
      }
      const passwordValid = await verifyPassword(password, party.password_hash)
      if (!passwordValid) {
        return NextResponse.json({ error: LIMITS.INCORRECT_PASSWORD }, { status: 401 })
      }
    }

    if (!existingMember) {
      // Enforce 20-member limit only for new joins
      const { count, error: countError } = await supabase
        .from('party_members')
        .select('*', { count: 'exact', head: true })
        .eq('party_id', party.id)

      if (countError) {
        console.error('Failed to count members:', countError)
        return NextResponse.json({ error: 'Failed to check member limit' }, { status: 500 })
      }

      if ((count ?? 0) >= MAX_MEMBERS) {
        return NextResponse.json({ error: LIMITS.MAX_MEMBERS }, { status: 409 })
      }
    }

    // Upsert member (handles re-join)
    const memberData: Record<string, unknown> = {
      party_id: party.id,
      session_id: sessionId,
      display_name: trimmedName,
      avatar: avatar || '🎉',
      is_host: false,
    }
    if (userId) {
      memberData.user_id = userId
    }

    const { error: memberError } = await supabase.from('party_members').upsert(memberData, {
      onConflict: 'party_id,session_id',
    })

    if (memberError) {
      console.error('Failed to upsert member:', memberError)
      return NextResponse.json({ error: 'Failed to join party' }, { status: 500 })
    }

    return NextResponse.json({ success: true, party: { id: party.id, code: party.code } })
  } catch (err) {
    console.error('Join party API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
