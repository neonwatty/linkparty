import { NextRequest, NextResponse } from 'next/server'
import {
  parseAndValidateRequest,
  createServiceClient,
  validateParty,
  getCallerIdentity,
  validateMembership,
} from '@/lib/apiHelpers'

export const dynamic = 'force-dynamic'

interface AdvanceQueueRequest {
  partyId: string
  sessionId: string
  showingItemId?: string
  firstPendingItemId?: string
}

function validate(body: AdvanceQueueRequest): string | null {
  if (!body.partyId || typeof body.partyId !== 'string') {
    return 'Missing or invalid partyId'
  }

  if (!body.sessionId || typeof body.sessionId !== 'string') {
    return 'Missing or invalid sessionId'
  }

  if (body.showingItemId !== undefined && typeof body.showingItemId !== 'string') {
    return 'Invalid showingItemId'
  }

  if (body.firstPendingItemId !== undefined && typeof body.firstPendingItemId !== 'string') {
    return 'Invalid firstPendingItemId'
  }

  if (!body.showingItemId && !body.firstPendingItemId) {
    return 'At least one of showingItemId or firstPendingItemId must be provided'
  }

  return null
}

export async function POST(request: NextRequest) {
  try {
    // 1. CSRF + body parsing + validation
    const parsed = await parseAndValidateRequest<AdvanceQueueRequest>(request, validate)
    if (parsed.error) return parsed.error

    const { body } = parsed

    // 2. Create service client
    const { supabase, error: clientError } = createServiceClient()
    if (clientError) return clientError

    // 3. Validate party exists and is not expired
    const { error: partyError } = await validateParty(supabase, body.partyId)
    if (partyError) return partyError

    // 4. Get caller identity (authenticated user or session-based)
    const identity = await getCallerIdentity(request, supabase, body.sessionId)

    // 5. Validate membership
    const { error: memberError } = await validateMembership(supabase, body.partyId, identity)
    if (memberError) return memberError

    // 6. Execute status transitions
    if (body.showingItemId) {
      const { error: showingError } = await supabase
        .from('queue_items')
        .update({ status: 'shown' })
        .eq('id', body.showingItemId)

      if (showingError) {
        console.error('Failed to mark item as shown:', showingError)
        return NextResponse.json({ error: 'Failed to advance queue' }, { status: 500 })
      }
    }

    if (body.firstPendingItemId) {
      const { error: pendingError } = await supabase
        .from('queue_items')
        .update({ status: 'showing' })
        .eq('id', body.firstPendingItemId)

      if (pendingError) {
        console.error('Failed to mark item as showing:', pendingError)
        return NextResponse.json({ error: 'Failed to advance queue' }, { status: 500 })
      }
    }

    // 7. Return success
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Advance queue API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
