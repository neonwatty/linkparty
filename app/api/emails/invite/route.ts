import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendPartyInvitation } from '@/lib/email'
import { validateOrigin } from '@/lib/csrf'
import { createRateLimiter } from '@/lib/serverRateLimit'
import { INVITE_RATE_LIMIT, INVITE_RATE_WINDOW_MS } from '@/lib/partyLimits'

export const dynamic = 'force-dynamic'

interface InviteRequest {
  email: string
  partyCode: string
  partyName: string
  inviterName: string
  personalMessage?: string
}

// 10 invites per party per hour
const rateLimiter = createRateLimiter({ maxRequests: INVITE_RATE_LIMIT, windowMs: INVITE_RATE_WINDOW_MS })

// Validate email format
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export async function POST(request: NextRequest) {
  try {
    if (!validateOrigin(request)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body: InviteRequest = await request.json()
    const { email, partyCode, partyName, inviterName, personalMessage } = body

    // Validate required fields
    if (!email || !partyCode || !partyName || !inviterName) {
      return NextResponse.json(
        { error: 'Missing required fields: email, partyCode, partyName, inviterName' },
        { status: 400 },
      )
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    // Validate party code format (6 alphanumeric characters)
    if (!/^[A-Z0-9]{6}$/.test(partyCode.toUpperCase())) {
      return NextResponse.json({ error: 'Invalid party code format' }, { status: 400 })
    }

    // Check rate limit
    const { limited } = rateLimiter.check(partyCode)
    if (limited) {
      return NextResponse.json({ error: 'Too many invitations sent. Please try again later.' }, { status: 429 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // S10: Authentication is required for sending invites
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Authentication required to send invitations' }, { status: 401 })
    }
    const {
      data: { user },
    } = await supabase.auth.getUser(token)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const inviterId: string = user.id

    // Verify party exists
    const { data: party, error } = await supabase
      .from('parties')
      .select('id, code, expires_at')
      .eq('code', partyCode.toUpperCase())
      .single()

    if (error || !party) {
      return NextResponse.json({ error: 'Party not found' }, { status: 404 })
    }

    if (new Date(party.expires_at) < new Date()) {
      return NextResponse.json({ error: 'This party has expired' }, { status: 410 })
    }

    // Deduplicate: check if this email was already invited to this party
    const { data: existingToken } = await supabase
      .from('invite_tokens')
      .select('id')
      .eq('invitee_email', email.toLowerCase())
      .eq('party_code', partyCode.toUpperCase())
      .eq('claimed', false)
      .limit(1)
      .maybeSingle()

    if (existingToken) {
      return NextResponse.json({ error: 'This person has already been invited to this party.' }, { status: 409 })
    }

    // Create invite token for auto-friendship on sign-up
    const { error: tokenError } = await supabase.from('invite_tokens').insert({
      inviter_id: inviterId,
      invitee_email: email.toLowerCase(),
      party_code: partyCode.toUpperCase(),
    })
    if (tokenError) console.error('Failed to create invite token:', tokenError.message)

    // Send the invitation email
    const result = await sendPartyInvitation({
      to: email,
      partyCode: partyCode.toUpperCase(),
      partyName,
      inviterName,
      inviterId,
      personalMessage,
    })

    if (!result.success) {
      console.error('Failed to send invitation:', result.error)
      return NextResponse.json({ error: result.error || 'Failed to send invitation' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Invitation sent successfully',
      emailId: result.id,
    })
  } catch (err) {
    console.error('Invite API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
