/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PartyHeader } from './PartyHeader'

// Mock icons as simple spans
vi.mock('@/components/icons', () => ({
  ChevronLeftIcon: () => <span data-testid="chevron-left-icon" />,
  TvIcon: () => <span data-testid="tv-icon" />,
  ShareIcon: () => <span data-testid="share-icon" />,
  MailIcon: () => <span data-testid="mail-icon" />,
}))

// Mock ExpirationBadge
vi.mock('./ExpirationBadge', () => ({
  ExpirationBadge: ({ expiresAt }: { expiresAt: string }) => <span data-testid="expiration-badge">{expiresAt}</span>,
}))

// Default props factory
function defaultProps(overrides: Partial<React.ComponentProps<typeof PartyHeader>> = {}) {
  return {
    partyName: 'Test Party',
    partyCode: 'ABC123',
    onLeave: vi.fn(),
    onTvMode: vi.fn(),
    onShare: vi.fn(),
    onInvite: vi.fn(),
    ...overrides,
  }
}

describe('PartyHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // 1. Renders party name
  it('renders the party name', () => {
    render(<PartyHeader {...defaultProps()} />)
    expect(screen.getByText('Test Party')).toBeInTheDocument()
  })

  // 2. Renders party code
  it('renders the party code', () => {
    render(<PartyHeader {...defaultProps()} />)
    expect(screen.getByTestId('party-code')).toHaveTextContent('ABC123')
  })

  // 3. Calls onLeave when leave button is clicked
  it('calls onLeave when the leave button is clicked', async () => {
    const user = userEvent.setup()
    const onLeave = vi.fn()
    render(<PartyHeader {...defaultProps({ onLeave })} />)

    await user.click(screen.getByLabelText('Leave party'))

    expect(onLeave).toHaveBeenCalledTimes(1)
  })

  // 4. Calls onTvMode when TV mode button is clicked
  it('calls onTvMode when the TV mode button is clicked', async () => {
    const user = userEvent.setup()
    const onTvMode = vi.fn()
    render(<PartyHeader {...defaultProps({ onTvMode })} />)

    await user.click(screen.getByLabelText('Open TV mode'))

    expect(onTvMode).toHaveBeenCalledTimes(1)
  })

  // 5. Calls onShare when share button is clicked
  it('calls onShare when the share button is clicked', async () => {
    const user = userEvent.setup()
    const onShare = vi.fn()
    render(<PartyHeader {...defaultProps({ onShare })} />)

    await user.click(screen.getByLabelText('Share party'))

    expect(onShare).toHaveBeenCalledTimes(1)
  })

  // 6. Calls onInvite when invite button is clicked
  it('calls onInvite when the invite button is clicked', async () => {
    const user = userEvent.setup()
    const onInvite = vi.fn()
    render(<PartyHeader {...defaultProps({ onInvite })} />)

    await user.click(screen.getByLabelText('Invite by email'))

    expect(onInvite).toHaveBeenCalledTimes(1)
  })

  // 7. Shows ExpirationBadge when expiresAt is provided
  it('shows ExpirationBadge when expiresAt is provided', () => {
    render(<PartyHeader {...defaultProps({ expiresAt: '2026-03-01T00:00:00Z' })} />)
    expect(screen.getByTestId('expiration-badge')).toBeInTheDocument()
  })

  // 8. Does not show ExpirationBadge when expiresAt is not provided
  it('does not show ExpirationBadge when expiresAt is not provided', () => {
    render(<PartyHeader {...defaultProps()} />)
    expect(screen.queryByTestId('expiration-badge')).not.toBeInTheDocument()
  })

  // 9. Renders all action buttons
  it('renders all action buttons', () => {
    render(<PartyHeader {...defaultProps()} />)
    expect(screen.getByLabelText('Leave party')).toBeInTheDocument()
    expect(screen.getByLabelText('Open TV mode')).toBeInTheDocument()
    expect(screen.getByLabelText('Invite by email')).toBeInTheDocument()
    expect(screen.getByLabelText('Share party')).toBeInTheDocument()
  })
})
