/// <reference types="@testing-library/jest-dom/vitest" />
import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueueItemActionsSheet } from './QueueItemActionsSheet'
import type { QueueItem } from '@/hooks/useParty'

// Mock icons as simple spans
vi.mock('@/components/icons', () => ({
  PlayNextIcon: () => <span data-testid="play-next-icon" />,
  ArrowUpIcon: () => <span data-testid="arrow-up-icon" />,
  ArrowDownIcon: () => <span data-testid="arrow-down-icon" />,
  TrashIcon: () => <span data-testid="trash-icon" />,
  CheckCircleIcon: ({ size, filled }: { size?: number; filled?: boolean }) => (
    <span data-testid="check-circle-icon" data-size={size} data-filled={filled} />
  ),
  NoteIcon: ({ size }: { size?: number }) => <span data-testid="note-icon" data-size={size} />,
  EditIcon: () => <span data-testid="edit-icon" />,
  YoutubeIcon: ({ size }: { size?: number }) => <span data-testid="youtube-icon" data-size={size} />,
  TwitterIcon: ({ size }: { size?: number }) => <span data-testid="twitter-icon" data-size={size} />,
  RedditIcon: ({ size }: { size?: number }) => <span data-testid="reddit-icon" data-size={size} />,
  ImageIcon: ({ size }: { size?: number }) => <span data-testid="image-icon" data-size={size} />,
}))

// Mock useFocusTrap to no-op
vi.mock('@/hooks/useFocusTrap', () => ({
  useFocusTrap: vi.fn(),
}))

// Mock content/queue helpers
vi.mock('@/utils/contentHelpers', () => ({
  getContentTypeBadge: (type: string) => {
    const badges: Record<string, { icon: () => React.ReactNode; color: string; bg: string }> = {
      youtube: { icon: () => <span data-testid="badge-youtube" />, color: 'text-red-500', bg: 'bg-red-500/20' },
      tweet: { icon: () => <span data-testid="badge-tweet" />, color: 'text-blue-400', bg: 'bg-blue-400/20' },
      reddit: { icon: () => <span data-testid="badge-reddit" />, color: 'text-orange-500', bg: 'bg-orange-500/20' },
      note: { icon: () => <span data-testid="badge-note" />, color: 'text-gray-400', bg: 'bg-gray-400/20' },
      image: { icon: () => <span data-testid="badge-image" />, color: 'text-purple-400', bg: 'bg-purple-400/20' },
    }
    return badges[type] || badges.note
  },
}))

vi.mock('@/utils/queueHelpers', () => ({
  getQueueItemTitle: (item: QueueItem) => item.title || item.noteContent || 'Item',
}))

function makeQueueItem(overrides: Partial<QueueItem> = {}): QueueItem {
  return {
    id: 'item-1',
    type: 'youtube',
    addedBy: 'TestUser',
    addedBySessionId: 'session-1',
    status: 'pending',
    position: 1,
    isCompleted: false,
    title: 'Test Video',
    thumbnail: 'https://example.com/thumb.jpg',
    ...overrides,
  }
}

// Default props factory
function defaultProps(overrides: Partial<React.ComponentProps<typeof QueueItemActionsSheet>> = {}) {
  return {
    item: makeQueueItem(),
    isOwnItem: true,
    onClose: vi.fn(),
    onShowNext: vi.fn(),
    onMoveUp: vi.fn(),
    onMoveDown: vi.fn(),
    onDelete: vi.fn(),
    onToggleComplete: vi.fn(),
    onViewNote: vi.fn(),
    onEditNote: vi.fn(),
    ...overrides,
  }
}

