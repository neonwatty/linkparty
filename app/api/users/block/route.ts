import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateOrigin } from '@/lib/csrf'

export const dynamic = 'force-dynamic'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// In-memory rate limit: 20 requests per minute per user ID
const BLOCK_RATE_LIMIT = { maxRequests: 20, windowMs: 60 * 1000 }
const blockRateLimitMap = new Map<string, { timestamps: number[] }>()
let blockRateLimitCheckCount = 0

function checkBlockRateLimit(key: string): { isLimited: boolean; retryAfterMs: number } {
  blockRateLimitCheckCount++
  if (blockRateLimitCheckCount >= 100) {
    blockRateLimitCheckCount = 0
    const now = Date.now()
    for (const [k, entry] of blockRateLimitMap.entries()) {
      entry.timestamps = entry.timestamps.filter((ts) => now - ts < BLOCK_RATE_LIMIT.windowMs)
      if (entry.timestamps.length === 0) blockRateLimitMap.delete(k)
    }
  }

  const now = Date.now()
  let entry = blockRateLimitMap.get(key)
  if (!entry) {
    entry = { timestamps: [] }
    blockRateLimitMap.set(key, entry)
  }
  entry.timestamps = entry.timestamps.filter((ts) => now - ts < BLOCK_RATE_LIMIT.windowMs)

  if (entry.timestamps.length >= BLOCK_RATE_LIMIT.maxRequests) {
    const oldestTimestamp = Math.min(...entry.timestamps)
    return { isLimited: true, retryAfterMs: Math.max(0, BLOCK_RATE_LIMIT.windowMs - (now - oldestTimestamp)) }
  }

  entry.timestamps.push(now)
  return { isLimited: false, retryAfterMs: 0 }
}

export async function POST(request: NextRequest) {
  try {
    if (!validateOrigin(request)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

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

    // Rate limit by user ID
    const { isLimited, retryAfterMs } = checkBlockRateLimit(user.id)
    if (isLimited) {
      const retryAfterSec = Math.ceil(retryAfterMs / 1000)
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429, headers: { 'Retry-After': retryAfterSec.toString() } },
      )
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
    if (!validateOrigin(request)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

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
