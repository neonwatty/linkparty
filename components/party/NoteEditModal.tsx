'use client'

import { useEffect } from 'react'
import { EditIcon, CloseIcon } from '@/components/icons'

interface NoteEditModalProps {
  isOpen: boolean
  noteText: string
  onNoteTextChange: (text: string) => void
  onSave: () => void
  onCancel: () => void
}

export function NoteEditModal({
  isOpen,
  noteText,
  onNoteTextChange,
  onSave,
  onCancel,
}: NoteEditModalProps) {
  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel()
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onCancel])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end justify-center z-50">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Edit note"
        className="bg-surface-900 w-full max-w-md rounded-t-3xl p-6 bottom-sheet animate-fade-in-up"
      >
        <div className="w-12 h-1 bg-surface-600 rounded-full mx-auto mb-6"></div>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
              <EditIcon />
            </div>
            <h3 className="text-xl font-bold">Edit Note</h3>
          </div>
          <button onClick={onCancel} className="text-text-muted" aria-label="Close modal">
            <CloseIcon />
          </button>
        </div>

        <textarea
          placeholder="Write your note..."
          value={noteText}
          onChange={(e) => onNoteTextChange(e.target.value)}
          className="input min-h-[150px] resize-none"
          autoFocus
          maxLength={1000}
        />

        <div className="flex justify-end mt-1 mb-4">
          <span className={`text-xs ${noteText.length >= 900 ? 'text-yellow-400' : 'text-text-muted'}`}>
            {noteText.length}/1000
          </span>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="btn btn-secondary flex-1"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={!noteText.trim()}
            className="btn btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Note
          </button>
        </div>
      </div>
    </div>
  )
}
