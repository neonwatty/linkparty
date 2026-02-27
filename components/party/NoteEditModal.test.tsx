/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NoteEditModal } from './NoteEditModal'

// Mock icons as simple spans
vi.mock('@/components/icons', () => ({
  EditIcon: () => <span data-testid="edit-icon" />,
  CloseIcon: () => <span data-testid="close-icon" />,
}))

// Mock useFocusTrap to no-op
vi.mock('@/hooks/useFocusTrap', () => ({
  useFocusTrap: vi.fn(),
}))

// Default props factory
function defaultProps(overrides: Partial<React.ComponentProps<typeof NoteEditModal>> = {}) {
  return {
    isOpen: true,
    noteText: '',
    onNoteTextChange: vi.fn(),
    onSave: vi.fn(),
    onCancel: vi.fn(),
    ...overrides,
  }
}

describe('NoteEditModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // 1. Renders dialog when isOpen is true
  it('renders dialog when isOpen is true', () => {
    render(<NoteEditModal {...defaultProps()} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Edit Note')).toBeInTheDocument()
  })

  // 2. Does not render when isOpen is false
  it('does not render when isOpen is false', () => {
    render(<NoteEditModal {...defaultProps({ isOpen: false })} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  // 3. Shows textarea with current text
  it('shows textarea with current note text', () => {
    render(<NoteEditModal {...defaultProps({ noteText: 'Hello world' })} />)
    const textarea = screen.getByPlaceholderText('Write your note...')
    expect(textarea).toHaveValue('Hello world')
  })

  // 4. Calls onNoteTextChange when typing in textarea
  it('calls onNoteTextChange when typing in the textarea', () => {
    const onNoteTextChange = vi.fn()
    render(<NoteEditModal {...defaultProps({ onNoteTextChange })} />)

    const textarea = screen.getByPlaceholderText('Write your note...')
    fireEvent.change(textarea, { target: { value: 'New text' } })

    expect(onNoteTextChange).toHaveBeenCalledWith('New text')
  })

  // 5. Shows character counter
  it('shows character counter with current length', () => {
    render(<NoteEditModal {...defaultProps({ noteText: 'Hello' })} />)
    expect(screen.getByText('5/1000')).toBeInTheDocument()
  })

  // 6. Character counter warns at 900+ chars
  it('applies warning style to character counter at 900+ chars', () => {
    const longText = 'a'.repeat(950)
    render(<NoteEditModal {...defaultProps({ noteText: longText })} />)
    const counter = screen.getByText('950/1000')
    expect(counter).toHaveClass('text-yellow-400')
  })

  // 7. Character counter is normal style under 900 chars
  it('applies normal style to character counter under 900 chars', () => {
    render(<NoteEditModal {...defaultProps({ noteText: 'Hello' })} />)
    const counter = screen.getByText('5/1000')
    expect(counter).toHaveClass('text-text-muted')
  })

  // 8. Save Note button is disabled when note text is empty
  it('disables Save Note button when note text is empty', () => {
    render(<NoteEditModal {...defaultProps({ noteText: '' })} />)
    expect(screen.getByText('Save Note')).toBeDisabled()
  })

  // 9. Save Note button is disabled when note text is only whitespace
  it('disables Save Note button when note text is only whitespace', () => {
    render(<NoteEditModal {...defaultProps({ noteText: '   ' })} />)
    expect(screen.getByText('Save Note')).toBeDisabled()
  })

  // 10. Save Note button is enabled with valid text
  it('enables Save Note button when note text has content', () => {
    render(<NoteEditModal {...defaultProps({ noteText: 'Valid note' })} />)
    expect(screen.getByText('Save Note')).not.toBeDisabled()
  })

  // 11. Calls onSave when Save Note is clicked
  it('calls onSave when the Save Note button is clicked', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<NoteEditModal {...defaultProps({ noteText: 'Some text', onSave })} />)

    await user.click(screen.getByText('Save Note'))

    expect(onSave).toHaveBeenCalledTimes(1)
  })

  // 12. Calls onCancel when Cancel is clicked
  it('calls onCancel when the Cancel button is clicked', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    render(<NoteEditModal {...defaultProps({ onCancel })} />)

    await user.click(screen.getByText('Cancel'))

    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  // 13. Calls onCancel when Escape key is pressed
  it('calls onCancel when Escape key is pressed', () => {
    const onCancel = vi.fn()
    render(<NoteEditModal {...defaultProps({ onCancel })} />)

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  // 14. Calls onCancel when close button is clicked
  it('calls onCancel when the close button (X) is clicked', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    render(<NoteEditModal {...defaultProps({ onCancel })} />)

    await user.click(screen.getByLabelText('Close modal'))

    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})
