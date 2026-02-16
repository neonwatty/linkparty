import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { LIMITS } from '@/lib/errorMessages'
import { validateOrigin } from '@/lib/csrf'

export const dynamic = 'force-dynamic'

/**
 * Server-side rate limiting for queue items
 *
 * Limits:
 * - 10 items per minute per session
 * - 100 items maximum per party queue
 */

// Rate limit configuration
const RATE_LIMIT = {
  maxItems: 10,
  windowMs: 60 * 1000, // 1 minute
}

const QUEUE_LIMIT = 100 // Max items per party
const IMAGE_LIMIT = 20 // Max images per party

// In-memory rate limit storage (use Redis in production for multi-instance)
const rateLimitMap = new Map<string, { timestamps: number[] }>()

interface QueueItemRequest {
  partyId: string
  sessionId: string
  type: 'youtube' | 'tweet' | 'reddit' | 'note' | 'image'
  status: 'pending' | 'showing'
  position: number
  addedByName: string
  // Optional fields based on type
  title?: string
  channel?: string
  duration?: string
  thumbnail?: string
  tweetAuthor?: string
  tweetHandle?: string
  tweetContent?: string
  tweetTimestamp?: string
  subreddit?: string
  redditTitle?: string
  redditBody?: string
  upvotes?: number
  commentCount?: number
  noteContent?: string
  imageName?: string
  imageUrl?: string
  imageStoragePath?: string
  imageCaption?: string
  dueDate?: string
}

/**
 * Check and update rate limit for a session
 * @returns Object with isLimited flag and retryAfterMs
 */
function checkRateLimit(sessionId: string): { isLimited: boolean; retryAfterMs: number } {
  // P3: Lazy cleanup instead of setInterval
  maybeLazyCleanup()

  const now = Date.now()
  const key = `queue:${sessionId}`

  // Get or create entry
  let entry = rateLimitMap.get(key)
  if (!entry) {
    entry = { timestamps: [] }
    rateLimitMap.set(key, entry)
  }

  // Clean up expired timestamps
  entry.timestamps = entry.timestamps.filter((ts) => now - ts < RATE_LIMIT.windowMs)

  // Check if rate limited
  if (entry.timestamps.length >= RATE_LIMIT.maxItems) {
    const oldestTimestamp = Math.min(...entry.timestamps)
    const retryAfterMs = Math.max(0, RATE_LIMIT.windowMs - (now - oldestTimestamp))
    return { isLimited: true, retryAfterMs }
  }

  return { isLimited: false, retryAfterMs: 0 }
}

/**
 * Record a successful action for rate limiting
 */
function recordAction(sessionId: string): void {
  const key = `queue:${sessionId}`
  const entry = rateLimitMap.get(key) || { timestamps: [] }
  entry.timestamps.push(Date.now())
  rateLimitMap.set(key, entry)
}

/**
 * Clean up old rate limit entries.
 * P3: Called lazily every 100th check instead of via setInterval
 * (setInterval is unreliable in serverless environments).
 */
let rateLimitCheckCount = 0

function cleanupRateLimitMap(): void {
  const now = Date.now()
  for (const [key, entry] of rateLimitMap.entries()) {
    entry.timestamps = entry.timestamps.filter((ts) => now - ts < RATE_LIMIT.windowMs)
    if (entry.timestamps.length === 0) {
      rateLimitMap.delete(key)
    }
  }
}

function maybeLazyCleanup(): void {
  rateLimitCheckCount++
  if (rateLimitCheckCount >= 100) {
    rateLimitCheckCount = 0
    cleanupRateLimitMap()
  }
}

/**
 * Validate queue item request
 */
function validateRequest(body: QueueItemRequest): string | null {
  if (!body.partyId || typeof body.partyId !== 'string') {
    return 'Missing or invalid partyId'
  }

  if (!body.sessionId || typeof body.sessionId !== 'string') {
    return 'Missing or invalid sessionId'
  }

  const validTypes = ['youtube', 'tweet', 'reddit', 'note', 'image']
  if (!body.type || !validTypes.includes(body.type)) {
    return 'Missing or invalid type'
  }

  const validStatuses = ['pending', 'showing']
  if (!body.status || !validStatuses.includes(body.status)) {
    return 'Missing or invalid status'
  }

  if (typeof body.position !== 'number' || body.position < 0) {
    return 'Missing or invalid position'
  }

  if (!body.addedByName || typeof body.addedByName !== 'string') {
    return 'Missing or invalid addedByName'
  }

  // Type-specific validation
  if (body.type === 'note' && !body.noteContent?.trim()) {
    return 'Note content is required for note type'
  }

  if (body.type === 'image' && !body.imageUrl) {
    return 'Image URL is required for image type'
  }

  return null
}

