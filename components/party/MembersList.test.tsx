/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MembersList } from './MembersList'

// Mock icons as simple spans
vi.mock('@/components/icons', () => ({
  UsersIcon: () => <span data-testid="users-icon" />,
}))

interface Member {
  id: string
  sessionId: string
  name: string
  avatar: string
  isHost: boolean
  userId?: string
}

function makeMember(overrides: Partial<Member> = {}): Member {
  return {
    id: 'member-1',
    sessionId: 'session-1',
    name: 'Alice',
    avatar: '🎉',
    isHost: false,
    ...overrides,
  }
}

// Default props factory
function defaultProps(overrides: Partial<React.ComponentProps<typeof MembersList>> = {}) {
  return {
    members: [
      makeMember({ id: 'member-1', sessionId: 'session-1', name: 'Alice', isHost: true, userId: 'user-1' }),
      makeMember({ id: 'member-2', sessionId: 'session-2', name: 'Bob', userId: 'user-2' }),
    ],
    currentSessionId: 'session-1',
    ...overrides,
  }
}

describe('MembersList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // 1. Renders the watching count
  it('renders the watching count', () => {
    render(<MembersList {...defaultProps()} />)
    expect(screen.getByText('2 watching')).toBeInTheDocument()
  })

  // 2. Renders the users icon
  it('renders the users icon', () => {
    render(<MembersList {...defaultProps()} />)
    expect(screen.getByTestId('users-icon')).toBeInTheDocument()
  })

  // 3. Shows "You" for the current user
  it('shows "You" for the current user instead of their name', () => {
    render(<MembersList {...defaultProps()} />)
    expect(screen.getByText('You')).toBeInTheDocument()
  })

  // 4. Shows other members by name
  it('shows other members by their name', () => {
    render(<MembersList {...defaultProps()} />)
    expect(screen.getByText('Bob')).toBeInTheDocument()
  })

  // 5. Shows HOST badge for host member
  it('shows HOST badge for the host member', () => {
    render(<MembersList {...defaultProps()} />)
    expect(screen.getByText('HOST')).toBeInTheDocument()
  })

  // 6. Does not show HOST badge for non-host members
  it('shows only one HOST badge', () => {
    render(<MembersList {...defaultProps()} />)
    const hostBadges = screen.getAllByText('HOST')
    expect(hostBadges).toHaveLength(1)
  })

  // 7. Shows add friend button when friendshipStatus is 'none'
  it('shows add friend button when friendship status is none', () => {
    const onAddFriend = vi.fn()
    render(
      <MembersList
        {...defaultProps({
          friendshipStatuses: { 'user-2': 'none' },
          onAddFriend,
        })}
      />,
    )

    expect(screen.getByLabelText('Add Bob as friend')).toBeInTheDocument()
  })

  // 8. Calls onAddFriend with correct userId when add friend button is clicked
  it('calls onAddFriend with correct userId when add friend is clicked', async () => {
    const user = userEvent.setup()
    const onAddFriend = vi.fn()
    render(
      <MembersList
        {...defaultProps({
          friendshipStatuses: { 'user-2': 'none' },
          onAddFriend,
        })}
      />,
    )

    await user.click(screen.getByLabelText('Add Bob as friend'))

    expect(onAddFriend).toHaveBeenCalledWith('user-2')
  })

  // 9. Shows "Sent" for pending_sent friendship status
  it('shows Sent label for pending_sent friendship status', () => {
    render(
      <MembersList
        {...defaultProps({
          friendshipStatuses: { 'user-2': 'pending_sent' },
        })}
      />,
    )

    expect(screen.getByText('Sent')).toBeInTheDocument()
  })

  // 10. Does not show add friend button for current user
  it('does not show add friend button for the current user', () => {
    render(
      <MembersList
        {...defaultProps({
          friendshipStatuses: { 'user-1': 'none', 'user-2': 'none' },
          onAddFriend: vi.fn(),
        })}
      />,
    )

    // Only Bob should have the add friend button, not the current user (Alice)
    expect(screen.queryByLabelText('Add Alice as friend')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Add Bob as friend')).toBeInTheDocument()
  })

  // 11. Does not show add friend button when member has no userId
  it('does not show add friend button for members without userId', () => {
    render(
      <MembersList
        {...defaultProps({
          members: [
            makeMember({ id: 'member-1', sessionId: 'session-1', name: 'Alice', isHost: true }),
            makeMember({ id: 'member-2', sessionId: 'session-2', name: 'Guest' }),
          ],
          currentSessionId: 'session-1',
          friendshipStatuses: {},
          onAddFriend: vi.fn(),
        })}
      />,
    )

    expect(screen.queryByLabelText('Add Guest as friend')).not.toBeInTheDocument()
  })

  // 12. Renders member avatars
  it('renders member avatars', () => {
    render(<MembersList {...defaultProps()} />)
    expect(screen.getAllByText('🎉')).toHaveLength(2)
  })
})
