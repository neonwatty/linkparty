import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { validateOrigin } from '@/lib/csrf'

/**
 * Shared utilities for API routes that perform write operations
 * using the Supabase service role key.
 */

export type CallerIdentity = { userId: string; sessionId?: string } | { userId?: undefined; sessionId: string }

/** Create a Supabase client with the service role key, or return an error response. */
export function createServiceClient():
  | { supabase: SupabaseClient; error?: undefined }
  | { supabase?: undefined; error: NextResponse } {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('FATAL: Supabase service role key not configured')
    return { error: NextResponse.json({ error: 'Server configuration error' }, { status: 500 }) }
  }

  return { supabase: createClient(supabaseUrl, supabaseServiceKey) }
}

/**
 * Extract caller identity from the request.
 * If a Bearer token is present and valid, returns the authenticated userId.
 * Otherwise, falls back to the sessionId from the request body.
 */
export async function getCallerIdentity(
  request: NextRequest,
  supabase: SupabaseClient,
  bodySessionId: string,
): Promise<CallerIdentity> {
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '')
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser(token)
      if (user) {
        return { userId: user.id, sessionId: bodySessionId }
      }
    } catch {
      // Token invalid — fall through to session-based identity
    }
  }
  return { sessionId: bodySessionId }
}

/** Verify the party exists and is not expired. Returns the party or an error response. */
export async function validateParty(
  supabase: SupabaseClient,
  partyId: string,
): Promise<
  { party: { id: string; expires_at: string }; error?: undefined } | { party?: undefined; error: NextResponse }
> {
  const { data: party, error: partyError } = await supabase
    .from('parties')
    .select('id, expires_at')
    .eq('id', partyId)
    .single()

  if (partyError || !party) {
    return { error: NextResponse.json({ error: 'Party not found' }, { status: 404 }) }
  }

  if (new Date(party.expires_at) < new Date()) {
    return { error: NextResponse.json({ error: 'This party has expired' }, { status: 410 }) }
  }

  return { party }
}

/**
 * Verify the caller is a member of the party.
 * Checks by userId (if authenticated) or sessionId.
 */
export async function validateMembership(
  supabase: SupabaseClient,
  partyId: string,
  identity: CallerIdentity,
): Promise<{ member: { id: string }; error?: undefined } | { member?: undefined; error: NextResponse }> {
  let query = supabase.from('party_members').select('id').eq('party_id', partyId)

  if (identity.userId) {
    query = query.eq('user_id', identity.userId)
  } else {
    query = query.eq('session_id', identity.sessionId)
  }

  const { data: member, error: memberError } = await query.maybeSingle()

  if (memberError) {
    console.error('Failed to verify party membership:', memberError)
    return { error: NextResponse.json({ error: 'Failed to verify membership' }, { status: 500 }) }
  }

  if (!member) {
    return { error: NextResponse.json({ error: 'You must be a member of this party' }, { status: 403 }) }
  }

  return { member }
}

/** Standard CSRF + body parsing + validation pipeline for write routes. */
export async function parseAndValidateRequest<T>(
  request: NextRequest,
  validate: (body: T) => string | null,
): Promise<{ body: T; error?: undefined } | { body?: undefined; error: NextResponse }> {
  if (!validateOrigin(request)) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  let body: T
  try {
    body = await request.json()
  } catch {
    return { error: NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) }
  }

  const validationError = validate(body)
  if (validationError) {
    return { error: NextResponse.json({ error: validationError }, { status: 400 }) }
  }

  return { body }
}