export async function POST(request: NextRequest) {
  try {
    if (!validateOrigin(request)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body: QueueItemRequest = await request.json()

    // Validate request
    const validationError = validateRequest(body)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    // Check rate limit
    const { isLimited, retryAfterMs } = checkRateLimit(body.sessionId)
    if (isLimited) {
      const retryAfterSec = Math.ceil(retryAfterMs / 1000)
      return NextResponse.json(
        {
          error: 'Rate limit exceeded. Too many items added.',
          retryAfter: retryAfterSec,
        },
        {
          status: 429,
          headers: {
            'Retry-After': retryAfterSec.toString(),
          },
        },
      )
    }

    // Get Supabase client with service role key for server-side operations
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('FATAL: Supabase service role key not configured')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verify party exists and is not expired
    const { data: party, error: partyError } = await supabase
      .from('parties')
      .select('id, expires_at')
      .eq('id', body.partyId)
      .single()

    if (partyError || !party) {
      return NextResponse.json({ error: 'Party not found' }, { status: 404 })
    }

    if (new Date(party.expires_at) < new Date()) {
      return NextResponse.json({ error: 'This party has expired' }, { status: 410 })
    }

    // S7: Verify the requesting user is a member of this party
    const { data: member, error: memberError } = await supabase
      .from('party_members')
      .select('id')
      .eq('party_id', body.partyId)
      .eq('session_id', body.sessionId)
      .maybeSingle()

    if (memberError) {
      console.error('Failed to verify party membership:', memberError)
      return NextResponse.json({ error: 'Failed to verify membership' }, { status: 500 })
    }

    if (!member) {
      return NextResponse.json({ error: 'You must be a member of this party to add items' }, { status: 403 })
    }

    // Check queue size limit
    const { count, error: countError } = await supabase
      .from('queue_items')
      .select('*', { count: 'exact', head: true })
      .eq('party_id', body.partyId)
      .neq('status', 'shown')

    if (countError) {
      console.error('Failed to count queue items:', countError)
      return NextResponse.json({ error: 'Failed to check queue size' }, { status: 500 })
    }

    if ((count ?? 0) >= QUEUE_LIMIT) {
      return NextResponse.json({ error: `Queue is full. Maximum ${QUEUE_LIMIT} items allowed.` }, { status: 400 })
    }

    // Check image limit
    if (body.type === 'image') {
      const { count: imageCount, error: imageCountError } = await supabase
        .from('queue_items')
        .select('*', { count: 'exact', head: true })
        .eq('party_id', body.partyId)
        .eq('type', 'image')

      if (imageCountError) {
        console.error('Failed to count images:', imageCountError)
        return NextResponse.json({ error: 'Failed to check image limit' }, { status: 500 })
      }

      if ((imageCount ?? 0) >= IMAGE_LIMIT) {
        return NextResponse.json({ error: LIMITS.MAX_IMAGES }, { status: 400 })
      }
    }

    // Insert the queue item
    const dbItem = {
      party_id: body.partyId,
      type: body.type,
      status: body.status,
      position: body.position,
      added_by_name: body.addedByName,
      added_by_session_id: body.sessionId,
      title: body.title ?? null,
      channel: body.channel ?? null,
      duration: body.duration ?? null,
      thumbnail: body.thumbnail ?? null,
      tweet_author: body.tweetAuthor ?? null,
      tweet_handle: body.tweetHandle ?? null,
      tweet_content: body.tweetContent ?? null,
      tweet_timestamp: body.tweetTimestamp ?? null,
      subreddit: body.subreddit ?? null,
      reddit_title: body.redditTitle ?? null,
      reddit_body: body.redditBody ?? null,
      upvotes: body.upvotes ?? null,
      comment_count: body.commentCount ?? null,
      note_content: body.noteContent ?? null,
      image_name: body.imageName ?? null,
      image_url: body.imageUrl ?? null,
      image_storage_path: body.imageStoragePath ?? null,
      image_caption: body.imageCaption ?? null,
      due_date: body.dueDate ?? null,
      is_completed: false,
    }

    const { data: insertedItem, error: insertError } = await supabase
      .from('queue_items')
      .insert(dbItem)
      .select()
      .single()

    if (insertError) {
      console.error('Failed to insert queue item:', insertError)
      return NextResponse.json({ error: 'Failed to add item to queue' }, { status: 500 })
    }

    // Record the action for rate limiting
    recordAction(body.sessionId)

    return NextResponse.json({
      success: true,
      item: insertedItem,
    })
  } catch (err) {
    console.error('Queue items API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