describe('QueueItemActionsSheet', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // 1. Renders dialog when item is provided
  it('renders dialog when item is provided', () => {
    render(<QueueItemActionsSheet {...defaultProps()} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  // 2. Does not render when item is null
  it('does not render when item is null', () => {
    render(<QueueItemActionsSheet {...defaultProps({ item: null })} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  // 3. Shows item info (title and addedBy)
  it('shows item title and addedBy', () => {
    render(<QueueItemActionsSheet {...defaultProps()} />)
    expect(screen.getByText('Test Video')).toBeInTheDocument()
    expect(screen.getByText('Added by TestUser')).toBeInTheDocument()
  })

  // 4. Shows Show Next action button
  it('shows the Show Next action button', () => {
    render(<QueueItemActionsSheet {...defaultProps()} />)
    expect(screen.getByText('Show Next')).toBeInTheDocument()
  })

  // 5. Calls onShowNext with item id
  it('calls onShowNext with item id when Show Next is clicked', async () => {
    const user = userEvent.setup()
    const onShowNext = vi.fn()
    render(<QueueItemActionsSheet {...defaultProps({ onShowNext })} />)

    await user.click(screen.getByText('Show Next'))

    expect(onShowNext).toHaveBeenCalledWith('item-1')
  })

  // 6. Calls onMoveUp with item id
  it('calls onMoveUp with item id when Move Up is clicked', async () => {
    const user = userEvent.setup()
    const onMoveUp = vi.fn()
    render(<QueueItemActionsSheet {...defaultProps({ onMoveUp })} />)

    await user.click(screen.getByText('Move Up'))

    expect(onMoveUp).toHaveBeenCalledWith('item-1')
  })

  // 7. Calls onMoveDown with item id
  it('calls onMoveDown with item id when Move Down is clicked', async () => {
    const user = userEvent.setup()
    const onMoveDown = vi.fn()
    render(<QueueItemActionsSheet {...defaultProps({ onMoveDown })} />)

    await user.click(screen.getByText('Move Down'))

    expect(onMoveDown).toHaveBeenCalledWith('item-1')
  })

  // 8. Calls onDelete when Remove from Queue is clicked
  it('calls onDelete when Remove from Queue is clicked', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn()
    render(<QueueItemActionsSheet {...defaultProps({ onDelete })} />)

    await user.click(screen.getByText('Remove from Queue'))

    expect(onDelete).toHaveBeenCalledTimes(1)
  })

  // 9. Cancel button calls onClose
  it('calls onClose when Cancel button is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<QueueItemActionsSheet {...defaultProps({ onClose })} />)

    await user.click(screen.getByText('Cancel'))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  // 10. Escape key calls onClose
  it('calls onClose when Escape key is pressed', () => {
    const onClose = vi.fn()
    render(<QueueItemActionsSheet {...defaultProps({ onClose })} />)

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  // 11. Note item shows Mark Complete action
  it('shows Mark Complete action for note items', () => {
    render(
      <QueueItemActionsSheet
        {...defaultProps({
          item: makeQueueItem({ type: 'note', noteContent: 'Test note', isCompleted: false }),
        })}
      />,
    )

    expect(screen.getByText('Mark Complete')).toBeInTheDocument()
  })

  // 12. Completed note shows Mark Incomplete
  it('shows Mark Incomplete action for completed note items', () => {
    render(
      <QueueItemActionsSheet
        {...defaultProps({
          item: makeQueueItem({ type: 'note', noteContent: 'Done note', isCompleted: true }),
        })}
      />,
    )

    expect(screen.getByText('Mark Incomplete')).toBeInTheDocument()
  })

  // 13. Note item shows View Note action
  it('shows View Note action for note items', () => {
    render(
      <QueueItemActionsSheet
        {...defaultProps({
          item: makeQueueItem({ type: 'note', noteContent: 'Test note' }),
        })}
      />,
    )

    expect(screen.getByText('View Note')).toBeInTheDocument()
  })

  // 14. Note item shows Edit Note action when isOwnItem is true
  it('shows Edit Note action for own note items', () => {
    render(
      <QueueItemActionsSheet
        {...defaultProps({
          item: makeQueueItem({ type: 'note', noteContent: 'Test note' }),
          isOwnItem: true,
        })}
      />,
    )

    expect(screen.getByText('Edit Note')).toBeInTheDocument()
  })

  // 15. Note item hides Edit Note action when isOwnItem is false
  it('hides Edit Note action when isOwnItem is false for note items', () => {
    render(
      <QueueItemActionsSheet
        {...defaultProps({
          item: makeQueueItem({ type: 'note', noteContent: 'Test note' }),
          isOwnItem: false,
        })}
      />,
    )

    expect(screen.queryByText('Edit Note')).not.toBeInTheDocument()
  })
})
