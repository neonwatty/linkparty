import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { QueueList } from './QueueList'
import type { QueueItem } from '../../hooks/useParty'

// Capture DndContext callbacks for drag-and-drop tests
let capturedOnDragEnd: ((event: { active: { id: string }; over: { id: string } | null }) => void) | null = null
let capturedOnDragStart: ((event: { active: { id: string } }) => void) | null = null

vi.mock('@dnd-kit/core', async () => {
  const actual = await vi.importActual('@dnd-kit/core')
  return {
    ...actual,
    DndContext: ({
      children,
      onDragEnd,
      onDragStart,
    }: {
      children: React.ReactNode
      onDragEnd?: typeof capturedOnDragEnd
      onDragStart?: typeof capturedOnDragStart
      [key: string]: unknown
    }) => {
      capturedOnDragEnd = onDragEnd ?? null
      capturedOnDragStart = onDragStart ?? null
      return <div data-testid="dnd-context">{children}</div>
    },
    DragOverlay: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="drag-overlay">{children}</div>
    ),
  }
})

vi.mock('@dnd-kit/sortable', async () => {
  const actual = await vi.importActual('@dnd-kit/sortable')
  return {
    ...actual,
    useSortable: ({ id }: { id: string }) => ({
      attributes: { role: 'button', 'aria-roledescription': 'sortable', 'data-sortable-id': id },
      listeners: { onPointerDown: vi.fn() },
      setNodeRef: vi.fn(),
      transform: null,
      transition: null,
    }),
  }
})

// Mock the icon components
vi.mock('../icons', () => ({
  DragIcon: () => <span data-testid="drag-icon">drag</span>,
  EditIcon: () => <span data-testid="edit-icon">edit</span>,
  CheckCircleIcon: ({ filled }: { filled?: boolean }) => (
    <span data-testid="check-icon" data-filled={filled}>check</span>
  ),
  ClockIcon: () => <span data-testid="clock-icon">clock</span>,
  AlertIcon: () => <span data-testid="alert-icon">alert</span>,
}))

// Mock the helper functions
vi.mock('../../utils/contentHelpers', () => ({
  getContentTypeBadge: (type: string) => ({
    icon: () => <span data-testid={`${type}-icon`}>{type}</span>,
    bg: 'bg-gray-500',
    color: 'text-gray-500',
  }),
}))

vi.mock('../../utils/queueHelpers', () => ({
  getQueueItemTitle: (item: QueueItem) => item.title || item.noteContent || 'Untitled',
  getQueueItemSubtitle: (item: QueueItem) => `Added by ${item.addedBy}`,
}))

vi.mock('../../utils/dateHelpers', () => ({
  isItemOverdue: () => false,
}))

const createMockItem = (overrides: Partial<QueueItem> = {}): QueueItem => ({
  id: 'item-1',
  type: 'youtube',
  addedBy: 'User 1',
  addedBySessionId: 'session-1',
  status: 'pending',
  position: 0,
  title: 'Test Video',
  isCompleted: false,
  ...overrides,
})

