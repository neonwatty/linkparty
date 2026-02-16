import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

interface EmailEvent {
  id: string
  event_type: string
  email_id: string
  recipient: string
  subject: string | null
  metadata: Record<string, unknown>
  created_at: string
}

interface EmailStats {
  total: number
  sent: number
  delivered: number
  bounced: number
  opened: number
  clicked: number
  deliveryRate: number
  openRate: number
}

export async function GET(request: NextRequest) {
  // Verify the caller is authenticated using the anon key client (respects auth)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  // Extract the access token from the Authorization header
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const {
    data: { user },
  } = await authClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Parse query parameters
  const searchParams = request.nextUrl.searchParams
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
  const offset = parseInt(searchParams.get('offset') || '0')
  const eventType = searchParams.get('type')
  const recipient = searchParams.get('recipient')

  try {
    // Build query
    let query = supabase
      .from('email_events')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (eventType) {
      query = query.eq('event_type', eventType)
    }
    if (recipient) {
      query = query.ilike('recipient', `%${recipient}%`)
    }

    const { data: events, error, count } = await query

    if (error) {
      console.error('Failed to fetch email events:', error)
      return NextResponse.json({ error: 'Failed to fetch email events' }, { status: 500 })
    }

    // Get stats (aggregate counts by event type)
    const { data: statsData, error: statsError } = await supabase.from('email_events').select('event_type')

    if (statsError) {
      console.error('Failed to fetch email stats:', statsError)
    }

    // Calculate stats
    const stats: EmailStats = {
      total: statsData?.length || 0,
      sent: 0,
      delivered: 0,
      bounced: 0,
      opened: 0,
      clicked: 0,
      deliveryRate: 0,
      openRate: 0,
    }

    statsData?.forEach((event) => {
      switch (event.event_type) {
        case 'email.sent':
          stats.sent++
          break
        case 'email.delivered':
          stats.delivered++
          break
        case 'email.bounced':
          stats.bounced++
          break
        case 'email.opened':
          stats.opened++
          break
        case 'email.clicked':
          stats.clicked++
          break
      }
    })

    // Calculate rates
    if (stats.sent > 0) {
      stats.deliveryRate = Math.round((stats.delivered / stats.sent) * 100)
      stats.openRate = Math.round((stats.opened / stats.delivered) * 100) || 0
    }

    return NextResponse.json({
      events: events as EmailEvent[],
      total: count,
      stats,
    })
  } catch (err) {
    console.error('Email events API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
