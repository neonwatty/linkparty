import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const VALID_TYPES = ['friend_request', 'friend_accepted', 'party_invite'] as const

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, type, title, body: notifBody, data } = body

    // Validate required fields
    if (!userId || typeof userId !== 'string' || !UUID_REGEX.test(userId)) {
      return NextResponse.json({ error: 'Missing or invalid userId' }, { status: 400 })
    }

    if (!type || !VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: 'Missing or invalid type' }, { status: 400 })
    }

    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid title' }, { status: 400 })
    }

    // Get Supabase client with service role key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      console.warn('Supabase service role key not configured')
      return NextResponse.json(
        { success: true, skipped: true, message: 'Notification skipped (no service key)' },
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

    // Insert notification using service role (bypasses RLS — no INSERT policy for auth users)
    const { data: notification, error: insertError } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type,
        title,
        body: notifBody || null,
        data: data || null,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Failed to create notification:', insertError)
      return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 })
    }

    return NextResponse.json({ success: true, notification })
  } catch (err) {
    console.error('Notification API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