describe('QueueList', () => {
  const defaultProps = {
    items: [] as QueueItem[],
    currentSessionId: 'current-session',
    onItemClick: vi.fn(),
    onToggleComplete: vi.fn(),
  }

  it('renders correct number of items', () => {
    const items = [
      createMockItem({ id: 'item-1', title: 'Video 1' }),
      createMockItem({ id: 'item-2', title: 'Video 2' }),
      createMockItem({ id: 'item-3', title: 'Video 3' }),
    ]

    render(<QueueList {...defaultProps} items={items} />)

    expect(screen.getByText('Video 1')).toBeInTheDocument()
    expect(screen.getByText('Video 2')).toBeInTheDocument()
    expect(screen.getByText('Video 3')).toBeInTheDocument()
  })

  it('displays item count in header', () => {
    const items = [
      createMockItem({ id: 'item-1' }),
      createMockItem({ id: 'item-2' }),
    ]

    render(<QueueList {...defaultProps} items={items} />)

    expect(screen.getByText(/Up next · 2 items/)).toBeInTheDocument()
  })

  it('displays zero items in header when empty', () => {
    render(<QueueList {...defaultProps} items={[]} />)

    expect(screen.getByText(/Up next · 0 items/)).toBeInTheDocument()
  })

  it('calls onItemClick when item clicked', () => {
    const onItemClick = vi.fn()
    const items = [createMockItem({ id: 'item-1', title: 'Clickable Video' })]

    render(<QueueList {...defaultProps} items={items} onItemClick={onItemClick} />)

    fireEvent.click(screen.getByText('Clickable Video'))

    expect(onItemClick).toHaveBeenCalledTimes(1)
    expect(onItemClick).toHaveBeenCalledWith(items[0])
  })

  it('shows own-item indicator for matching sessionId', () => {
    const currentSessionId = 'my-session'
    const items = [
      createMockItem({ id: 'item-1', addedBySessionId: 'my-session', title: 'My Item' }),
      createMockItem({ id: 'item-2', addedBySessionId: 'other-session', title: 'Other Item' }),
    ]

    const { container } = render(
      <QueueList {...defaultProps} items={items} currentSessionId={currentSessionId} />
    )

    // The own-item indicator is a small teal dot inside the badge
    const tealDots = container.querySelectorAll('.bg-teal-500')
    expect(tealDots.length).toBe(1)
  })

  it('does not show own-item indicator for non-matching sessionId', () => {
    const currentSessionId = 'my-session'
    const items = [
      createMockItem({ id: 'item-1', addedBySessionId: 'other-session', title: 'Other Item' }),
    ]

    const { container } = render(
      <QueueList {...defaultProps} items={items} currentSessionId={currentSessionId} />
    )

    const tealDots = container.querySelectorAll('.bg-teal-500')
    expect(tealDots.length).toBe(0)
  })

  it('renders note items with checkbox', () => {
    const items = [
      createMockItem({ id: 'note-1', type: 'note', noteContent: 'Test note' }),
    ]

    render(<QueueList {...defaultProps} items={items} />)

    expect(screen.getByTestId('check-icon')).toBeInTheDocument()
  })

  it('renders non-note items with drag icon', () => {
    const items = [
      createMockItem({ id: 'video-1', type: 'youtube', title: 'Test Video' }),
    ]

    render(<QueueList {...defaultProps} items={items} />)

    expect(screen.getByTestId('drag-icon')).toBeInTheDocument()
  })

  it('calls onToggleComplete when note checkbox clicked', () => {
    const onToggleComplete = vi.fn()
    const items = [
      createMockItem({ id: 'note-1', type: 'note', noteContent: 'Test note' }),
    ]

    render(
      <QueueList {...defaultProps} items={items} onToggleComplete={onToggleComplete} />
    )

    const checkbox = screen.getByTestId('check-icon').parentElement
    if (checkbox) {
      fireEvent.click(checkbox)
    }

    expect(onToggleComplete).toHaveBeenCalledWith('note-1')
  })

  it('applies completed styling to completed items', () => {
    const items = [
      createMockItem({ id: 'item-1', title: 'Completed Item', isCompleted: true }),
    ]

    const { container } = render(<QueueList {...defaultProps} items={items} />)

    const queueItem = container.querySelector('.queue-item')
    expect(queueItem).toHaveClass('opacity-60')
  })

  it('shows line-through on completed item titles', () => {
    const items = [
      createMockItem({ id: 'item-1', title: 'Completed Item', isCompleted: true }),
    ]

    render(<QueueList {...defaultProps} items={items} />)

    const titleElement = screen.getByText('Completed Item')
    expect(titleElement).toHaveClass('line-through')
  })

  describe('Drag and drop', () => {
    beforeEach(() => {
      capturedOnDragEnd = null
      capturedOnDragStart = null
    })

    it('fires onReorder callback when drag ends with valid source and target', () => {
      const onReorder = vi.fn()
      const items = [
        createMockItem({ id: 'item-1', title: 'First', type: 'youtube' }),
        createMockItem({ id: 'item-2', title: 'Second', type: 'youtube' }),
      ]

      render(<QueueList {...defaultProps} items={items} onReorder={onReorder} />)

      expect(capturedOnDragEnd).not.toBeNull()

      act(() => {
        capturedOnDragEnd!({ active: { id: 'item-1' }, over: { id: 'item-2' } })
      })

      expect(onReorder).toHaveBeenCalledTimes(1)
      expect(onReorder).toHaveBeenCalledWith('item-1', 'item-2')
    })

    it('does not fire onReorder when drag ends on same item', () => {
      const onReorder = vi.fn()
      const items = [
        createMockItem({ id: 'item-1', title: 'First', type: 'youtube' }),
        createMockItem({ id: 'item-2', title: 'Second', type: 'youtube' }),
      ]

      render(<QueueList {...defaultProps} items={items} onReorder={onReorder} />)

      act(() => {
        capturedOnDragEnd!({ active: { id: 'item-1' }, over: { id: 'item-1' } })
      })

      expect(onReorder).not.toHaveBeenCalled()
    })

    it('sets aria-roledescription="sortable" on sortable items', () => {
      const items = [
        createMockItem({ id: 'item-1', title: 'Sortable Video', type: 'youtube' }),
      ]

      const { container } = render(<QueueList {...defaultProps} items={items} />)

      const sortableElements = container.querySelectorAll('[aria-roledescription="sortable"]')
      expect(sortableElements.length).toBeGreaterThanOrEqual(1)
    })

    it('shows drag handle icon for non-note items when onReorder is provided', () => {
      const items = [
        createMockItem({ id: 'yt-1', type: 'youtube', title: 'Video' }),
        createMockItem({ id: 'link-1', type: 'link', title: 'Link' }),
      ]

      render(<QueueList {...defaultProps} items={items} onReorder={vi.fn()} />)

      const dragIcons = screen.getAllByTestId('drag-icon')
      expect(dragIcons).toHaveLength(2)
    })

    it('shows no drag handle icons for note items', () => {
      const items = [
        createMockItem({ id: 'note-1', type: 'note', noteContent: 'Note 1' }),
        createMockItem({ id: 'note-2', type: 'note', noteContent: 'Note 2' }),
      ]

      render(<QueueList {...defaultProps} items={items} />)

      expect(screen.queryAllByTestId('drag-icon')).toHaveLength(0)
      expect(screen.getAllByTestId('check-icon')).toHaveLength(2)
    })

    it('renders DragOverlay with active item when dragging', () => {
      const items = [
        createMockItem({ id: 'item-1', title: 'Drag Me', type: 'youtube' }),
        createMockItem({ id: 'item-2', title: 'Target', type: 'youtube' }),
      ]

      const { rerender } = render(<QueueList {...defaultProps} items={items} onReorder={vi.fn()} />)

      // Before drag, overlay should be empty
      const overlay = screen.getByTestId('drag-overlay')
      expect(overlay.children).toHaveLength(0)

      // Simulate drag start to set activeId
      act(() => {
        capturedOnDragStart!({ active: { id: 'item-1' } })
      })

      // Re-render to reflect state change
      rerender(<QueueList {...defaultProps} items={items} onReorder={vi.fn()} />)

      // After drag start, overlay should contain the active item
      const overlayAfter = screen.getByTestId('drag-overlay')
      expect(overlayAfter.children.length).toBeGreaterThanOrEqual(1)
    })
  })
})
