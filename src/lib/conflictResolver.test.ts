import { describe, it, expect, beforeEach } from 'vitest'
import {
  pendingChanges,
  detectConflict,
  detectDeletion,
  mergeQueueState,
  formatConflictMessage,
} from './conflictResolver'
import type { QueueItem } from '../hooks/useParty'

// Helper to create a minimal queue item for testing
function createTestItem(overrides: Partial<QueueItem> = {}): QueueItem {
  return {
    id: 'test-item-1',
    type: 'note',
    addedBy: 'TestUser',
    addedBySessionId: 'session-1',
    status: 'pending',
    position: 1,
    isCompleted: false,
    noteContent: 'Test note',
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

describe('PendingChangesTracker', () => {
  beforeEach(() => {
    pendingChanges.clearAll()
  })

  it('should add and retrieve pending changes', () => {
    pendingChanges.addChange({
      itemId: 'item-1',
      field: 'position',
      oldValue: 1,
      newValue: 2,
      timestamp: Date.now(),
    })

    const changes = pendingChanges.getChanges('item-1')
    expect(changes).toHaveLength(1)
    expect(changes[0].field).toBe('position')
    expect(changes[0].oldValue).toBe(1)
    expect(changes[0].newValue).toBe(2)
  })

  it('should replace existing change for same field', () => {
    pendingChanges.addChange({
      itemId: 'item-1',
      field: 'position',
      oldValue: 1,
      newValue: 2,
      timestamp: Date.now(),
    })

    pendingChanges.addChange({
      itemId: 'item-1',
      field: 'position',
      oldValue: 2,
      newValue: 3,
      timestamp: Date.now(),
    })

    const changes = pendingChanges.getChanges('item-1')
    expect(changes).toHaveLength(1)
    expect(changes[0].newValue).toBe(3)
  })

  it('should track multiple fields for same item', () => {
    pendingChanges.addChange({
      itemId: 'item-1',
      field: 'position',
      oldValue: 1,
      newValue: 2,
      timestamp: Date.now(),
    })

    pendingChanges.addChange({
      itemId: 'item-1',
      field: 'noteContent',
      oldValue: 'old',
      newValue: 'new',
      timestamp: Date.now(),
    })

    const changes = pendingChanges.getChanges('item-1')
    expect(changes).toHaveLength(2)
  })

  it('should clear changes for specific item', () => {
    pendingChanges.addChange({
      itemId: 'item-1',
      field: 'position',
      oldValue: 1,
      newValue: 2,
      timestamp: Date.now(),
    })

    pendingChanges.addChange({
      itemId: 'item-2',
      field: 'status',
      oldValue: 'pending',
      newValue: 'showing',
      timestamp: Date.now(),
    })

    pendingChanges.clearChanges('item-1')

    expect(pendingChanges.getChanges('item-1')).toHaveLength(0)
    expect(pendingChanges.getChanges('item-2')).toHaveLength(1)
  })

  it('should return empty array for items with no pending changes', () => {
    expect(pendingChanges.getChanges('nonexistent')).toEqual([])
  })

  it('should report hasPendingChanges correctly', () => {
    expect(pendingChanges.hasPendingChanges()).toBe(false)

    pendingChanges.addChange({
      itemId: 'item-1',
      field: 'position',
      oldValue: 1,
      newValue: 2,
      timestamp: Date.now(),
    })

    expect(pendingChanges.hasPendingChanges()).toBe(true)

    pendingChanges.clearAll()
    expect(pendingChanges.hasPendingChanges()).toBe(false)
  })

  it('should return pending item IDs', () => {
    pendingChanges.addChange({
      itemId: 'item-1',
      field: 'position',
      oldValue: 1,
      newValue: 2,
      timestamp: Date.now(),
    })

    pendingChanges.addChange({
      itemId: 'item-2',
      field: 'status',
      oldValue: 'pending',
      newValue: 'showing',
      timestamp: Date.now(),
    })

    const ids = pendingChanges.getPendingItemIds()
    expect(ids).toContain('item-1')
    expect(ids).toContain('item-2')
    expect(ids).toHaveLength(2)
  })
})

describe('detectConflict', () => {
  beforeEach(() => {
    pendingChanges.clearAll()
  })

  it('should detect position conflict', () => {
    const oldTimestamp = Date.now() - 1000
    const newTimestamp = new Date(Date.now()).toISOString()

    const localItem = createTestItem({ position: 1 })
    const serverItem = createTestItem({ position: 2, updatedAt: newTimestamp })

    const conflict = detectConflict(localItem, serverItem, {
      itemId: localItem.id,
      field: 'position',
      oldValue: 1,
      newValue: 3,
      timestamp: oldTimestamp,
    })

    expect(conflict).not.toBeNull()
    expect(conflict?.type).toBe('position')
    expect(conflict?.description).toBe('Item was moved by another user')
  })

  it('should detect status conflict', () => {
    const oldTimestamp = Date.now() - 1000
    const newTimestamp = new Date(Date.now()).toISOString()

    const localItem = createTestItem({ status: 'pending' })
    const serverItem = createTestItem({ status: 'showing', updatedAt: newTimestamp })

    const conflict = detectConflict(localItem, serverItem, {
      itemId: localItem.id,
      field: 'status',
      oldValue: 'pending',
      newValue: 'shown',
      timestamp: oldTimestamp,
    })

    expect(conflict).not.toBeNull()
    expect(conflict?.type).toBe('status')
    expect(conflict?.description).toContain('showing')
  })

  it('should detect noteContent conflict', () => {
    const oldTimestamp = Date.now() - 1000
    const newTimestamp = new Date(Date.now()).toISOString()

    const localItem = createTestItem({ noteContent: 'old content' })
    const serverItem = createTestItem({ noteContent: 'server content', updatedAt: newTimestamp })

    const conflict = detectConflict(localItem, serverItem, {
      itemId: localItem.id,
      field: 'noteContent',
      oldValue: 'old content',
      newValue: 'my content',
      timestamp: oldTimestamp,
    })

    expect(conflict).not.toBeNull()
    expect(conflict?.type).toBe('content')
    expect(conflict?.description).toBe('Note was edited by another user')
  })

  it('should detect isCompleted conflict when marked complete', () => {
    const oldTimestamp = Date.now() - 1000
    const newTimestamp = new Date(Date.now()).toISOString()

    const localItem = createTestItem({ isCompleted: false })
    const serverItem = createTestItem({ isCompleted: true, updatedAt: newTimestamp })

    const conflict = detectConflict(localItem, serverItem, {
      itemId: localItem.id,
      field: 'isCompleted',
      oldValue: false,
      newValue: true,
      timestamp: oldTimestamp,
    })

    expect(conflict).not.toBeNull()
    expect(conflict?.type).toBe('content')
    expect(conflict?.description).toBe('Item was marked complete by another user')
  })

  it('should detect isCompleted conflict when marked incomplete', () => {
    const oldTimestamp = Date.now() - 1000
    const newTimestamp = new Date(Date.now()).toISOString()

    const localItem = createTestItem({ isCompleted: true })
    const serverItem = createTestItem({ isCompleted: false, updatedAt: newTimestamp })

    const conflict = detectConflict(localItem, serverItem, {
      itemId: localItem.id,
      field: 'isCompleted',
      oldValue: true,
      newValue: false,
      timestamp: oldTimestamp,
    })

    expect(conflict).not.toBeNull()
    expect(conflict?.description).toBe('Item was marked incomplete by another user')
  })

  it('should return null when no conflict (server update before our change)', () => {
    const serverTimestamp = new Date(Date.now() - 2000).toISOString()
    const ourTimestamp = Date.now() - 1000

    const localItem = createTestItem({ position: 1 })
    const serverItem = createTestItem({ position: 2, updatedAt: serverTimestamp })

    const conflict = detectConflict(localItem, serverItem, {
      itemId: localItem.id,
      field: 'position',
      oldValue: 1,
      newValue: 3,
      timestamp: ourTimestamp,
    })

    expect(conflict).toBeNull()
  })

  it('should return null when server item has no updatedAt', () => {
    const localItem = createTestItem({ position: 1 })
    const serverItem = createTestItem({ position: 2, updatedAt: undefined })

    const conflict = detectConflict(localItem, serverItem, {
      itemId: localItem.id,
      field: 'position',
      oldValue: 1,
      newValue: 3,
      timestamp: Date.now() - 1000,
    })

    expect(conflict).toBeNull()
  })
})

describe('detectDeletion', () => {
  beforeEach(() => {
    pendingChanges.clearAll()
  })

  it('should detect deleted items with pending changes', () => {
    const localItem = createTestItem({ id: 'item-1' })

    pendingChanges.addChange({
      itemId: 'item-1',
      field: 'position',
      oldValue: 1,
      newValue: 2,
      timestamp: Date.now(),
    })

    const conflicts = detectDeletion([localItem], [])

    expect(conflicts).toHaveLength(1)
    expect(conflicts[0].type).toBe('deleted')
    expect(conflicts[0].description).toBe('Item was deleted by another user')
  })

  it('should not report deletion for items without pending changes', () => {
    const localItem = createTestItem({ id: 'item-1' })

    const conflicts = detectDeletion([localItem], [])

    expect(conflicts).toHaveLength(0)
  })

  it('should skip mock items', () => {
    const mockItem = createTestItem({ id: 'mock-123' })
    const tempItem = createTestItem({ id: 'temp-456' })

    pendingChanges.addChange({
      itemId: 'mock-123',
      field: 'position',
      oldValue: 1,
      newValue: 2,
      timestamp: Date.now(),
    })

    const conflicts = detectDeletion([mockItem, tempItem], [])

    expect(conflicts).toHaveLength(0)
  })

  it('should not report items that exist on server', () => {
    const item = createTestItem({ id: 'item-1' })

    pendingChanges.addChange({
      itemId: 'item-1',
      field: 'position',
      oldValue: 1,
      newValue: 2,
      timestamp: Date.now(),
    })

    const conflicts = detectDeletion([item], [item])

    expect(conflicts).toHaveLength(0)
  })
})

describe('mergeQueueState', () => {
  beforeEach(() => {
    pendingChanges.clearAll()
  })

  it('should use server state as source of truth', () => {
    const localQueue = [
      createTestItem({ id: 'item-1', position: 1 }),
      createTestItem({ id: 'item-2', position: 2 }),
    ]

    const serverQueue = [
      createTestItem({ id: 'item-1', position: 2 }),
      createTestItem({ id: 'item-2', position: 1 }),
      createTestItem({ id: 'item-3', position: 3 }),
    ]

    const { mergedQueue } = mergeQueueState(localQueue, serverQueue)

    expect(mergedQueue).toEqual(serverQueue)
    expect(mergedQueue).toHaveLength(3)
  })

  it('should collect deletion conflicts', () => {
    const localItem = createTestItem({ id: 'item-1' })

    pendingChanges.addChange({
      itemId: 'item-1',
      field: 'position',
      oldValue: 1,
      newValue: 2,
      timestamp: Date.now(),
    })

    const { conflicts } = mergeQueueState([localItem], [])

    expect(conflicts).toHaveLength(1)
    expect(conflicts[0].type).toBe('deleted')
  })

  it('should collect field conflicts', () => {
    const oldTimestamp = Date.now() - 1000
    const newTimestamp = new Date(Date.now()).toISOString()

    const localItem = createTestItem({ id: 'item-1', position: 1 })
    const serverItem = createTestItem({ id: 'item-1', position: 2, updatedAt: newTimestamp })

    pendingChanges.addChange({
      itemId: 'item-1',
      field: 'position',
      oldValue: 1,
      newValue: 3,
      timestamp: oldTimestamp,
    })

    const { conflicts } = mergeQueueState([localItem], [serverItem])

    expect(conflicts).toHaveLength(1)
    expect(conflicts[0].type).toBe('position')
  })

  it('should return empty conflicts when none exist', () => {
    const item = createTestItem({ id: 'item-1' })

    const { conflicts } = mergeQueueState([item], [item])

    expect(conflicts).toHaveLength(0)
  })
})

describe('formatConflictMessage', () => {
  it('should return empty string for no conflicts', () => {
    expect(formatConflictMessage([])).toBe('')
  })

  it('should return description for single conflict', () => {
    const conflicts = [
      {
        type: 'position' as const,
        itemId: 'item-1',
        itemTitle: 'Test Note',
        description: 'Item was moved by another user',
      },
    ]

    expect(formatConflictMessage(conflicts)).toBe('Item was moved by another user')
  })

  it('should return count for multiple conflicts', () => {
    const conflicts = [
      {
        type: 'position' as const,
        itemId: 'item-1',
        itemTitle: 'Note 1',
        description: 'Item was moved by another user',
      },
      {
        type: 'deleted' as const,
        itemId: 'item-2',
        itemTitle: 'Note 2',
        description: 'Item was deleted by another user',
      },
    ]

    expect(formatConflictMessage(conflicts)).toBe('2 items were updated by other users')
  })
})
