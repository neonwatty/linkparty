import { NextRequest, NextResponse } from 'next/server'
import {
  parseAndValidateRequest,
  createServiceClient,
  validateParty,
  getCallerIdentity,
  validateMembership,
} from '@/lib/apiHelpers'

export const dynamic = 'force-dynamic'

interface ReorderUpdate {
  id: string
  position: number
}

interface ReorderRequest {
  partyId: string
  sessionId: string
  updates: ReorderUpdate[]
}

function validateReorderRequest(body: ReorderRequest): string | null {
  if (!body.partyId || typeof body.partyId !== 'string') {
    return 'Missing or invalid partyId'
  }

  if (!body.sessionId || typeof body.sessionId !== 'string') {
    return 'Missing or invalid sessionId'
  }

  if (!Array.isArray(body.updates) || body.updates.length === 0) {
    return 'Missing or empty updates array'
  }

  for (const update of body.updates) {
    if (!update.id || typeof update.id !== 'string') {
      return 'Each update must have a string id'
    }
    if (typeof update.position !== 'number') {
      return 'Each update must have a number position'
    }
  }

  return null
}

export async function POST(request: NextRequest) {
  try {
    // 1. CSRF + body parsing + validation
    const parsed = await parseAndValidateRequest<ReorderRequest>(request, validateReorderRequest)
    if (parsed.error) return parsed.error
    const { body } = parsed

    // 2. Create service client
    const client = createServiceClient()
    if (client.error) return client.error
    const { supabase } = client

    // 3. Validate party exists and is not expired
    const partyResult = await validateParty(supabase, body.partyId)
    if (partyResult.error) return partyResult.error

    // 4. Get caller identity (authenticated user or session-based)
    const identity = await getCallerIdentity(request, supabase, body.sessionId)

    // 5. Validate membership
    const memberResult = await validateMembership(supabase, body.partyId, identity)
    if (memberResult.error) return memberResult.error

    // 6. Execute batch reorder via RPC (single atomic database call)
    const { error: rpcError } = await supabase.rpc('batch_reorder_queue_items', {
      p_party_id: body.partyId,
      p_updates: body.updates,
    })

    if (rpcError) {
      console.error('Batch reorder RPC failed:', rpcError)
      return NextResponse.json({ error: 'Reorder failed' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Queue reorder API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
