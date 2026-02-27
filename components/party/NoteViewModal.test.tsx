/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NoteViewModal } from './NoteViewModal'
import type { QueueItem } from '@/hooks/useParty'

// Mock icons as simple spans
vi.mock('@/components/icons', () => ({
  NoteIcon: ({ size }: { size?: number }) => <span data-testid="note-icon" data-size={size} />,
  CloseIcon: () => <span data-testid="close-icon" />,
  EditIcon: () => <span data-testid="edit-icon" />,
}))

// Mock useFocusTrap to no-op
vi.mock('@/hooks/useFocusTrap', () => ({
  useFocusTrap: vi.fn(),
}))

function makeNote(overrides: Partial<QueueItem> = {}): QueueItem {
  return {
    id: 'note-1',
    type: 'note',
    addedBy: 'Alice',
    addedBySessionId: 'session-1',
    status: 'pending',
    position: 0,
    isCompleted: false,
    noteContent: 'This is a test note',
    ...overrides,
  }
}

// Default props factory
function defaultProps(overrides: Partial<React.ComponentProps<typeof NoteViewModal>> = {}) {
  return {
    isOpen: true,
    note: makeNote(),
    isOwnNote: false,
    onClose: vi.fn(),
    onEdit: vi.fn(),
    ...overrides,
  }
}

describe('NoteViewModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // 1. Renders dialog when isOpen is true and note is provided
  it('renders dialog when isOpen is true and note is provided', () => {
    render(<NoteViewModal {...defaultProps()} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  // 2. Does not render when isOpen is false
  it('does not render when isOpen is false', () => {
    render(<NoteViewModal {...defaultProps({ isOpen: false })} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  // 3. Does not render when note is null
  it('does not render when note is null', () => {
    render(<NoteViewModal {...defaultProps({ note: null })} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  // 4. Displays note content
  it('displays the note content', () => {
    render(<NoteViewModal {...defaultProps()} />)
    expect(screen.getByText('This is a test note')).toBeInTheDocument()
  })

  // 5. Displays addedBy name
  it('displays the note author name', () => {
    render(<NoteViewModal {...defaultProps()} />)
    expect(screen.getByText('Added by Alice')).toBeInTheDocument()
  })

  // 6. Shows Edit button when isOwnNote is true
  it('shows Edit button when isOwnNote is true', () => {
    render(<NoteViewModal {...defaultProps({ isOwnNote: true })} />)
    expect(screen.getByText('Edit')).toBeInTheDocument()
  })

  // 7. Hides Edit button when isOwnNote is false
  it('hides Edit button when isOwnNote is false', () => {
    render(<NoteViewModal {...defaultProps({ isOwnNote: false })} />)
    expect(screen.queryByText('Edit')).not.toBeInTheDocument()
  })

  // 8. Calls onEdit when Edit button is clicked
  it('calls onEdit when the Edit button is clicked', async () => {
    const user = userEvent.setup()
    const onEdit = vi.fn()
    render(<NoteViewModal {...defaultProps({ isOwnNote: true, onEdit })} />)

    await user.click(screen.getByText('Edit'))

    expect(onEdit).toHaveBeenCalledTimes(1)
  })

  // 9. Calls onClose when Done button is clicked
  it('calls onClose when the Done button is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<NoteViewModal {...defaultProps({ onClose })} />)

    await user.click(screen.getByText('Done'))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  // 10. Calls onClose when close button (X) is clicked
  it('calls onClose when the close button (X) is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<NoteViewModal {...defaultProps({ onClose })} />)

    await user.click(screen.getByLabelText('Close modal'))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  // 11. Calls onClose when Escape key is pressed
  it('calls onClose when Escape key is pressed', () => {
    const onClose = vi.fn()
    render(<NoteViewModal {...defaultProps({ onClose })} />)

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  // 12. Shows Note heading
  it('shows the Note heading', () => {
    render(<NoteViewModal {...defaultProps()} />)
    expect(screen.getByText('Note')).toBeInTheDocument()
  })
})
