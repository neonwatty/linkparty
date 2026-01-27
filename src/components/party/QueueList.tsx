import { memo, useCallback } from 'react'
import type { QueueItem } from '../../hooks/useParty'
import { getContentTypeBadge } from '../../utils/contentHelpers'
import { getQueueItemTitle, getQueueItemSubtitle } from '../../utils/queueHelpers'
import { isItemOverdue } from '../../utils/dateHelpers'
import {
  DragIcon,
  EditIcon,
  CheckCircleIcon,
  ClockIcon,
  AlertIcon,
} from '../icons'

interface QueueListItemProps {
  item: QueueItem
  index: number
  isOwnItem: boolean
  onItemClick: (item: QueueItem) => void
  onToggleComplete: (itemId: string) => void
}

const QueueListItem = memo(function QueueListItem({
  item,
  index,
  isOwnItem,
  onItemClick,
  onToggleComplete,
}: QueueListItemProps) {
  const badge = getContentTypeBadge(item.type)
  const BadgeIcon = badge.icon
  const overdue = isItemOverdue(item)

  const handleClick = useCallback(() => {
    onItemClick(item)
  }, [onItemClick, item])

  const handleToggleComplete = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation()
    if ('preventDefault' in e) {
      e.preventDefault()
    }
    onToggleComplete(item.id)
  }, [onToggleComplete, item.id])

  return (
    <div
      onClick={handleClick}
      className={`queue-item cursor-pointer active:bg-surface-700 ${item.isCompleted ? 'opacity-60' : ''}`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Completion checkbox for notes */}
      {item.type === 'note' ? (
        <div
          role="button"
          tabIndex={0}
          onClick={handleToggleComplete}
          onTouchEnd={handleToggleComplete}
          className={`flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center -ml-2 cursor-pointer ${item.isCompleted ? 'text-green-500' : overdue ? 'text-red-500' : 'text-text-muted'}`}
        >
          <CheckCircleIcon size={24} filled={item.isCompleted} />
        </div>
      ) : (
        <DragIcon />
      )}

      {/* Content type badge/preview */}
      <div className={`relative w-20 h-12 rounded-lg overflow-hidden flex-shrink-0 ${badge.bg} flex items-center justify-center`}>
        {item.type === 'youtube' && item.thumbnail ? (
          <img
            src={item.thumbnail}
            alt={item.title}
            className="w-full h-full object-cover"
          />
        ) : item.type === 'image' && item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.imageCaption || item.imageName || 'Image'}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
              e.currentTarget.nextElementSibling?.classList.remove('hidden')
            }}
          />
        ) : (
          <span className={badge.color}>
            <BadgeIcon size={24} />
          </span>
        )}
        {isOwnItem && (
          <div className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-teal-500"></div>
        )}
        {overdue && (
          <div className="absolute bottom-0.5 right-0.5 text-red-500">
            <AlertIcon size={12} />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`${badge.color}`}>
            <BadgeIcon size={12} />
          </span>
          <span className={`font-medium text-sm truncate ${item.isCompleted ? 'line-through' : ''}`}>
            {getQueueItemTitle(item)}
          </span>
          {item.dueDate && !item.isCompleted && (
            <span className={`flex-shrink-0 ${overdue ? 'text-red-400' : 'text-amber-400'}`}>
              <ClockIcon size={12} />
            </span>
          )}
        </div>
        <div className={`text-xs ${overdue ? 'text-red-400' : 'text-text-muted'}`}>
          {getQueueItemSubtitle(item)}
        </div>
      </div>

      <div className="text-text-muted">
        <EditIcon />
      </div>
    </div>
  )
})

interface QueueListProps {
  items: QueueItem[]
  currentSessionId: string
  onItemClick: (item: QueueItem) => void
  onToggleComplete: (itemId: string) => void
}

export function QueueList({
  items,
  currentSessionId,
  onItemClick,
  onToggleComplete,
}: QueueListProps) {
  return (
    <div className="flex-1 overflow-auto">
      <div className="px-4 py-3 flex items-center justify-between sticky top-0 bg-surface-950/95 backdrop-blur z-10">
        <div className="text-sm text-text-secondary">
          Up next · {items.length} items
        </div>
        <div className="text-xs text-text-muted">Tap to edit</div>
      </div>

      <div className="px-4 pb-24">
        {items.map((item, index) => (
          <QueueListItem
            key={item.id}
            item={item}
            index={index}
            isOwnItem={item.addedBySessionId === currentSessionId}
            onItemClick={onItemClick}
            onToggleComplete={onToggleComplete}
          />
        ))}
      </div>
    </div>
  )
}
