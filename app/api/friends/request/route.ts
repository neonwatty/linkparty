import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { FRIENDS } from '@/lib/errorMessages'

// Required for Capacitor static export (output: 'export')
export const dynamic = 'force-static'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { friendId } = body

    // Validate friendId format
    if (!friendId || typeof friendId !== 'string' || !UUID_REGEX.test(friendId)) {
      return NextResponse.json({ error: 'Missing or invalid friendId' }, { status: 400 })
    }

    // Get Supabase client with service role key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      console.warn('Supabase service role key not configured')
      return NextResponse.json(
        { success: true, skipped: true, message: 'Server-side validation skipped (no service key)' },
        { status: 200 },
      )
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

    // Cannot friend self
    if (friendId === user.id) {
      return NextResponse.json({ error: FRIENDS.CANNOT_FRIEND_SELF }, { status: 400 })
    }

    // Verify target user exists in user_profiles
    const { data: targetProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('id', friendId)
      .single()

    if (profileError || !targetProfile) {
      return NextResponse.json({ error: FRIENDS.USER_NOT_FOUND }, { status: 404 })
    }

    // Check for existing friendship rows in either direction
    const { data: existing, error: existingError } = await supabase
      .from('friendships')
      .select('*')
      .or(`and(user_id.eq.${user.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${user.id})`)

    if (existingError) {
      console.error('Failed to check existing friendships:', existingError)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    if (existing && existing.length > 0) {
      for (const row of existing) {
        if (row.status === 'accepted') {
          return NextResponse.json({ error: FRIENDS.ALREADY_FRIENDS }, { status: 409 })
        }
        if (row.status === 'pending' && row.user_id === user.id) {
          return NextResponse.json({ error: FRIENDS.REQUEST_EXISTS }, { status: 409 })
        }
        if (row.status === 'pending' && row.user_id === friendId) {
          return NextResponse.json({ error: FRIENDS.REQUEST_INCOMING }, { status: 409 })
        }
      }
    }

    // Insert the friend request — unique constraint handles race conditions
    const { data: friendship, error: insertError } = await supabase
      .from('friendships')
      .insert({ user_id: user.id, friend_id: friendId, status: 'pending' })
      .select()
      .single()

    if (insertError) {
      // Unique constraint violation — race condition (simultaneous cross-requests)
      if (insertError.code === '23505') {
        return NextResponse.json({ error: FRIENDS.REQUEST_EXISTS }, { status: 409 })
      }
      console.error('Failed to insert friend request:', insertError)
      return NextResponse.json({ error: 'Failed to send friend request' }, { status: 500 })
    }

    // Create notification for the recipient (fire-and-forget)
    try {
      const senderProfile = await supabase.from('user_profiles').select('display_name').eq('id', user.id).single()

      const senderName = senderProfile.data?.display_name || 'Someone'

      const { error: notifError } = await supabase.from('notifications').insert({
        user_id: friendId,
        type: 'friend_request',
        title: `${senderName} sent you a friend request`,
        data: { friendshipId: friendship.id, senderId: user.id, senderName },
      })

      if (notifError) {
        console.error('Failed to create friend request notification:', notifError)
      }
    } catch (notifErr) {
      console.error('Error creating friend request notification:', notifErr)
    }

    return NextResponse.json({ success: true, friendship })
  } catch (err) {
    console.error('Friend request API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
