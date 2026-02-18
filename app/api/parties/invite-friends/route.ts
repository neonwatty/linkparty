import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendPartyInvitation } from '@/lib/email'
import { validateOrigin } from '@/lib/csrf'

export const dynamic = 'force-dynamic'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MAX_FRIENDS = 20

export async function POST(request: NextRequest) {
  try {
    if (!validateOrigin(request)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Authenticate user from Bearer token
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const token = authHeader.replace('Bearer ', '')

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse and validate request body
    const body = await request.json()
    const { partyId, partyCode, partyName, friendIds } = body

    if (!partyId || !partyCode || !partyName) {
      return NextResponse.json({ error: 'Missing required fields: partyId, partyCode, partyName' }, { status: 400 })
    }
    if (!Array.isArray(friendIds) || friendIds.length === 0) {
      return NextResponse.json({ error: 'friendIds must be a non-empty array' }, { status: 400 })
    }
    if (friendIds.length > MAX_FRIENDS) {
      return NextResponse.json({ error: `Cannot invite more than ${MAX_FRIENDS} friends at once` }, { status: 400 })
    }
    if (!friendIds.every((id: unknown) => typeof id === 'string' && UUID_REGEX.test(id))) {
      return NextResponse.json({ error: 'Invalid friendIds format' }, { status: 400 })
    }

    // Verify party exists and is not expired
    const { data: party, error: partyError } = await supabase
      .from('parties')
      .select('id, expires_at')
      .eq('id', partyId)
      .single()

    if (partyError || !party) {
      return NextResponse.json({ error: 'Party not found' }, { status: 404 })
    }
    if (new Date(party.expires_at) <= new Date()) {
      return NextResponse.json({ error: 'Party has expired' }, { status: 410 })
    }

    // Get inviter display name
    const { data: inviterProfile } = await supabase
      .from('user_profiles')
      .select('display_name')
      .eq('id', user.id)
      .single()
    const inviterName = inviterProfile?.display_name || 'Someone'

    // Verify friendIds are actual accepted friends
    const { data: friendships, error: friendError } = await supabase
      .from('friendships')
      .select('friend_id')
      .eq('user_id', user.id)
      .in('friend_id', friendIds)
      .eq('status', 'accepted')

    if (friendError) {
      console.error('Failed to verify friendships:', friendError)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    const validFriendIds = (friendships || []).map((f) => f.friend_id)
    if (validFriendIds.length === 0) {
      return NextResponse.json({ error: 'No valid friends found to invite' }, { status: 400 })
    }

    // Send notifications and emails for each valid friend
    for (const friendId of validFriendIds) {
      // Insert notification
      const { error: notifError } = await supabase.from('notifications').insert({
        user_id: friendId,
        type: 'party_invite',
        title: `${inviterName} invited you to ${partyName || 'a party'}`,
        data: { partyId, partyCode, inviterName, inviterId: user.id },
      })
      if (notifError) {
        console.error(`Failed to create notification for ${friendId}:`, notifError)
      }

      // Send email (fire-and-forget)
      try {
        const { data: friendUser } = await supabase.auth.admin.getUserById(friendId)
        if (friendUser?.user?.email) {
          await sendPartyInvitation({
            to: friendUser.user.email,
            partyCode,
            partyName,
            inviterName,
          })
        }
      } catch (emailErr) {
        console.error(`Failed to send invite email to ${friendId}:`, emailErr)
      }
    }

    return NextResponse.json({ success: true, invited: validFriendIds.length })
  } catch (err) {
    console.error('Invite friends API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
