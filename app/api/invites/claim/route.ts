import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

/**
 * POST /api/invites/claim
 * After a user joins a party via an invite link, claim matching invite tokens
 * and auto-create mutual friendships with inviters.
 *
 * Body: { partyCode?: string }
 * Auth: Bearer token required
 */
export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    // Verify auth
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { partyCode } = body as { partyCode?: string }

    // Find unclaimed invite tokens matching this user's email
    let query = supabase
      .from('invite_tokens')
      .select('id, inviter_id, party_code')
      .eq('invitee_email', user.email!)
      .eq('claimed', false)
      .gt('expires_at', new Date().toISOString())

    if (partyCode) {
      query = query.eq('party_code', partyCode.toUpperCase())
    }

    const { data: tokens, error: tokenError } = await query.limit(10)
    if (tokenError || !tokens || tokens.length === 0) {
      return NextResponse.json({ success: true, claimed: 0, friendshipsCreated: 0 })
    }

    let friendshipsCreated = 0
    const claimedTokenIds: string[] = []

    for (const token of tokens) {
      // Skip if inviter is the user themselves
      if (token.inviter_id === user.id) continue

      // Check if friendship already exists
      const { data: existing } = await supabase
        .from('friendships')
        .select('id')
        .eq('user_id', user.id)
        .eq('friend_id', token.inviter_id)
        .maybeSingle()

      if (!existing) {
        // Create mutual friendship (both directions, both accepted)
        const { error: f1Error } = await supabase.from('friendships').insert({
          user_id: user.id,
          friend_id: token.inviter_id,
          status: 'accepted',
        })
        const { error: f2Error } = await supabase.from('friendships').insert({
          user_id: token.inviter_id,
          friend_id: user.id,
          status: 'accepted',
        })

        if (!f1Error && !f2Error) {
          friendshipsCreated++

          // Create notification for the inviter (best-effort)
          await supabase.from('notifications').insert({
            user_id: token.inviter_id,
            type: 'friend_accepted',
            title: 'New friend!',
            body: `${user.user_metadata?.display_name || user.email} joined via your invite and is now your friend`,
            data: { friendId: user.id, friendName: user.user_metadata?.display_name || user.email },
          })
        }
      }

      claimedTokenIds.push(token.id)
    }

    // Mark tokens as claimed
    if (claimedTokenIds.length > 0) {
      await supabase.from('invite_tokens').update({ claimed: true, claimed_by: user.id }).in('id', claimedTokenIds)
    }

    return NextResponse.json({
      success: true,
      claimed: claimedTokenIds.length,
      friendshipsCreated,
    })
  } catch (err) {
    console.error('Invite claim error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
