import { useEffect } from 'react'
import type { QueueItem } from '../../hooks/useParty'
import { getContentTypeBadge } from '../../utils/contentHelpers'
import { getQueueItemTitle } from '../../utils/queueHelpers'
import {
  PlayNextIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  TrashIcon,
  CheckCircleIcon,
  NoteIcon,
  EditIcon,
} from '../icons'

interface QueueItemActionsSheetProps {
  item: QueueItem | null
  isOwnItem: boolean
  onClose: () => void
  onShowNext: (itemId: string) => void
  onMoveUp: (itemId: string) => void
  onMoveDown: (itemId: string) => void
  onDelete: () => void
  onToggleComplete: (itemId: string) => void
  onViewNote: (item: QueueItem) => void
  onEditNote: (item: QueueItem) => void
}

export function QueueItemActionsSheet({
  item,
  isOwnItem,
  onClose,
  onShowNext,
  onMoveUp,
  onMoveDown,
  onDelete,
  onToggleComplete,
  onViewNote,
  onEditNote,
}: QueueItemActionsSheetProps) {
  // Handle Escape key to close sheet
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    if (item) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [item, onClose])

  if (!item) return null

  const badge = getContentTypeBadge(item.type)
  const BadgeIcon = badge.icon

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end justify-center z-50">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Queue item actions"
        className="bg-surface-900 w-full max-w-md rounded-t-3xl p-6 bottom-sheet animate-fade-in-up max-h-[85vh] overflow-hidden flex flex-col"
      >
        <div className="w-12 h-1 bg-surface-600 rounded-full mx-auto mb-6 flex-shrink-0"></div>

        {/* Item Info */}
        <div className="flex gap-3 mb-6 flex-shrink-0">
          <div className={`w-20 h-12 rounded-lg overflow-hidden flex-shrink-0 ${badge.bg} flex items-center justify-center`}>
            {item.type === 'youtube' && item.thumbnail ? (
              <img
                src={item.thumbnail}
                alt={item.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className={badge.color}>
                <BadgeIcon size={24} />
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate">{getQueueItemTitle(item)}</div>
            <div className="text-text-muted text-xs">Added by {item.addedBy}</div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2 flex-1 overflow-y-auto min-h-0">
          {/* Note-specific actions */}
          {item.type === 'note' && (
            <>
              <button
                onClick={() => {
                  onToggleComplete(item.id)
                  onClose()
                }}
                onTouchEnd={(e) => {
                  e.stopPropagation()
                  e.preventDefault()
                  onToggleComplete(item.id)
                  onClose()
                }}
                className="w-full flex items-center gap-4 p-3 rounded-xl bg-green-900/30 hover:bg-surface-800 transition-colors text-left min-h-[64px]"
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${item.isCompleted ? 'bg-gray-500/20 text-gray-400' : 'bg-green-500/20 text-green-400'}`}>
                  <CheckCircleIcon size={20} filled={item.isCompleted} />
                </div>
                <div className="flex-1">
                  <div className="font-medium">{item.isCompleted ? 'Mark Incomplete' : 'Mark Complete'}</div>
                  <div className="text-text-muted text-xs">{item.isCompleted ? 'Remove completion status' : 'Mark this note as done'}</div>
                </div>
              </button>

              <button
                onClick={() => onViewNote(item)}
                className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-surface-800 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-full bg-gray-500/20 flex items-center justify-center text-gray-400">
                  <NoteIcon size={20} />
                </div>
                <div>
                  <div className="font-medium">View Note</div>
                  <div className="text-text-muted text-xs">Read the full note</div>
                </div>
              </button>

              {isOwnItem && (
                <button
                  onClick={() => onEditNote(item)}
                  className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-surface-800 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                    <EditIcon />
                  </div>
                  <div>
                    <div className="font-medium">Edit Note</div>
                    <div className="text-text-muted text-xs">Modify note content</div>
                  </div>
                </button>
              )}

              <div className="h-px bg-surface-700 my-2"></div>
            </>
          )}

          <button
            onClick={() => onShowNext(item.id)}
            className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-surface-800 transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-full bg-accent-500/20 flex items-center justify-center text-accent-500">
              <PlayNextIcon />
            </div>
            <div>
              <div className="font-medium">Show Next</div>
              <div className="text-text-muted text-xs">Move to top of queue</div>
            </div>
          </button>

          <button
            onClick={() => onMoveUp(item.id)}
            className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-surface-800 transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-full bg-surface-700 flex items-center justify-center text-text-secondary">
              <ArrowUpIcon />
            </div>
            <div>
              <div className="font-medium">Move Up</div>
              <div className="text-text-muted text-xs">Move one position earlier</div>
            </div>
          </button>

          <button
            onClick={() => onMoveDown(item.id)}
            className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-surface-800 transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-full bg-surface-700 flex items-center justify-center text-text-secondary">
              <ArrowDownIcon />
            </div>
            <div>
              <div className="font-medium">Move Down</div>
              <div className="text-text-muted text-xs">Move one position later</div>
            </div>
          </button>

          <div className="h-px bg-surface-700 my-2"></div>

          <button
            onClick={onDelete}
            className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-red-500/10 transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center text-red-400">
              <TrashIcon />
            </div>
            <div>
              <div className="font-medium text-red-400">Remove from Queue</div>
              <div className="text-text-muted text-xs">Delete this item</div>
            </div>
          </button>
        </div>

        <button
          onClick={onClose}
          className="btn btn-secondary w-full mt-4 flex-shrink-0"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
