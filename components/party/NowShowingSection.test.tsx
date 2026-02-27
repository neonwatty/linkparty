/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NowShowingSection } from './NowShowingSection'
import type { QueueItem } from '@/hooks/useParty'

// Mock icons as simple spans
vi.mock('@/components/icons', () => ({
  PlayIcon: () => <span data-testid="play-icon" />,
  SkipIcon: () => <span data-testid="skip-icon" />,
  TwitterIcon: ({ size }: { size?: number }) => <span data-testid="twitter-icon" data-size={size} />,
  RedditIcon: ({ size }: { size?: number }) => <span data-testid="reddit-icon" data-size={size} />,
  NoteIcon: ({ size }: { size?: number }) => <span data-testid="note-icon" data-size={size} />,
  ImageIcon: ({ size }: { size?: number }) => <span data-testid="image-icon" data-size={size} />,
}))

function makeQueueItem(overrides: Partial<QueueItem> = {}): QueueItem {
  return {
    id: 'item-1',
    type: 'youtube',
    addedBy: 'TestUser',
    addedBySessionId: 'session-1',
    status: 'showing',
    position: 0,
    isCompleted: false,
    ...overrides,
  }
}

// Default props factory
function defaultProps(overrides: Partial<React.ComponentProps<typeof NowShowingSection>> = {}) {
  return {
    currentItem: makeQueueItem(),
    isHost: false,
    onNext: vi.fn(),
    onImageClick: vi.fn(),
    ...overrides,
  }
}

describe('NowShowingSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // 1. Renders NOW SHOWING label
  it('renders the NOW SHOWING label', () => {
    render(<NowShowingSection {...defaultProps()} />)
    expect(screen.getByText('NOW SHOWING')).toBeInTheDocument()
  })

  // 2. Renders YouTube content with title and channel
  it('renders YouTube content with title and channel', () => {
    render(
      <NowShowingSection
        {...defaultProps({
          currentItem: makeQueueItem({
            type: 'youtube',
            title: 'Cool Video',
            channel: 'Cool Channel',
            thumbnail: 'https://example.com/thumb.jpg',
          }),
        })}
      />,
    )

    expect(screen.getByText('Cool Video')).toBeInTheDocument()
    expect(screen.getByText('Cool Channel')).toBeInTheDocument()
  })

  // 3. Renders tweet content with author and handle
  it('renders tweet content with author, handle, and text', () => {
    render(
      <NowShowingSection
        {...defaultProps({
          currentItem: makeQueueItem({
            type: 'tweet',
            tweetAuthor: 'John Doe',
            tweetHandle: '@johndoe',
            tweetContent: 'This is a tweet',
            tweetTimestamp: '2h ago',
          }),
        })}
      />,
    )

    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('@johndoe')).toBeInTheDocument()
    expect(screen.getByText('This is a tweet')).toBeInTheDocument()
  })

  // 4. Renders Reddit content with subreddit and title
  it('renders Reddit content with subreddit and title', () => {
    render(
      <NowShowingSection
        {...defaultProps({
          currentItem: makeQueueItem({
            type: 'reddit',
            subreddit: 'r/reactjs',
            redditTitle: 'Cool React Post',
            redditBody: 'Some body text',
            upvotes: 1500,
            commentCount: 42,
          }),
        })}
      />,
    )

    expect(screen.getByText('r/reactjs')).toBeInTheDocument()
    expect(screen.getByText('Cool React Post')).toBeInTheDocument()
    expect(screen.getByText('Some body text')).toBeInTheDocument()
  })

  // 5. Renders note content with addedBy
  it('renders note content with addedBy name', () => {
    render(
      <NowShowingSection
        {...defaultProps({
          currentItem: makeQueueItem({
            type: 'note',
            noteContent: 'Important reminder',
            addedBy: 'Alice',
          }),
        })}
      />,
    )

    expect(screen.getByText('Important reminder')).toBeInTheDocument()
    expect(screen.getByText('Note from Alice')).toBeInTheDocument()
  })

  // 6. Renders image content with caption
  it('renders image content with caption', () => {
    render(
      <NowShowingSection
        {...defaultProps({
          currentItem: makeQueueItem({
            type: 'image',
            imageUrl: 'https://example.com/image.jpg',
            imageCaption: 'A nice photo',
            addedBy: 'Bob',
          }),
        })}
      />,
    )

    expect(screen.getByText('A nice photo')).toBeInTheDocument()
    expect(screen.getByText(/Shared by Bob/)).toBeInTheDocument()
  })

  // 7. Image click calls onImageClick
  it('calls onImageClick when image is clicked', async () => {
    const user = userEvent.setup()
    const onImageClick = vi.fn()
    render(
      <NowShowingSection
        {...defaultProps({
          currentItem: makeQueueItem({
            type: 'image',
            imageUrl: 'https://example.com/image.jpg',
            imageCaption: 'A nice photo',
          }),
          onImageClick,
        })}
      />,
    )

    const img = screen.getByAltText('A nice photo')
    await user.click(img)

    expect(onImageClick).toHaveBeenCalledWith('https://example.com/image.jpg', 'A nice photo')
  })

  // 8. Shows Next button only when isHost is true
  it('shows Next button when isHost is true', () => {
    render(<NowShowingSection {...defaultProps({ isHost: true })} />)
    expect(screen.getByText('Next')).toBeInTheDocument()
  })

  // 9. Does not show Next button when isHost is false
  it('does not show Next button when isHost is false', () => {
    render(<NowShowingSection {...defaultProps({ isHost: false })} />)
    expect(screen.queryByText('Next')).not.toBeInTheDocument()
  })

  // 10. Calls onNext when Next button is clicked
  it('calls onNext when the Next button is clicked', async () => {
    const user = userEvent.setup()
    const onNext = vi.fn()
    render(<NowShowingSection {...defaultProps({ isHost: true, onNext })} />)

    await user.click(screen.getByText('Next'))

    expect(onNext).toHaveBeenCalledTimes(1)
  })

  // 11. Image fallback shows ImageIcon when imageUrl is missing
  it('renders image fallback icon when imageUrl is not provided', () => {
    render(
      <NowShowingSection
        {...defaultProps({
          currentItem: makeQueueItem({
            type: 'image',
            imageUrl: undefined,
          }),
        })}
      />,
    )

    expect(screen.getByTestId('image-icon')).toBeInTheDocument()
  })
})
