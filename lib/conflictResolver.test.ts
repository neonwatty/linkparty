import { describe, it, expect, beforeEach } from 'vitest'
import type { QueueItem } from '@/hooks/useParty'
import {
  detectConflict,
  detectDeletion,
  mergeQueueState,
  pendingChanges,
  formatConflictMessage,
} from './conflictResolver'
import type { PendingChange } from './conflictResolver'

function makeQueueItem(overrides: Partial<QueueItem> = {}): QueueItem {
  return {
    id: 'item-1',
    type: 'note',
    addedBy: 'user-1',
    addedBySessionId: 'session-1',
    status: 'pending',
    position: 0,
    isCompleted: false,
    noteContent: 'Test note',
    ...overrides,
  }
}

beforeEach(() => {
  pendingChanges.clearAll()
})

describe('detectConflict', () => {
  it('returns null when server item has no updatedAt', () => {
    const local = makeQueueItem()
    const server = makeQueueItem()
    const change: PendingChange = {
      itemId: 'item-1',
      field: 'position',
      oldValue: 0,
      newValue: 1,
      timestamp: Date.now(),
    }
    expect(detectConflict(local, server, change)).toBeNull()
  })

  it('returns null when server was not updated after the pending change', () => {
    const now = Date.now()
    const local = makeQueueItem({ position: 1 })
    const server = makeQueueItem({ position: 2, updatedAt: new Date(now - 5000).toISOString() })
    const change: PendingChange = {
      itemId: 'item-1',
      field: 'position',
      oldValue: 0,
      newValue: 1,
      timestamp: now, // pending change is newer than server update
    }
    expect(detectConflict(local, server, change)).toBeNull()
  })

  it('detects position conflict', () => {
    const now = Date.now()
    const local = makeQueueItem({ position: 1 })
    const server = makeQueueItem({ position: 3, updatedAt: new Date(now + 1000).toISOString() })
    const change: PendingChange = {
      itemId: 'item-1',
      field: 'position',
      oldValue: 0,
      newValue: 1,
      timestamp: now,
    }
    const result = detectConflict(local, server, change)
    expect(result).not.toBeNull()
    expect(result!.type).toBe('position')
    expect(result!.description).toBe('Item was moved by another user')
  })

  it('returns null for position field when positions match', () => {
    const now = Date.now()
    const local = makeQueueItem({ position: 3 })
    const server = makeQueueItem({ position: 3, updatedAt: new Date(now + 1000).toISOString() })
    const change: PendingChange = {
      itemId: 'item-1',
      field: 'position',
      oldValue: 0,
      newValue: 3,
      timestamp: now,
    }
    expect(detectConflict(local, server, change)).toBeNull()
  })

  it('detects status conflict', () => {
    const now = Date.now()
    const local = makeQueueItem({ status: 'pending' })
    const server = makeQueueItem({ status: 'showing', updatedAt: new Date(now + 1000).toISOString() })
    const change: PendingChange = {
      itemId: 'item-1',
      field: 'status',
      oldValue: 'pending',
      newValue: 'showing',
      timestamp: now,
    }
    const result = detectConflict(local, server, change)
    expect(result).not.toBeNull()
    expect(result!.type).toBe('status')
    expect(result!.description).toContain('showing')
  })

  it('detects content conflict for noteContent', () => {
    const now = Date.now()
    const local = makeQueueItem({ noteContent: 'My edit' })
    const server = makeQueueItem({ noteContent: 'Their edit', updatedAt: new Date(now + 1000).toISOString() })
    const change: PendingChange = {
      itemId: 'item-1',
      field: 'noteContent',
      oldValue: 'Original',
      newValue: 'My edit',
      timestamp: now,
    }
    const result = detectConflict(local, server, change)
    expect(result).not.toBeNull()
    expect(result!.type).toBe('content')
    expect(result!.description).toBe('Note was edited by another user')
  })

  it('detects content conflict for isCompleted (marked complete)', () => {
    const now = Date.now()
    const local = makeQueueItem({ isCompleted: false })
    const server = makeQueueItem({ isCompleted: true, updatedAt: new Date(now + 1000).toISOString() })
    const change: PendingChange = {
      itemId: 'item-1',
      field: 'isCompleted',
      oldValue: false,
      newValue: true,
      timestamp: now,
    }
    const result = detectConflict(local, server, change)
    expect(result).not.toBeNull()
    expect(result!.type).toBe('content')
    expect(result!.description).toContain('marked complete')
  })

  it('detects content conflict for isCompleted (marked incomplete)', () => {
    const now = Date.now()
    const local = makeQueueItem({ isCompleted: true })
    const server = makeQueueItem({ isCompleted: false, updatedAt: new Date(now + 1000).toISOString() })
    const change: PendingChange = {
      itemId: 'item-1',
      field: 'isCompleted',
      oldValue: true,
      newValue: false,
      timestamp: now,
    }
    const result = detectConflict(local, server, change)
    expect(result).not.toBeNull()
    expect(result!.description).toContain('marked incomplete')
  })

  it('returns null when identical items have no field diff', () => {
    const now = Date.now()
    const local = makeQueueItem({ noteContent: 'Same' })
    const server = makeQueueItem({ noteContent: 'Same', updatedAt: new Date(now + 1000).toISOString() })
    const change: PendingChange = {
      itemId: 'item-1',
      field: 'noteContent',
      oldValue: 'Old',
      newValue: 'Same',
      timestamp: now,
    }
    expect(detectConflict(local, server, change)).toBeNull()
  })
})

