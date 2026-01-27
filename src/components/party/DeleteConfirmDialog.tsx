import { useEffect } from 'react'
import { TrashIcon } from '../icons'

interface DeleteConfirmDialogProps {
  isOpen: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function DeleteConfirmDialog({
  isOpen,
  onConfirm,
  onCancel,
}: DeleteConfirmDialogProps) {
  // Handle Escape key to close dialog
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-6">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
        className="bg-surface-900 w-full max-w-sm rounded-2xl p-6 animate-fade-in-up"
      >
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
            <TrashIcon />
          </div>
          <h3 id="delete-dialog-title" className="text-xl font-bold mb-2">Remove item?</h3>
          <p id="delete-dialog-description" className="text-text-muted text-sm">
            This item will be removed from the queue.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="btn btn-secondary flex-1"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="btn flex-1 bg-red-500 text-white hover:bg-red-600"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  )
}
