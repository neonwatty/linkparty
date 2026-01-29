import type { QueueItem } from '@/hooks/useParty'

// Helper to check if an item is overdue
export function isItemOverdue(item: QueueItem): boolean {
  if (!item.dueDate || item.isCompleted) return false
  return new Date(item.dueDate) < new Date()
}

// Helper to format due date
export function formatDueDate(dueDate: string): string {
  const date = new Date(dueDate)
  const now = new Date()
  const diffMs = date.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    return `${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''} overdue`
  } else if (diffDays === 0) {
    return 'Due today'
  } else if (diffDays === 1) {
    return 'Due tomorrow'
  } else if (diffDays <= 7) {
    return `Due in ${diffDays} days`
  } else {
    return `Due ${date.toLocaleDateString()}`
  }
}
