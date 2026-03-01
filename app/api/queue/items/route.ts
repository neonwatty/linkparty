import { NextRequest, NextResponse } from 'next/server'
import { LIMITS } from '@/lib/errorMessages'
import {
  createServiceClient,
  getCallerIdentity,
  validateParty,
  validateMembership,
  parseAndValidateRequest,
} from '@/lib/apiHelpers'
import { createRateLimiter } from '@/lib/serverRateLimit'
import { QUEUE_LIMIT, IMAGE_LIMIT, QUEUE_RATE_LIMIT, QUEUE_RATE_WINDOW_MS } from '@/lib/partyLimits'

export const dynamic = 'force-dynamic'

/**
 * Server-side rate limiting for queue items
 *
 * Limits:
 * - 10 items per minute per session
 * - 100 items maximum per party queue
 */

const rateLimiter = createRateLimiter({ maxRequests: QUEUE_RATE_LIMIT, windowMs: QUEUE_RATE_WINDOW_MS })

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

  // Server-side text length limits (prevents oversized payloads)
  const TEXT_LIMITS: Record<string, number> = {
    addedByName: 100,
    title: 500,
    channel: 200,
    duration: 20,
    tweetAuthor: 200,
    tweetHandle: 100,
    tweetContent: 2000,
    tweetTimestamp: 100,
    subreddit: 100,
    redditTitle: 500,
    redditBody: 5000,
    noteContent: 5000,
    imageCaption: 500,
    imageName: 255,
    imageUrl: 2048,
    imageStoragePath: 500,
  }

  for (const [field, maxLen] of Object.entries(TEXT_LIMITS)) {
    const value = body[field as keyof QueueItemRequest]
    if (typeof value === 'string' && value.length > maxLen) {
      return `${field} exceeds maximum length of ${maxLen} characters`
    }
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
    // CSRF + body parsing + validation
    const parsed = await parseAndValidateRequest<QueueItemRequest>(request, validateRequest)
    if (parsed.error) return parsed.error
    const body = parsed.body

    // Check rate limit (keyed on client IP to prevent spoofing)
    const clientIp =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown'
    const { limited, retryAfterMs } = rateLimiter.check(clientIp)
    if (limited) {
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

    // Service client
    const { supabase, error: clientError } = createServiceClient()
    if (clientError) return clientError

    // Verify party exists and is not expired
    const { error: partyError } = await validateParty(supabase, body.partyId)
    if (partyError) return partyError

    // Verify membership
    const identity = await getCallerIdentity(request, supabase, body.sessionId)
    const { error: memberError } = await validateMembership(supabase, body.partyId, identity)
    if (memberError) return memberError

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

    // Compute next position server-side (ignore client-supplied position)
    const { data: maxPosRow } = await supabase
      .from('queue_items')
      .select('position')
      .eq('party_id', body.partyId)
      .order('position', { ascending: false })
      .limit(1)
      .maybeSingle()

    const nextPosition = (maxPosRow?.position ?? -1) + 1

    // Insert the queue item
    const dbItem = {
      party_id: body.partyId,
      type: body.type,
      status: body.status,
      position: nextPosition,
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

    return NextResponse.json({
      success: true,
      item: insertedItem,
    })
  } catch (err) {
    console.error('Queue items API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
