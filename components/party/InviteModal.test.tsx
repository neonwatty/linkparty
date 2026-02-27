/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InviteModal } from './InviteModal'

// Mock icons as simple spans
vi.mock('@/components/icons', () => ({
  MailIcon: () => <span data-testid="mail-icon" />,
  CloseIcon: () => <span data-testid="close-icon" />,
  CheckCircleIcon: () => <span data-testid="check-circle-icon" />,
  AlertIcon: () => <span data-testid="alert-icon" />,
}))

// Mock useFocusTrap to no-op
vi.mock('@/hooks/useFocusTrap', () => ({
  useFocusTrap: vi.fn(),
}))

// Mock FriendsPicker as a simple div
vi.mock('@/components/party/FriendsPicker', () => ({
  FriendsPicker: ({
    selectedIds,
    onSelectionChange,
  }: {
    selectedIds: string[]
    onSelectionChange: (ids: string[]) => void
  }) => (
    <div data-testid="friends-picker">
      <button data-testid="select-friend" onClick={() => onSelectionChange([...selectedIds, 'friend-1'])}>
        Select Friend
      </button>
    </div>
  ),
}))

// Mock supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
      }),
    },
  },
}))

// Default props factory
function defaultProps(overrides: Partial<React.ComponentProps<typeof InviteModal>> = {}) {
  return {
    isOpen: true,
    partyId: 'party-123',
    partyCode: 'ABC123',
    partyName: 'Test Party',
    inviterName: 'Test User',
    onClose: vi.fn(),
    ...overrides,
  }
}

describe('InviteModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  // 1. Renders when isOpen is true
  it('renders when isOpen is true', () => {
    render(<InviteModal {...defaultProps()} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Invite a Friend')).toBeInTheDocument()
  })

  // 2. Does not render when isOpen is false
  it('does not render when isOpen is false', () => {
    render(<InviteModal {...defaultProps({ isOpen: false })} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  // 3. Shows email tab by default with form fields
  it('shows email tab by default with email input and message textarea', () => {
    render(<InviteModal {...defaultProps()} />)
    expect(screen.getByPlaceholderText('friend@example.com')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Add a personal message (optional)')).toBeInTheDocument()
  })

  // 4. Shows Send Invite button on email tab
  it('shows Send Invite button on email tab', () => {
    render(<InviteModal {...defaultProps()} />)
    expect(screen.getByText('Send Invite')).toBeInTheDocument()
  })

  // 5. Send Invite button is disabled when email is empty
  it('disables Send Invite button when email is empty', () => {
    render(<InviteModal {...defaultProps()} />)
    expect(screen.getByText('Send Invite')).toBeDisabled()
  })

  // 6. Validates email format and shows error for invalid email
  it('shows error for invalid email format on send attempt', async () => {
    const user = userEvent.setup()
    render(<InviteModal {...defaultProps()} />)

    const emailInput = screen.getByPlaceholderText('friend@example.com')
    await user.type(emailInput, 'invalid-email')
    await user.click(screen.getByText('Send Invite'))

    expect(screen.getByText('Please enter a valid email address.')).toBeInTheDocument()
  })

  // 7. Calls onClose when close button is clicked
  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<InviteModal {...defaultProps({ onClose })} />)

    await user.click(screen.getByLabelText('Close modal'))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  // 8. Calls onClose when Escape key is pressed
  it('calls onClose when Escape key is pressed', () => {
    const onClose = vi.fn()
    render(<InviteModal {...defaultProps({ onClose })} />)

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  // 9. Calls onClose when Cancel button is clicked
  it('calls onClose when Cancel button is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<InviteModal {...defaultProps({ onClose })} />)

    await user.click(screen.getByText('Cancel'))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  // 10. Shows success message after successful send
  it('shows success message after successful email send', async () => {
    const user = userEvent.setup()
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    })

    render(<InviteModal {...defaultProps()} />)

    const emailInput = screen.getByPlaceholderText('friend@example.com')
    await user.type(emailInput, 'friend@test.com')
    await user.click(screen.getByText('Send Invite'))

    await waitFor(() => {
      expect(screen.getByText('Invite sent!')).toBeInTheDocument()
    })
  })

  // 11. Shows error message on fetch failure
  it('shows error message when email send fails', async () => {
    const user = userEvent.setup()
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Rate limit exceeded' }),
    })

    render(<InviteModal {...defaultProps()} />)

    const emailInput = screen.getByPlaceholderText('friend@example.com')
    await user.type(emailInput, 'friend@test.com')
    await user.click(screen.getByText('Send Invite'))

    await waitFor(() => {
      expect(screen.getByText('Rate limit exceeded')).toBeInTheDocument()
    })
  })

  // 12. Switches to Friends tab
  it('switches to Friends tab and shows FriendsPicker', async () => {
    const user = userEvent.setup()
    render(<InviteModal {...defaultProps()} />)

    await user.click(screen.getByText('Friends'))

    expect(screen.getByTestId('friends-picker')).toBeInTheDocument()
    expect(screen.getByText('Send Invites (0)')).toBeInTheDocument()
  })

  // 13. Friends tab Send Invites button is disabled with no selection
  it('disables Send Invites button when no friends are selected', async () => {
    const user = userEvent.setup()
    render(<InviteModal {...defaultProps()} />)

    await user.click(screen.getByText('Friends'))

    expect(screen.getByText('Send Invites (0)')).toBeDisabled()
  })

  // 14. Shows network error on fetch exception
  it('shows network error when fetch throws', async () => {
    const user = userEvent.setup()
    ;(global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network failure'))

    render(<InviteModal {...defaultProps()} />)

    const emailInput = screen.getByPlaceholderText('friend@example.com')
    await user.type(emailInput, 'friend@test.com')
    await user.click(screen.getByText('Send Invite'))

    await waitFor(() => {
      expect(screen.getByText('Network error. Please try again.')).toBeInTheDocument()
    })
  })

  // 15. Email input clears error state when typing after error
  it('clears error state when typing in email input after an error', async () => {
    const user = userEvent.setup()
    render(<InviteModal {...defaultProps()} />)

    const emailInput = screen.getByPlaceholderText('friend@example.com')
    await user.type(emailInput, 'bad')
    await user.click(screen.getByText('Send Invite'))

    expect(screen.getByText('Please enter a valid email address.')).toBeInTheDocument()

    await user.type(emailInput, '@')

    expect(screen.queryByText('Please enter a valid email address.')).not.toBeInTheDocument()
  })
})
