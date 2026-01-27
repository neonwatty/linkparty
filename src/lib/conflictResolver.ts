/**
 * Conflict resolution for real-time collaborative queue editing.
 *
 * Handles race conditions when multiple users modify the queue simultaneously.
 * Uses "last write wins" strategy with user notification.
 */

import type { QueueItem } from '../hooks/useParty'
import { logger } from './logger'

const log = logger.createLogger('ConflictResolver')

export interface ConflictInfo {
  type: 'position' | 'content' | 'status' | 'deleted'
  itemId: string
  itemTitle: string
  description: string
}

export interface PendingChange {
  itemId: string
  field: 'position' | 'status' | 'noteContent' | 'isCompleted'
  oldValue: unknown
  newValue: unknown
  timestamp: number
}

/**
 * Tracks pending local changes that haven't been confirmed by the server
 */
class PendingChangesTracker {
  private changes: Map<string, PendingChange[]> = new Map()

  /**
   * Record a pending change for an item
   */
  addChange(change: PendingChange): void {
    const itemChanges = this.changes.get(change.itemId) || []
    // Remove any existing change for the same field
    const filtered = itemChanges.filter(c => c.field !== change.field)
    filtered.push(change)
    this.changes.set(change.itemId, filtered)

    log.debug('Added pending change', { itemId: change.itemId, field: change.field })
  }

  /**
   * Get pending changes for an item
   */
  getChanges(itemId: string): PendingChange[] {
    return this.changes.get(itemId) || []
  }

  /**
   * Clear pending changes for an item (after server confirms)
   */
  clearChanges(itemId: string): void {
    this.changes.delete(itemId)
    log.debug('Cleared pending changes', { itemId })
  }

  /**
   * Clear all pending changes
   */
  clearAll(): void {
    this.changes.clear()
  }

  /**
   * Check if there are any pending changes
   */
  hasPendingChanges(): boolean {
    return this.changes.size > 0
  }

  /**
   * Get all item IDs with pending changes
   */
  getPendingItemIds(): string[] {
    return Array.from(this.changes.keys())
  }
}

// Singleton instance
export const pendingChanges = new PendingChangesTracker()

/**
 * Detect if there's a conflict between local pending changes and server state
 */
export function detectConflict(
  localItem: QueueItem,
  serverItem: QueueItem,
  pendingChange: PendingChange
): ConflictInfo | null {
  // Server item was updated after we made our local change
  // If no updatedAt, we can't detect conflicts based on timing
  if (!serverItem.updatedAt) return null

  const serverUpdatedAt = new Date(serverItem.updatedAt).getTime()

  if (serverUpdatedAt > pendingChange.timestamp) {
    // Check what field changed
    if (pendingChange.field === 'position' && localItem.position !== serverItem.position) {
      return {
        type: 'position',
        itemId: serverItem.id,
        itemTitle: getItemTitle(serverItem),
        description: 'Item was moved by another user',
      }
    }

    if (pendingChange.field === 'status' && localItem.status !== serverItem.status) {
      return {
        type: 'status',
        itemId: serverItem.id,
        itemTitle: getItemTitle(serverItem),
        description: `Item status changed to "${serverItem.status}" by another user`,
      }
    }

    if (pendingChange.field === 'noteContent' && localItem.noteContent !== serverItem.noteContent) {
      return {
        type: 'content',
        itemId: serverItem.id,
        itemTitle: getItemTitle(serverItem),
        description: 'Note was edited by another user',
      }
    }

    if (pendingChange.field === 'isCompleted' && localItem.isCompleted !== serverItem.isCompleted) {
      return {
        type: 'content',
        itemId: serverItem.id,
        itemTitle: getItemTitle(serverItem),
        description: serverItem.isCompleted
          ? 'Item was marked complete by another user'
          : 'Item was marked incomplete by another user',
      }
    }
  }

  return null
}

/**
 * Detect if an item was deleted by another user
 */
export function detectDeletion(
  localItems: QueueItem[],
  serverItems: QueueItem[]
): ConflictInfo[] {
  const serverIds = new Set(serverItems.map(item => item.id))
  const conflicts: ConflictInfo[] = []

  for (const localItem of localItems) {
    // Skip mock items
    if (localItem.id.startsWith('mock-') || localItem.id.startsWith('temp-')) {
      continue
    }

    if (!serverIds.has(localItem.id)) {
      // Check if we have pending changes for this item
      const itemPendingChanges = pendingChanges.getChanges(localItem.id)
      if (itemPendingChanges.length > 0) {
        conflicts.push({
          type: 'deleted',
          itemId: localItem.id,
          itemTitle: getItemTitle(localItem),
          description: 'Item was deleted by another user',
        })
        // Clear pending changes since item no longer exists
        pendingChanges.clearChanges(localItem.id)
      }
    }
  }

  return conflicts
}

/**
 * Merge server state with local state, detecting conflicts
 */
export function mergeQueueState(
  localQueue: QueueItem[],
  serverQueue: QueueItem[]
): { mergedQueue: QueueItem[]; conflicts: ConflictInfo[] } {
  const conflicts: ConflictInfo[] = []

  // First, detect deletions
  const deletionConflicts = detectDeletion(localQueue, serverQueue)
  conflicts.push(...deletionConflicts)

  // Create a map of server items for quick lookup
  const serverItemMap = new Map(serverQueue.map(item => [item.id, item]))

  // Check for conflicts on items we have pending changes for
  for (const itemId of pendingChanges.getPendingItemIds()) {
    const localItem = localQueue.find(item => item.id === itemId)
    const serverItem = serverItemMap.get(itemId)

    if (!localItem || !serverItem) continue

    const itemPendingChanges = pendingChanges.getChanges(itemId)
    for (const change of itemPendingChanges) {
      const conflict = detectConflict(localItem, serverItem, change)
      if (conflict) {
        conflicts.push(conflict)
        // Clear the pending change since server state wins
        pendingChanges.clearChanges(itemId)
      }
    }
  }

  // Use server state as the source of truth
  // This is the "last write wins" strategy
  const mergedQueue = serverQueue

  if (conflicts.length > 0) {
    log.info('Conflicts detected during merge', { count: conflicts.length, conflicts })
  }

  return { mergedQueue, conflicts }
}

/**
 * Get a display title for a queue item
 */
function getItemTitle(item: QueueItem): string {
  switch (item.type) {
    case 'youtube':
      return item.title || 'YouTube Video'
    case 'tweet':
      return item.tweetContent?.substring(0, 50) || 'Tweet'
    case 'reddit':
      return item.redditTitle || 'Reddit Post'
    case 'note':
      return item.noteContent?.substring(0, 50) || 'Note'
    case 'image':
      return item.imageCaption || item.imageName || 'Image'
    default:
      return 'Queue Item'
  }
}

/**
 * Format conflicts for display to user
 */
export function formatConflictMessage(conflicts: ConflictInfo[]): string {
  if (conflicts.length === 0) return ''

  if (conflicts.length === 1) {
    return conflicts[0].description
  }

  return `${conflicts.length} items were updated by other users`
}
