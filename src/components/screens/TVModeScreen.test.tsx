/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TVModeScreen } from './TVModeScreen'

// Mock icons as simple spans
vi.mock('../icons', () => ({
  ChevronLeftIcon: () => <span data-testid="chevron-left-icon" />,
  TwitterIcon: ({ size }: { size?: number }) => <span data-testid="twitter-icon" data-size={size} />,
  RedditIcon: ({ size }: { size?: number }) => <span data-testid="reddit-icon" data-size={size} />,
  NoteIcon: ({ size }: { size?: number }) => <span data-testid="note-icon" data-size={size} />,
  ImageIcon: ({ size }: { size?: number }) => <span data-testid="image-icon" data-size={size} />,
  UsersIcon: () => <span data-testid="users-icon" />,
  YoutubeIcon: ({ size }: { size?: number }) => <span data-testid="youtube-icon" data-size={size} />,
}))

// Mock ImageLightbox
vi.mock('../ui/ImageLightbox', () => ({
  ImageLightbox: ({ imageUrl, caption, isOpen, onClose }: Record<string, unknown>) =>
    isOpen ? (
      <div data-testid="image-lightbox" data-url={imageUrl} data-caption={caption}>
        <button onClick={onClose as () => void}>Close lightbox</button>
      </div>
    ) : null,
}))

// Mock useParty hook
const mockUseParty = vi.fn()
vi.mock('../../hooks/useParty', () => ({
  useParty: (...args: unknown[]) => mockUseParty(...args),
}))

// Mock content/queue helpers
vi.mock('../../utils/contentHelpers', () => ({
  getContentTypeBadge: (type: string) => {
    const badges: Record<string, { icon: () => JSX.Element; color: string; bg: string }> = {
      youtube: { icon: () => <span data-testid="badge-youtube" />, color: 'text-red-500', bg: 'bg-red-500/20' },
      tweet: { icon: () => <span data-testid="badge-tweet" />, color: 'text-blue-400', bg: 'bg-blue-400/20' },
      reddit: { icon: () => <span data-testid="badge-reddit" />, color: 'text-orange-500', bg: 'bg-orange-500/20' },
      note: { icon: () => <span data-testid="badge-note" />, color: 'text-gray-400', bg: 'bg-gray-400/20' },
      image: { icon: () => <span data-testid="badge-image" />, color: 'text-purple-400', bg: 'bg-purple-400/20' },
    }
    return badges[type] || badges.note
  },
}))

vi.mock('../../utils/queueHelpers', () => ({
  getQueueItemTitle: (item: { title?: string; noteContent?: string }) => item.title || item.noteContent || 'Item',
}))

function makeQueueItem(overrides: Record<string, unknown> = {}) {
  return {
    id: 'item-1',
    type: 'youtube',
    addedBy: 'TestUser',
    addedBySessionId: 'session-1',
    status: 'showing',
    position: 0,
    isCompleted: false,
    title: 'Test Video',
    channel: 'Test Channel',
    thumbnail: 'https://example.com/thumb.jpg',
    ...overrides,
  }
}

// Default props factory
function defaultProps(overrides: Partial<React.ComponentProps<typeof TVModeScreen>> = {}) {
  return {
    onNavigate: vi.fn(),
    partyId: 'party-123',
    partyCode: 'ABC123',
    ...overrides,
  }
}

