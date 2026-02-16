'use client'

interface NotificationBellProps {
  unreadCount: number
  isOpen: boolean
  onToggle: () => void
}

export function NotificationBell({ unreadCount, isOpen, onToggle }: NotificationBellProps) {
  return (
    <button
      onClick={onToggle}
      className="icon-btn relative"
      aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      aria-expanded={isOpen}
    >
      {/* Bell SVG icon - simple outline, 20x20 */}
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>

      {/* Unread badge */}
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  )
}
