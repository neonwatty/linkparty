import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Required for Capacitor static export (output: 'export')
export const dynamic = 'force-static'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId } = body

    if (!userId || typeof userId !== 'string' || !UUID_REGEX.test(userId)) {
      return NextResponse.json({ error: 'Missing or invalid userId' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Authenticate
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

    if (userId === user.id) {
      return NextResponse.json({ error: 'You cannot block yourself' }, { status: 400 })
    }

    // Insert block (unique constraint handles duplicates)
    const { error: blockError } = await supabase.from('user_blocks').insert({
      blocker_id: user.id,
      blocked_id: userId,
    })

    if (blockError) {
      if (blockError.code === '23505') {
        return NextResponse.json({ error: 'User is already blocked' }, { status: 409 })
      }
      console.error('Failed to block user:', blockError)
      return NextResponse.json({ error: 'Failed to block user' }, { status: 500 })
    }

    // Remove any existing friendship between the two users
    const { error: deleteError } = await supabase
      .from('friendships')
      .delete()
      .or(`and(user_id.eq.${user.id},friend_id.eq.${userId}),and(user_id.eq.${userId},friend_id.eq.${user.id})`)

    if (deleteError) {
      console.error('Failed to remove friendship after block:', deleteError)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Block user API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId || !UUID_REGEX.test(userId)) {
      return NextResponse.json({ error: 'Missing or invalid userId' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Authenticate
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

    const { error: deleteError } = await supabase
      .from('user_blocks')
      .delete()
      .eq('blocker_id', user.id)
      .eq('blocked_id', userId)

    if (deleteError) {
      console.error('Failed to unblock user:', deleteError)
      return NextResponse.json({ error: 'Failed to unblock user' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Unblock user API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