describe('TVModeScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseParty.mockReturnValue({
      queue: [makeQueueItem()],
      members: [{ id: 'm1', name: 'Host', sessionId: 's1' }],
      partyInfo: { name: 'Test Party' },
    })
  })

  // 1. Renders the exit button
  it('renders the Exit button', () => {
    render(<TVModeScreen {...defaultProps()} />)
    expect(screen.getByLabelText('Exit TV mode')).toBeInTheDocument()
    expect(screen.getByText('Exit')).toBeInTheDocument()
  })

  // 2. Calls onNavigate('party') when Exit is clicked
  it('calls onNavigate with party when Exit is clicked', async () => {
    const user = userEvent.setup()
    const onNavigate = vi.fn()
    render(<TVModeScreen {...defaultProps({ onNavigate })} />)

    await user.click(screen.getByLabelText('Exit TV mode'))

    expect(onNavigate).toHaveBeenCalledWith('party')
  })

  // 3. Renders YouTube content when current item is youtube
  it('renders YouTube content with thumbnail', () => {
    render(<TVModeScreen {...defaultProps()} />)
    const img = screen.getByAltText('Test Video')
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', 'https://example.com/thumb.jpg')
  })

  // 4. Shows NOW SHOWING section with title
  it('shows NOW SHOWING section with current item title', () => {
    render(<TVModeScreen {...defaultProps()} />)
    expect(screen.getByText('NOW SHOWING')).toBeInTheDocument()
    expect(screen.getByText('Test Video')).toBeInTheDocument()
  })

  // 5. Shows empty state when no current item
  it('shows empty state when no content is showing', () => {
    mockUseParty.mockReturnValue({
      queue: [],
      members: [],
      partyInfo: { name: 'Empty Party' },
    })

    render(<TVModeScreen {...defaultProps()} />)
    expect(screen.getByText('No content showing')).toBeInTheDocument()
    expect(screen.getByText('Add items to the queue to get started')).toBeInTheDocument()
  })

  // 6. Shows party code in bottom bar
  it('shows the party code in the bottom bar', () => {
    render(<TVModeScreen {...defaultProps()} />)
    expect(screen.getByText('ABC123')).toBeInTheDocument()
  })

  // 7. Shows member count
  it('shows the member count', () => {
    render(<TVModeScreen {...defaultProps()} />)
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  // 8. Renders tweet content
  it('renders tweet content when current item is a tweet', () => {
    mockUseParty.mockReturnValue({
      queue: [
        makeQueueItem({
          type: 'tweet',
          tweetAuthor: 'JaneDoe',
          tweetHandle: '@janedoe',
          tweetContent: 'Hello world tweet',
          tweetTimestamp: '2h ago',
          status: 'showing',
        }),
      ],
      members: [],
      partyInfo: { name: 'Test Party' },
    })

    render(<TVModeScreen {...defaultProps()} />)
    expect(screen.getAllByText('JaneDoe').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('@janedoe')).toBeInTheDocument()
    expect(screen.getByText('Hello world tweet')).toBeInTheDocument()
  })

  // 9. Renders note content
  it('renders note content when current item is a note', () => {
    mockUseParty.mockReturnValue({
      queue: [
        makeQueueItem({
          type: 'note',
          noteContent: 'Important reminder',
          addedBy: 'Alice',
          status: 'showing',
        }),
      ],
      members: [],
      partyInfo: { name: 'Test Party' },
    })

    render(<TVModeScreen {...defaultProps()} />)
    expect(screen.getByText('Important reminder')).toBeInTheDocument()
    expect(screen.getByText('Note from Alice')).toBeInTheDocument()
  })

  // 10. Renders image content
  it('renders image content when current item is an image', () => {
    mockUseParty.mockReturnValue({
      queue: [
        makeQueueItem({
          type: 'image',
          imageUrl: 'https://example.com/photo.jpg',
          imageCaption: 'A nice photo',
          addedBy: 'Bob',
          status: 'showing',
        }),
      ],
      members: [],
      partyInfo: { name: 'Test Party' },
    })

    render(<TVModeScreen {...defaultProps()} />)
    const img = screen.getByAltText('A nice photo')
    expect(img).toBeInTheDocument()
    expect(screen.getByText('A nice photo')).toBeInTheDocument()
  })

  // 11. Shows "Nothing playing" in bottom bar when no current item
  it('shows Nothing playing in bottom bar when no current item', () => {
    mockUseParty.mockReturnValue({
      queue: [],
      members: [],
      partyInfo: { name: 'Test Party' },
    })

    render(<TVModeScreen {...defaultProps()} />)
    expect(screen.getByText('Nothing playing')).toBeInTheDocument()
  })

  // 12. Shows party name in bottom bar
  it('shows party name in the bottom bar', () => {
    render(<TVModeScreen {...defaultProps()} />)
    expect(screen.getByText('Test Party')).toBeInTheDocument()
  })

  // 13. Shows UP NEXT section when pending items exist
  it('shows UP NEXT section when pending items exist', () => {
    mockUseParty.mockReturnValue({
      queue: [
        makeQueueItem({ id: 'item-1', status: 'showing' }),
        makeQueueItem({ id: 'item-2', status: 'pending', position: 1, title: 'Next Video' }),
      ],
      members: [],
      partyInfo: { name: 'Test Party' },
    })

    render(<TVModeScreen {...defaultProps()} />)
    expect(screen.getByText('UP NEXT')).toBeInTheDocument()
  })
})
