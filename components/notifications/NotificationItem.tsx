'use client'

import Link from 'next/link'
import type { AppNotification } from '@/lib/notifications'

interface NotificationItemProps {
  notification: AppNotification
  onMarkRead: (id: string) => void
  onAcceptFriend?: (friendshipId: string) => void
  onDeclineFriend?: (friendshipId: string) => void
}

function relativeTime(dateString: string): string {
  const now = Date.now()
  const then = new Date(dateString).getTime()
  const diffMs = now - then
  const diffMin = Math.floor(diffMs / 60_000)
  const diffHours = Math.floor(diffMs / 3_600_000)
  const diffDays = Math.floor(diffMs / 86_400_000)

  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return new Date(dateString).toLocaleDateString()
}

const typeIcons: Record<AppNotification['type'], string> = {
  friend_request: '\u{1F44B}',
  friend_accepted: '\u{1F91D}',
  party_invite: '\u{1F389}',
}

export function NotificationItem({ notification, onMarkRead, onAcceptFriend, onDeclineFriend }: NotificationItemProps) {
  const { id, type, title, read, created_at, data } = notification
  const friendshipId = data?.friendshipId ?? null
  const partyCode = data?.partyCode ?? null

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => {
        if (!read) onMarkRead(id)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !read) onMarkRead(id)
      }}
      className={`flex items-start gap-3 px-4 py-3 transition-colors cursor-pointer ${
        read ? 'bg-surface-800' : 'bg-surface-700'
      } hover:bg-surface-600`}
    >
      {/* Icon */}
      <span className="text-lg flex-shrink-0 mt-0.5" aria-hidden="true">
        {typeIcons[type]}
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-secondary truncate">{title}</p>
        <p className="text-xs text-text-muted mt-0.5">{relativeTime(created_at)}</p>

        {/* Action buttons for friend_request */}
        {type === 'friend_request' && friendshipId && onAcceptFriend && onDeclineFriend && (
          <div className="flex gap-2 mt-2">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onAcceptFriend(friendshipId)
              }}
              className="text-sm font-medium px-3 py-1 rounded-lg bg-accent-500/20 text-accent-400 hover:bg-accent-500/30 transition-colors"
            >
              Accept
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDeclineFriend(friendshipId)
              }}
              className="text-sm font-medium px-3 py-1 rounded-lg bg-surface-600 text-text-muted hover:bg-surface-500 transition-colors"
            >
              Decline
            </button>
          </div>
        )}

        {/* Join link for party_invite */}
        {type === 'party_invite' && partyCode && (
          <Link
            href={`/join/${partyCode}`}
            onClick={(e) => e.stopPropagation()}
            className="inline-block text-sm font-medium mt-2 px-3 py-1 rounded-lg bg-teal-500/20 text-teal-400 hover:bg-teal-500/30 transition-colors"
          >
            Join
          </Link>
        )}
      </div>
    </div>
  )
}
