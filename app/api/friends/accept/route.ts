import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { FRIENDS } from '@/lib/errorMessages'
import { validateOrigin } from '@/lib/csrf'

export const dynamic = 'force-dynamic'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(request: NextRequest) {
  try {
    if (!validateOrigin(request)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { friendshipId } = body

    // Validate friendshipId format
    if (!friendshipId || typeof friendshipId !== 'string' || !UUID_REGEX.test(friendshipId)) {
      return NextResponse.json({ error: 'Missing or invalid friendshipId' }, { status: 400 })
    }

    // Get Supabase client with service role key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('FATAL: Supabase service role key not configured')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Authenticate user from Bearer token
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const token = authHeader.replace('Bearer ', '')
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Look up the friendship row
    const { data: friendship, error: fetchError } = await supabase
      .from('friendships')
      .select('*')
      .eq('id', friendshipId)
      .single()

    if (fetchError || !friendship) {
      return NextResponse.json({ error: FRIENDS.REQUEST_NOT_FOUND }, { status: 404 })
    }

    // Check if either user has blocked the other
    const { data: blocks } = await supabase
      .from('user_blocks')
      .select('id')
      .or(
        `and(blocker_id.eq.${user.id},blocked_id.eq.${friendship.user_id}),and(blocker_id.eq.${friendship.user_id},blocked_id.eq.${user.id})`,
      )
      .limit(1)

    if (blocks && blocks.length > 0) {
      return NextResponse.json({ error: FRIENDS.BLOCKED }, { status: 403 })
    }

    // Validate: must be pending and current user must be the recipient
    if (friendship.status !== 'pending') {
      return NextResponse.json({ error: FRIENDS.REQUEST_NOT_FOUND }, { status: 404 })
    }

    if (friendship.friend_id !== user.id) {
      return NextResponse.json({ error: FRIENDS.NOT_AUTHORIZED }, { status: 403 })
    }

    // Update the original row to accepted
    const { error: updateError } = await supabase
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('id', friendshipId)

    if (updateError) {
      console.error('Failed to accept friend request:', updateError)
      return NextResponse.json({ error: 'Failed to accept friend request' }, { status: 500 })
    }

    // Insert the reverse row (my -> them, accepted)
    // Use upsert with ON CONFLICT DO NOTHING to handle race conditions
    const { error: reverseError } = await supabase
      .from('friendships')
      .upsert(
        { user_id: user.id, friend_id: friendship.user_id, status: 'accepted' },
        { onConflict: 'user_id,friend_id', ignoreDuplicates: true },
      )

    if (reverseError) {
      console.error('Failed to insert reverse friendship row:', reverseError)
      // Revert the original update to maintain consistency
      await supabase.from('friendships').update({ status: 'pending' }).eq('id', friendshipId)
      return NextResponse.json({ error: 'Failed to accept friend request' }, { status: 500 })
    }

    // Create notification for the original sender (fire-and-forget)
    try {
      const acceptorProfile = await supabase.from('user_profiles').select('display_name').eq('id', user.id).single()

      const acceptorName = acceptorProfile.data?.display_name || 'Someone'

      const { error: notifError } = await supabase.from('notifications').insert({
        user_id: friendship.user_id,
        type: 'friend_accepted',
        title: `${acceptorName} accepted your friend request`,
        data: { friendshipId: friendship.id, acceptorId: user.id, acceptorName },
      })

      if (notifError) {
        console.error('Failed to create friend accepted notification:', notifError)
      }
    } catch (notifErr) {
      console.error('Error creating friend accepted notification:', notifErr)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Accept friend request API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