describe('detectDeletion', () => {
  it('returns empty array when no items are missing', () => {
    const items = [makeQueueItem({ id: 'a' }), makeQueueItem({ id: 'b' })]
    const result = detectDeletion(items, items)
    expect(result).toEqual([])
  })

  it('detects deleted items that have pending changes', () => {
    const local = [makeQueueItem({ id: 'a' }), makeQueueItem({ id: 'b' })]
    const server = [makeQueueItem({ id: 'a' })]

    // Add a pending change for the item that will be "deleted"
    pendingChanges.addChange({
      itemId: 'b',
      field: 'position',
      oldValue: 1,
      newValue: 2,
      timestamp: Date.now(),
    })

    const result = detectDeletion(local, server)
    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('deleted')
    expect(result[0].itemId).toBe('b')
    expect(result[0].description).toBe('Item was deleted by another user')
  })

  it('ignores missing items without pending changes', () => {
    const local = [makeQueueItem({ id: 'a' }), makeQueueItem({ id: 'b' })]
    const server = [makeQueueItem({ id: 'a' })]

    // No pending changes for item 'b'
    const result = detectDeletion(local, server)
    expect(result).toEqual([])
  })

  it('skips mock items (mock- prefix)', () => {
    const local = [makeQueueItem({ id: 'mock-123' })]
    const server: QueueItem[] = []

    pendingChanges.addChange({
      itemId: 'mock-123',
      field: 'position',
      oldValue: 0,
      newValue: 1,
      timestamp: Date.now(),
    })

    const result = detectDeletion(local, server)
    expect(result).toEqual([])
  })

  it('skips temp items (temp- prefix)', () => {
    const local = [makeQueueItem({ id: 'temp-456' })]
    const server: QueueItem[] = []

    pendingChanges.addChange({
      itemId: 'temp-456',
      field: 'position',
      oldValue: 0,
      newValue: 1,
      timestamp: Date.now(),
    })

    const result = detectDeletion(local, server)
    expect(result).toEqual([])
  })

  it('clears pending changes for deleted items', () => {
    const local = [makeQueueItem({ id: 'x' })]
    const server: QueueItem[] = []

    pendingChanges.addChange({
      itemId: 'x',
      field: 'position',
      oldValue: 0,
      newValue: 1,
      timestamp: Date.now(),
    })

    detectDeletion(local, server)
    expect(pendingChanges.getChanges('x')).toHaveLength(0)
  })
})

describe('mergeQueueState', () => {
  it('returns server queue as merged result when no conflicts', () => {
    const local = [makeQueueItem({ id: 'a', position: 0 })]
    const server = [makeQueueItem({ id: 'a', position: 0 })]

    const { mergedQueue, conflicts } = mergeQueueState(local, server)
    expect(mergedQueue).toEqual(server)
    expect(conflicts).toEqual([])
  })

  it('uses server state as source of truth (last write wins)', () => {
    const local = [makeQueueItem({ id: 'a', position: 0 }), makeQueueItem({ id: 'b', position: 1 })]
    const server = [makeQueueItem({ id: 'b', position: 0 }), makeQueueItem({ id: 'a', position: 1 })]

    const { mergedQueue } = mergeQueueState(local, server)
    expect(mergedQueue).toEqual(server)
  })

  it('reports deletion conflicts', () => {
    const local = [makeQueueItem({ id: 'a' }), makeQueueItem({ id: 'b' })]
    const server = [makeQueueItem({ id: 'a' })]

    pendingChanges.addChange({
      itemId: 'b',
      field: 'status',
      oldValue: 'pending',
      newValue: 'showing',
      timestamp: Date.now(),
    })

    const { conflicts } = mergeQueueState(local, server)
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0].type).toBe('deleted')
  })

  it('reports field conflicts from pending changes', () => {
    const now = Date.now()
    const local = [makeQueueItem({ id: 'a', position: 1 })]
    const server = [makeQueueItem({ id: 'a', position: 5, updatedAt: new Date(now + 1000).toISOString() })]

    pendingChanges.addChange({
      itemId: 'a',
      field: 'position',
      oldValue: 0,
      newValue: 1,
      timestamp: now,
    })

    const { conflicts } = mergeQueueState(local, server)
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0].type).toBe('position')
  })

  it('handles empty queues', () => {
    const { mergedQueue, conflicts } = mergeQueueState([], [])
    expect(mergedQueue).toEqual([])
    expect(conflicts).toEqual([])
  })
})

