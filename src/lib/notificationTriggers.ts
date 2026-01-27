/**
 * Notification trigger system for queue events.
 *
 * This module provides the infrastructure to trigger notifications when:
 * - A new item is added to the queue
 * - An item's status changes to "showing"
 * - A reminder is due
 *
 * The actual push delivery requires an Edge Function and APNs/FCM configuration.
 * This client-side code logs triggers and can show in-app notifications.
 */

import { supabase } from './supabase'
import { logger } from './logger'
import type { QueueItem } from '../hooks/useParty'

const log = logger.createLogger('NotificationTriggers')

export interface NotificationPayload {
  type: 'item_added' | 'item_showing' | 'reminder_due'
  partyId: string
  partyName?: string
  itemId?: string
  itemTitle?: string
  addedBy?: string
}

/**
 * Log a notification trigger to the database for later processing.
 * In a full implementation, this would trigger an Edge Function to send push notifications.
 */
async function logNotificationTrigger(
  recipientSessionId: string,
  payload: NotificationPayload
): Promise<void> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const isMockMode = !supabaseUrl || supabaseUrl.includes('placeholder')

  if (isMockMode) {
    log.debug('Notification trigger (mock mode)', { ...payload, recipientSessionId })
    return
  }

  try {
    const { error } = await supabase
      .from('notification_logs')
      .insert({
        recipient_session_id: recipientSessionId,
        party_id: payload.partyId,
        queue_item_id: payload.itemId,
        notification_type: payload.type,
        status: 'pending',
      })

    if (error) {
      log.error('Failed to log notification trigger', error)
    }
  } catch (err) {
    log.error('Failed to log notification trigger', err)
  }
}

/**
 * Trigger notifications for party members when an item is added to the queue.
 * Excludes the user who added the item.
 */
export async function triggerItemAddedNotification(
  partyId: string,
  item: Partial<QueueItem>,
  addedBySessionId: string,
  partyMembers: Array<{ sessionId: string; name: string }>
): Promise<void> {
  const payload: NotificationPayload = {
    type: 'item_added',
    partyId,
    itemId: item.id,
    itemTitle: getItemTitle(item),
    addedBy: item.addedBy,
  }

  // Notify all party members except the one who added the item
  const recipientIds = partyMembers
    .filter(m => m.sessionId !== addedBySessionId)
    .map(m => m.sessionId)

  for (const sessionId of recipientIds) {
    await logNotificationTrigger(sessionId, payload)
  }

  if (recipientIds.length > 0) {
    log.debug(`Queued ${recipientIds.length} notifications for item added`)
  }
}

// Unused - reserved for future push notification implementation
// export async function triggerItemShowingNotification(
//   partyId: string,
//   item: QueueItem,
//   currentSessionId: string,
//   partyMembers: Array<{ sessionId: string; name: string }>
// ): Promise<void> {
//   const payload: NotificationPayload = {
//     type: 'item_showing',
//     partyId,
//     itemId: item.id,
//     itemTitle: getItemTitle(item),
//   }
//   const recipientIds = partyMembers
//     .filter(m => m.sessionId !== currentSessionId)
//     .map(m => m.sessionId)
//   for (const sessionId of recipientIds) {
//     await logNotificationTrigger(sessionId, payload)
//   }
//   if (recipientIds.length > 0) {
//     log.debug(`Queued ${recipientIds.length} notifications for item showing`)
//   }
// }

/**
 * Get a display title for a queue item
 */
function getItemTitle(item: Partial<QueueItem>): string {
  switch (item.type) {
    case 'youtube':
      return item.title || 'YouTube video'
    case 'tweet':
      return item.tweetAuthor ? `Tweet by ${item.tweetAuthor}` : 'Tweet'
    case 'reddit':
      return item.redditTitle || 'Reddit post'
    case 'note':
      return item.noteContent?.slice(0, 50) || 'Note'
    case 'image':
      return item.imageCaption || item.imageName || 'Image'
    default:
      return 'New item'
  }
}

/**
 * Check if notifications are enabled for a party.
 * This could be extended to check user preferences.
 */
export function areNotificationsEnabled(): boolean {
  // For now, always return true if on native platform
  // In the future, this could check user preferences
  const storedPref = localStorage.getItem('link-party-notifications-enabled')
  return storedPref !== 'false'
}

// Unused - reserved for future settings UI
// export function setNotificationsEnabled(enabled: boolean): void {
//   localStorage.setItem('link-party-notifications-enabled', enabled ? 'true' : 'false')
// }
