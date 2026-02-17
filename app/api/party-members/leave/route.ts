import { NextRequest, NextResponse } from 'next/server'
import {
  parseAndValidateRequest,
  createServiceClient,
  validateParty,
  getCallerIdentity,
  validateMembership,
} from '@/lib/apiHelpers'

export const dynamic = 'force-dynamic'

interface LeavePartyBody {
  partyId: string
  sessionId: string
}

function validateLeaveBody(body: LeavePartyBody): string | null {
  if (!body.partyId || typeof body.partyId !== 'string') {
    return 'Missing or invalid partyId'
  }
  if (!body.sessionId || typeof body.sessionId !== 'string') {
    return 'Missing or invalid sessionId'
  }
  return null
}

export async function POST(request: NextRequest) {
  try {
    // 1. CSRF + body parsing + validation
    const parsed = await parseAndValidateRequest<LeavePartyBody>(request, validateLeaveBody)
    if (parsed.error) return parsed.error

    const { partyId, sessionId } = parsed.body

    // 2. Create service client
    const client = createServiceClient()
    if (client.error) return client.error

    const { supabase } = client

    // 3. Validate party exists and is not expired
    const partyResult = await validateParty(supabase, partyId)
    if (partyResult.error) return partyResult.error

    // 4. Get caller identity (authenticated user or session-based)
    const identity = await getCallerIdentity(request, supabase, sessionId)

    // 5. Verify the caller is a member of the party
    const memberResult = await validateMembership(supabase, partyId, identity)
    if (memberResult.error) return memberResult.error

    // 6. Delete the membership row
    let deleteQuery = supabase.from('party_members').delete().eq('party_id', partyId)

    if (identity.userId) {
      deleteQuery = deleteQuery.eq('user_id', identity.userId)
    } else {
      deleteQuery = deleteQuery.eq('session_id', identity.sessionId)
    }

    const { error: deleteError } = await deleteQuery

    if (deleteError) {
      console.error('Failed to delete party member:', deleteError)
      return NextResponse.json({ error: 'Failed to leave party' }, { status: 500 })
    }

    // 7. Return success
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Leave party API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
