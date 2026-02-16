import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { hashPassword } from '@/lib/passwordHash'
import { LIMITS } from '@/lib/errorMessages'
import { validateOrigin } from '@/lib/csrf'

export const dynamic = 'force-dynamic'

const MAX_ACTIVE_PARTIES = 5

/** Generate 6-character alphanumeric party code (same charset as lib/supabase.ts) */
function generatePartyCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const randomValues = crypto.getRandomValues(new Uint8Array(6))
  return Array.from(randomValues, (v) => chars.charAt(v % chars.length)).join('')
}

export async function POST(request: NextRequest) {
  try {
    if (!validateOrigin(request)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { sessionId, displayName, avatar, partyName, password, userId, visibleToFriends } = body

    // Validate required fields
    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid sessionId' }, { status: 400 })
    }
    const trimmedName = typeof displayName === 'string' ? displayName.trim() : ''
    if (trimmedName.length < 2 || trimmedName.length > 50) {
      return NextResponse.json({ error: 'Display name must be 2-50 characters' }, { status: 400 })
    }
    const trimmedPartyName = typeof partyName === 'string' ? partyName.trim() : ''
    if (trimmedPartyName.length > 100) {
      return NextResponse.json({ error: 'Party name must be 100 characters or less' }, { status: 400 })
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

    // Enforce 5-party limit: count active (non-expired) parties for this session
    const { count, error: countError } = await supabase
      .from('parties')
      .select('*', { count: 'exact', head: true })
      .eq('host_session_id', sessionId)
      .gt('expires_at', new Date().toISOString())

    if (countError) {
      console.error('Failed to count active parties:', countError)
      return NextResponse.json({ error: 'Failed to check party limit' }, { status: 500 })
    }

    if ((count ?? 0) >= MAX_ACTIVE_PARTIES) {
      return NextResponse.json({ error: LIMITS.MAX_PARTIES }, { status: 409 })
    }

    // Hash password if provided
    const passwordHash = password ? await hashPassword(password) : null

    // Generate party code server-side
    const code = generatePartyCode()

    // Insert party
    const insertData: Record<string, unknown> = {
      code,
      name: trimmedPartyName || null,
      host_session_id: sessionId,
      visible_to_friends: visibleToFriends === true,
    }
    if (passwordHash) insertData.password_hash = passwordHash

    const { data: party, error: partyError } = await supabase.from('parties').insert(insertData).select().single()

    if (partyError) {
      console.error('Failed to create party:', partyError)
      return NextResponse.json({ error: 'Failed to create party' }, { status: 500 })
    }

    // Add host as a member
    const memberData: Record<string, unknown> = {
      party_id: party.id,
      session_id: sessionId,
      display_name: trimmedName,
      avatar: avatar || '🎉',
      is_host: true,
    }
    if (userId) {
      memberData.user_id = userId
    }

    const { error: memberError } = await supabase.from('party_members').insert(memberData)

    if (memberError) {
      console.error('Failed to add host member:', memberError)
      // Clean up the party we just created
      await supabase.from('parties').delete().eq('id', party.id)
      return NextResponse.json({ error: 'Failed to create party' }, { status: 500 })
    }

    return NextResponse.json({ success: true, party: { id: party.id, code: party.code } })
  } catch (err) {
    console.error('Create party API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
