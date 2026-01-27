import { useEffect } from 'react'
import type { QueueItem } from '../../hooks/useParty'
import { NoteIcon, CloseIcon, EditIcon } from '../icons'

interface NoteViewModalProps {
  isOpen: boolean
  note: QueueItem | null
  isOwnNote: boolean
  onClose: () => void
  onEdit: () => void
}

export function NoteViewModal({
  isOpen,
  note,
  isOwnNote,
  onClose,
  onEdit,
}: NoteViewModalProps) {
  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  if (!isOpen || !note) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end justify-center z-50">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="View note"
        className="bg-surface-900 w-full max-w-md rounded-t-3xl p-6 bottom-sheet animate-fade-in-up max-h-[80vh] flex flex-col"
      >
        <div className="w-12 h-1 bg-surface-600 rounded-full mx-auto mb-6"></div>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-500/20 flex items-center justify-center text-gray-400">
              <NoteIcon size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold">Note</h3>
              <p className="text-text-muted text-xs">Added by {note.addedBy}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-text-muted" aria-label="Close modal">
            <CloseIcon />
          </button>
        </div>

        <div className="flex-1 overflow-auto">
          <div className="bg-surface-800 rounded-xl p-4">
            <p className="text-lg leading-relaxed whitespace-pre-wrap">{note.noteContent}</p>
          </div>
        </div>

        <div className="flex gap-3 mt-4">
          {isOwnNote && (
            <button
              onClick={onEdit}
              className="btn btn-secondary flex-1 flex items-center justify-center gap-2"
            >
              <EditIcon />
              Edit
            </button>
          )}
          <button
            onClick={onClose}
            className="btn btn-primary flex-1"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
