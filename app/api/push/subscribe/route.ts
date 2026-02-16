import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { sessionId, subscription } = await request.json()

    if (!sessionId || !subscription?.endpoint) {
      return NextResponse.json({ error: 'Missing sessionId or subscription' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
    }

    // Authenticate user from Bearer token
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const token = authHeader.replace('Bearer ', '')
    const supabaseAuth = createClient(supabaseUrl, supabaseServiceKey)
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verify session belongs to this user
    const { data: memberRecord } = await supabase
      .from('party_members')
      .select('id')
      .eq('session_id', sessionId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!memberRecord) {
      return NextResponse.json({ error: 'Session does not belong to this user' }, { status: 403 })
    }

    const { error } = await supabase.from('push_tokens').upsert(
      {
        session_id: sessionId,
        token: JSON.stringify(subscription),
        platform: 'web',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'session_id' },
    )

    if (error) {
      console.error('Failed to save push subscription:', error)
      return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Push subscribe error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { sessionId } = await request.json()

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
    }

    // Authenticate user from Bearer token
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const token = authHeader.replace('Bearer ', '')
    const supabaseAuth = createClient(supabaseUrl, supabaseServiceKey)
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verify session belongs to this user
    const { data: memberRecord } = await supabase
      .from('party_members')
      .select('id')
      .eq('session_id', sessionId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!memberRecord) {
      return NextResponse.json({ error: 'Session does not belong to this user' }, { status: 403 })
    }

    const { error } = await supabase.from('push_tokens').delete().eq('session_id', sessionId)

    if (error) {
      console.error('Failed to delete push subscription:', error)
      return NextResponse.json({ error: 'Failed to delete subscription' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Push unsubscribe error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