describe('formatConflictMessage', () => {
  it('returns empty string for no conflicts', () => {
    expect(formatConflictMessage([])).toBe('')
  })

  it('returns single conflict description', () => {
    const conflicts = [
      {
        type: 'position' as const,
        itemId: '1',
        itemTitle: 'Test',
        description: 'Item was moved by another user',
      },
    ]
    expect(formatConflictMessage(conflicts)).toBe('Item was moved by another user')
  })

  it('returns summary for multiple conflicts', () => {
    const conflicts = [
      { type: 'position' as const, itemId: '1', itemTitle: 'A', description: 'Moved' },
      { type: 'status' as const, itemId: '2', itemTitle: 'B', description: 'Status changed' },
    ]
    expect(formatConflictMessage(conflicts)).toBe('2 items were updated by other users')
  })

  it('returns summary for many conflicts', () => {
    const conflicts = Array.from({ length: 5 }, (_, i) => ({
      type: 'content' as const,
      itemId: String(i),
      itemTitle: `Item ${i}`,
      description: 'Content changed',
    }))
    expect(formatConflictMessage(conflicts)).toBe('5 items were updated by other users')
  })
})

describe('pendingChanges tracker', () => {
  it('tracks and retrieves changes', () => {
    const change: PendingChange = {
      itemId: 'item-1',
      field: 'position',
      oldValue: 0,
      newValue: 1,
      timestamp: Date.now(),
    }
    pendingChanges.addChange(change)
    expect(pendingChanges.getChanges('item-1')).toHaveLength(1)
    expect(pendingChanges.hasPendingChanges()).toBe(true)
  })

  it('replaces existing change for same field', () => {
    pendingChanges.addChange({
      itemId: 'item-1',
      field: 'position',
      oldValue: 0,
      newValue: 1,
      timestamp: Date.now(),
    })
    pendingChanges.addChange({
      itemId: 'item-1',
      field: 'position',
      oldValue: 1,
      newValue: 2,
      timestamp: Date.now(),
    })
    expect(pendingChanges.getChanges('item-1')).toHaveLength(1)
    expect(pendingChanges.getChanges('item-1')[0].newValue).toBe(2)
  })

  it('tracks multiple fields for same item', () => {
    pendingChanges.addChange({
      itemId: 'item-1',
      field: 'position',
      oldValue: 0,
      newValue: 1,
      timestamp: Date.now(),
    })
    pendingChanges.addChange({
      itemId: 'item-1',
      field: 'status',
      oldValue: 'pending',
      newValue: 'showing',
      timestamp: Date.now(),
    })
    expect(pendingChanges.getChanges('item-1')).toHaveLength(2)
  })

  it('clears changes for a specific item', () => {
    pendingChanges.addChange({
      itemId: 'item-1',
      field: 'position',
      oldValue: 0,
      newValue: 1,
      timestamp: Date.now(),
    })
    pendingChanges.clearChanges('item-1')
    expect(pendingChanges.getChanges('item-1')).toHaveLength(0)
  })

  it('clears all changes', () => {
    pendingChanges.addChange({
      itemId: 'a',
      field: 'position',
      oldValue: 0,
      newValue: 1,
      timestamp: Date.now(),
    })
    pendingChanges.addChange({
      itemId: 'b',
      field: 'status',
      oldValue: 'pending',
      newValue: 'showing',
      timestamp: Date.now(),
    })
    pendingChanges.clearAll()
    expect(pendingChanges.hasPendingChanges()).toBe(false)
    expect(pendingChanges.getPendingItemIds()).toEqual([])
  })

  it('returns empty array for unknown item', () => {
    expect(pendingChanges.getChanges('nonexistent')).toEqual([])
  })

  it('returns all pending item IDs', () => {
    pendingChanges.addChange({ itemId: 'x', field: 'position', oldValue: 0, newValue: 1, timestamp: Date.now() })
    pendingChanges.addChange({ itemId: 'y', field: 'status', oldValue: 'a', newValue: 'b', timestamp: Date.now() })
    const ids = pendingChanges.getPendingItemIds()
    expect(ids).toContain('x')
    expect(ids).toContain('y')
    expect(ids).toHaveLength(2)
  })
})
