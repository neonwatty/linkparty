/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DeleteConfirmDialog } from './DeleteConfirmDialog'

// Mock icons as simple spans
vi.mock('@/components/icons', () => ({
  TrashIcon: () => <span data-testid="trash-icon" />,
}))

// Mock useFocusTrap to no-op
vi.mock('@/hooks/useFocusTrap', () => ({
  useFocusTrap: vi.fn(),
}))

// Default props factory
function defaultProps(overrides: Partial<React.ComponentProps<typeof DeleteConfirmDialog>> = {}) {
  return {
    isOpen: true,
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
    ...overrides,
  }
}

describe('DeleteConfirmDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // 1. Renders alert dialog when isOpen is true
  it('renders alert dialog when isOpen is true', () => {
    render(<DeleteConfirmDialog {...defaultProps()} />)
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
  })

  // 2. Does not render when isOpen is false
  it('does not render when isOpen is false', () => {
    render(<DeleteConfirmDialog {...defaultProps({ isOpen: false })} />)
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  // 3. Shows the confirmation title
  it('shows the confirmation title', () => {
    render(<DeleteConfirmDialog {...defaultProps()} />)
    expect(screen.getByText('Remove item?')).toBeInTheDocument()
  })

  // 4. Shows the confirmation description
  it('shows the confirmation description', () => {
    render(<DeleteConfirmDialog {...defaultProps()} />)
    expect(screen.getByText('This item will be removed from the queue.')).toBeInTheDocument()
  })

  // 5. Shows trash icon
  it('shows the trash icon', () => {
    render(<DeleteConfirmDialog {...defaultProps()} />)
    expect(screen.getByTestId('trash-icon')).toBeInTheDocument()
  })

  // 6. Calls onConfirm when Remove button is clicked
  it('calls onConfirm when the Remove button is clicked', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(<DeleteConfirmDialog {...defaultProps({ onConfirm })} />)

    await user.click(screen.getByText('Remove'))

    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  // 7. Calls onCancel when Cancel button is clicked
  it('calls onCancel when the Cancel button is clicked', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    render(<DeleteConfirmDialog {...defaultProps({ onCancel })} />)

    await user.click(screen.getByText('Cancel'))

    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  // 8. Calls onCancel when Escape key is pressed
  it('calls onCancel when Escape key is pressed', () => {
    const onCancel = vi.fn()
    render(<DeleteConfirmDialog {...defaultProps({ onCancel })} />)

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  // 9. Does not call onCancel on Escape when closed
  it('does not call onCancel on Escape when dialog is closed', () => {
    const onCancel = vi.fn()
    render(<DeleteConfirmDialog {...defaultProps({ isOpen: false, onCancel })} />)

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(onCancel).not.toHaveBeenCalled()
  })
})
