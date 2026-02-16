import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { partyId, title, body, url, excludeSessionId } = await request.json()

    if (!partyId) {
      return NextResponse.json({ error: 'Missing partyId' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY
    const vapidContactEmail = process.env.VAPID_CONTACT_EMAIL

    if (!supabaseUrl || !supabaseServiceKey || !vapidPublicKey || !vapidPrivateKey || !vapidContactEmail) {
      return NextResponse.json({ error: 'Server not configured for push' }, { status: 500 })
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

    webpush.setVapidDetails(vapidContactEmail, vapidPublicKey, vapidPrivateKey)

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Step 1: Get session IDs of party members (excluding sender)
    let membersQuery = supabase.from('party_members').select('session_id').eq('party_id', partyId)

    if (excludeSessionId) {
      membersQuery = membersQuery.neq('session_id', excludeSessionId)
    }

    const { data: members, error: membersError } = await membersQuery

    if (membersError) {
      console.error('Failed to fetch party members:', membersError)
      return NextResponse.json({ error: 'Failed to fetch recipients' }, { status: 500 })
    }

    const memberSessionIds = (members || []).map((m) => m.session_id).filter(Boolean)

    if (memberSessionIds.length === 0) {
      return NextResponse.json({ success: true, sent: 0 })
    }

    // Step 2: Get push tokens for those members
    const { data: tokens, error: tokensError } = await supabase
      .from('push_tokens')
      .select('session_id, token')
      .in('session_id', memberSessionIds)

    if (tokensError) {
      console.error('Failed to fetch push tokens:', tokensError)
      return NextResponse.json({ error: 'Failed to fetch recipients' }, { status: 500 })
    }

    if (!tokens || tokens.length === 0) {
      return NextResponse.json({ success: true, sent: 0 })
    }

    const payload = JSON.stringify({
      title: title || 'Link Party',
      body: body || 'New item added',
      url: url || '/',
    })

    let sent = 0
    let failed = 0
    const staleTokenIds: string[] = []

    await Promise.allSettled(
      tokens.map(async (row) => {
        try {
          const subscription = JSON.parse(row.token)
          await webpush.sendNotification(subscription, payload)
          sent++
        } catch (err: unknown) {
          const statusCode = (err as { statusCode?: number }).statusCode
          if (statusCode === 410 || statusCode === 404) {
            // Subscription expired or invalid — mark for cleanup
            staleTokenIds.push(row.session_id)
          }
          failed++
        }
      }),
    )

    // Clean up stale tokens
    if (staleTokenIds.length > 0) {
      await supabase.from('push_tokens').delete().in('session_id', staleTokenIds)
    }

    // Update notification_logs for this party's pending notifications to sent
    await supabase
      .from('notification_logs')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('party_id', partyId)
      .eq('status', 'pending')

    return NextResponse.json({ success: true, sent, failed, staleRemoved: staleTokenIds.length })
  } catch (err) {
    console.error('Push send error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
