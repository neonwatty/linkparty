import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { FRIENDS } from '@/lib/errorMessages'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string }> }

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params

    // Validate friendship id format
    if (!id || !UUID_REGEX.test(id)) {
      return NextResponse.json({ error: 'Missing or invalid friendship id' }, { status: 400 })
    }

    // Validate action query param
    const action = request.nextUrl.searchParams.get('action')
    if (!action || !['decline', 'cancel', 'unfriend'].includes(action)) {
      return NextResponse.json({ error: FRIENDS.INVALID_ACTION }, { status: 400 })
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
    const { data: friendship, error: fetchError } = await supabase.from('friendships').select('*').eq('id', id).single()

    if (fetchError || !friendship) {
      return NextResponse.json({ error: FRIENDS.REQUEST_NOT_FOUND }, { status: 404 })
    }

    // Validate based on action type
    if (action === 'decline') {
      // Decline: must be pending, current user must be the recipient (friend_id)
      if (friendship.status !== 'pending') {
        return NextResponse.json({ error: FRIENDS.REQUEST_NOT_FOUND }, { status: 404 })
      }
      if (friendship.friend_id !== user.id) {
        return NextResponse.json({ error: FRIENDS.NOT_AUTHORIZED }, { status: 403 })
      }

      const { error: deleteError } = await supabase.from('friendships').delete().eq('id', id)

      if (deleteError) {
        console.error('Failed to decline friend request:', deleteError)
        return NextResponse.json({ error: 'Failed to decline friend request' }, { status: 500 })
      }
    } else if (action === 'cancel') {
      // Cancel: must be pending, current user must be the sender (user_id)
      if (friendship.status !== 'pending') {
        return NextResponse.json({ error: FRIENDS.REQUEST_NOT_FOUND }, { status: 404 })
      }
      if (friendship.user_id !== user.id) {
        return NextResponse.json({ error: FRIENDS.NOT_AUTHORIZED }, { status: 403 })
      }

      const { error: deleteError } = await supabase.from('friendships').delete().eq('id', id)

      if (deleteError) {
        console.error('Failed to cancel friend request:', deleteError)
        return NextResponse.json({ error: 'Failed to cancel friend request' }, { status: 500 })
      }
    } else if (action === 'unfriend') {
      // Unfriend: must be accepted, current user must be either side
      if (friendship.status !== 'accepted') {
        return NextResponse.json({ error: FRIENDS.REQUEST_NOT_FOUND }, { status: 404 })
      }
      if (friendship.user_id !== user.id && friendship.friend_id !== user.id) {
        return NextResponse.json({ error: FRIENDS.NOT_AUTHORIZED }, { status: 403 })
      }

      // Determine the other user
      const otherUserId = friendship.user_id === user.id ? friendship.friend_id : friendship.user_id

      // Delete the found row
      const { error: deleteError } = await supabase.from('friendships').delete().eq('id', id)

      if (deleteError) {
        console.error('Failed to delete friendship row:', deleteError)
        return NextResponse.json({ error: 'Failed to unfriend' }, { status: 500 })
      }

      // Delete the reverse row
      const { error: reverseDeleteError } = await supabase
        .from('friendships')
        .delete()
        .eq('user_id', otherUserId)
        .eq('friend_id', user.id)

      if (reverseDeleteError) {
        console.error('Failed to delete reverse friendship row:', reverseDeleteError)
        // The primary row was already deleted; log but don't fail
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Friend delete API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
