'use client'

import { useEffect, useRef } from 'react'
import { NotificationItem } from './NotificationItem'
import type { AppNotification } from '@/lib/notifications'

interface NotificationDropdownProps {
  notifications: AppNotification[]
  onMarkRead: (id: string) => void
  onMarkAllRead: () => void
  onAcceptFriend?: (friendshipId: string) => void
  onDeclineFriend?: (friendshipId: string) => void
  onClose: () => void
}

export function NotificationDropdown({
  notifications,
  onMarkRead,
  onMarkAllRead,
  onAcceptFriend,
  onDeclineFriend,
  onClose,
}: NotificationDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null)
  const hasUnread = notifications.some((n) => !n.read)

  // Close on click outside (excludes the parent container which holds the bell toggle)
  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      const parent = dropdownRef.current?.parentElement
      if (parent && !parent.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [onClose])

  return (
    <div
      ref={dropdownRef}
      role="menu"
      aria-label="Notifications"
      className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto bg-surface-900 border border-surface-700 rounded-xl shadow-xl z-50"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-700">
        <h3 className="text-sm font-medium text-text-secondary">Notifications</h3>
        {hasUnread && (
          <button
            onClick={onMarkAllRead}
            className="text-xs font-medium text-accent-400 hover:text-accent-300 transition-colors"
          >
            Mark all read
          </button>
        )}
      </div>

      {/* Body */}
      {notifications.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-sm text-text-muted">No notifications</p>
        </div>
      ) : (
        <div className="divide-y divide-surface-700">
          {notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onMarkRead={onMarkRead}
              onAcceptFriend={onAcceptFriend}
              onDeclineFriend={onDeclineFriend}
            />
          ))}
        </div>
      )}
    </div>
  )
}
