import { NextRequest, NextResponse } from 'next/server'
import {
  createServiceClient,
  getCallerIdentity,
  validateParty,
  validateMembership,
  parseAndValidateRequest,
} from '@/lib/apiHelpers'

export const dynamic = 'force-dynamic'

interface PatchBody {
  partyId: string
  sessionId: string
  action: 'updatePosition' | 'updateNote' | 'toggleComplete' | 'updateDueDate'
  position?: number
  noteContent?: string
  isCompleted?: boolean
  completedAt?: string | null
  completedByUserId?: string | null
  dueDate?: string | null
}

interface DeleteBody {
  partyId: string
  sessionId: string
}

const VALID_ACTIONS = ['updatePosition', 'updateNote', 'toggleComplete', 'updateDueDate'] as const

function validatePatchBody(body: PatchBody): string | null {
  if (!body.partyId || typeof body.partyId !== 'string') {
    return 'Missing or invalid partyId'
  }
  if (!body.sessionId || typeof body.sessionId !== 'string') {
    return 'Missing or invalid sessionId'
  }
  if (!body.action || !VALID_ACTIONS.includes(body.action)) {
    return 'Missing or invalid action'
  }

  switch (body.action) {
    case 'updatePosition':
      if (typeof body.position !== 'number') {
        return 'Missing or invalid position'
      }
      break
    case 'updateNote':
      if (typeof body.noteContent !== 'string') {
        return 'Missing or invalid noteContent'
      }
      break
    case 'toggleComplete':
      if (typeof body.isCompleted !== 'boolean') {
        return 'Missing or invalid isCompleted'
      }
      break
    case 'updateDueDate':
      // dueDate can be a string or null — lenient validation
      break
  }

  return null
}

function validateDeleteBody(body: DeleteBody): string | null {
  if (!body.partyId || typeof body.partyId !== 'string') {
    return 'Missing or invalid partyId'
  }
  if (!body.sessionId || typeof body.sessionId !== 'string') {
    return 'Missing or invalid sessionId'
  }
  return null
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const parsed = await parseAndValidateRequest<PatchBody>(request, validatePatchBody)
    if (parsed.error) return parsed.error
    const body = parsed.body

    const svc = createServiceClient()
    if (svc.error) return svc.error
    const supabase = svc.supabase

    const partyResult = await validateParty(supabase, body.partyId)
    if (partyResult.error) return partyResult.error

    const identity = await getCallerIdentity(request, supabase, body.sessionId)

    const memberResult = await validateMembership(supabase, body.partyId, identity)
    if (memberResult.error) return memberResult.error

    // Execute the action-specific mutation
    let updateData: Record<string, unknown>

    switch (body.action) {
      case 'updatePosition':
        updateData = { position: body.position }
        break
      case 'updateNote':
        updateData = { note_content: body.noteContent }
        break
      case 'toggleComplete':
        updateData = {
          is_completed: body.isCompleted,
          completed_at: body.isCompleted ? body.completedAt || new Date().toISOString() : null,
          completed_by_user_id: body.isCompleted ? body.completedByUserId || null : null,
        }
        break
      case 'updateDueDate':
        updateData = { due_date: body.dueDate }
        break
    }

    const { error: updateError } = await supabase.from('queue_items').update(updateData).eq('id', id)

    if (updateError) {
      console.error('Failed to update queue item:', updateError)
      return NextResponse.json({ error: 'Failed to update item' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Queue item PATCH error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const parsed = await parseAndValidateRequest<DeleteBody>(request, validateDeleteBody)
    if (parsed.error) return parsed.error
    const body = parsed.body

    const svc = createServiceClient()
    if (svc.error) return svc.error
    const supabase = svc.supabase

    const partyResult = await validateParty(supabase, body.partyId)
    if (partyResult.error) return partyResult.error

    const identity = await getCallerIdentity(request, supabase, body.sessionId)

    const memberResult = await validateMembership(supabase, body.partyId, identity)
    if (memberResult.error) return memberResult.error

    const { error: deleteError } = await supabase.from('queue_items').delete().eq('id', id)

    if (deleteError) {
      console.error('Failed to delete queue item:', deleteError)
      return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Queue item DELETE error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
