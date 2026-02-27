/// <reference types="@testing-library/jest-dom/vitest" />
import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TVModeClient from './TVModeClient'

// Mock next/navigation
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useParams: () => ({ id: 'test-party' }),
}))

// Mock supabase helpers
const mockGetSessionId = vi.fn(() => 'host-session')
vi.mock('@/lib/supabase', () => ({
  getSessionId: () => mockGetSessionId(),
  getCurrentParty: () => ({ partyCode: 'ABC123' }),
}))

// Mock PartyContext
const mockAdvanceQueue = vi.fn()
const mockUsePartyContext = vi.fn()
vi.mock('@/contexts/PartyContext', () => ({
  usePartyContext: () => mockUsePartyContext(),
}))

// Mock icons
vi.mock('@/components/icons', () => ({
  ChevronLeftIcon: () => <span data-testid="chevron-left-icon" />,
  TwitterIcon: ({ size }: { size?: number }) => <span data-testid="twitter-icon" data-size={size} />,
  RedditIcon: ({ size }: { size?: number }) => <span data-testid="reddit-icon" data-size={size} />,
  NoteIcon: ({ size }: { size?: number }) => <span data-testid="note-icon" data-size={size} />,
  ImageIcon: ({ size }: { size?: number }) => <span data-testid="image-icon" data-size={size} />,
  UsersIcon: () => <span data-testid="users-icon" />,
  SkipIcon: () => <span data-testid="skip-icon" />,
}))

// Mock ImageLightbox
vi.mock('@/components/ui/ImageLightbox', () => ({
  ImageLightbox: ({ isOpen, onClose }: Record<string, unknown>) =>
    isOpen ? (
      <div data-testid="image-lightbox">
        <button onClick={onClose as () => void}>Close lightbox</button>
      </div>
    ) : null,
}))

// Mock helpers
vi.mock('@/utils/queueHelpers', () => ({
  getQueueItemTitle: (item: { title?: string; noteContent?: string }) => item.title || item.noteContent || 'Item',
}))

vi.mock('@/utils/contentHelpers', () => ({
  getContentTypeBadge: (type: string) => {
    const badges: Record<string, { icon: () => React.ReactElement; color: string; bg: string }> = {
      youtube: { icon: () => <span data-testid="badge-youtube" />, color: 'text-red-500', bg: 'bg-red-500/20' },
      note: { icon: () => <span data-testid="badge-note" />, color: 'text-gray-400', bg: 'bg-gray-400/20' },
    }
    return badges[type] || badges.note
  },
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

function setupHostContext() {
  mockGetSessionId.mockReturnValue('host-session')
  mockAdvanceQueue.mockClear()
  mockUsePartyContext.mockReturnValue({
    queue: [
      makeQueueItem({ id: 'item-1', status: 'showing' }),
      makeQueueItem({ id: 'item-2', status: 'pending', position: 1, title: 'Next Video' }),
    ],
    members: [{ id: 'm1', name: 'Host', sessionId: 'host-session' }],
    partyInfo: { name: 'Test Party', hostSessionId: 'host-session' },
    advanceQueue: mockAdvanceQueue,
  })
}

function setupGuestContext() {
  mockGetSessionId.mockReturnValue('guest-session')
  mockAdvanceQueue.mockClear()
  mockUsePartyContext.mockReturnValue({
    queue: [
      makeQueueItem({ id: 'item-1', status: 'showing' }),
      makeQueueItem({ id: 'item-2', status: 'pending', position: 1, title: 'Next Video' }),
    ],
    members: [{ id: 'm1', name: 'Host', sessionId: 'host-session' }],
    partyInfo: { name: 'Test Party', hostSessionId: 'host-session' },
    advanceQueue: mockAdvanceQueue,
  })
}

describe('TVModeClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupHostContext()
  })

  it('renders the Exit button', () => {
    render(<TVModeClient />)
    expect(screen.getByLabelText('Exit TV mode')).toBeInTheDocument()
  })

  it('navigates back on Exit click', async () => {
    const user = userEvent.setup()
    render(<TVModeClient />)
    await user.click(screen.getByLabelText('Exit TV mode'))
    expect(mockPush).toHaveBeenCalledWith('/party/test-party')
  })

  it('shows NOW SHOWING with current item title', () => {
    render(<TVModeClient />)
    expect(screen.getByText('NOW SHOWING')).toBeInTheDocument()
    expect(screen.getByText('Test Video')).toBeInTheDocument()
  })

  it('shows Next button for host', () => {
    render(<TVModeClient />)
    expect(screen.getByLabelText('Show next item')).toBeInTheDocument()
  })

  it('Next button calls advanceQueue', async () => {
    const user = userEvent.setup()
    render(<TVModeClient />)
    await user.click(screen.getByLabelText('Show next item'))
    expect(mockAdvanceQueue).toHaveBeenCalledTimes(1)
  })

  describe('Auto-advance', () => {
    beforeEach(() => {
      mockAdvanceQueue.mockClear()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('host sees auto-advance toggle button', () => {
      setupHostContext()
      render(<TVModeClient />)
      expect(screen.getByLabelText('Enable auto-advance')).toBeInTheDocument()
      expect(screen.getByText('Auto')).toBeInTheDocument()
    })

    it('non-host does NOT see auto-advance controls', () => {
      setupGuestContext()
      render(<TVModeClient />)
      expect(screen.queryByLabelText('Enable auto-advance')).not.toBeInTheDocument()
      expect(screen.queryByLabelText('Disable auto-advance')).not.toBeInTheDocument()
      expect(screen.queryByLabelText('Show next item')).not.toBeInTheDocument()
    })

    it('clicking Auto toggle shows green background class', async () => {
      setupHostContext()
      const user = userEvent.setup()
      render(<TVModeClient />)

      const toggleBtn = screen.getByLabelText('Enable auto-advance')
      expect(toggleBtn.className).toContain('bg-white/10')
      expect(toggleBtn.className).not.toContain('bg-green-600')

      await user.click(toggleBtn)

      const activeBtn = screen.getByLabelText('Disable auto-advance')
      expect(activeBtn.className).toContain('bg-green-600')
    })

    it('after toggling on, interval selector appears with 6 options', async () => {
      setupHostContext()
      const user = userEvent.setup()
      render(<TVModeClient />)

      // Initially no interval selector
      expect(screen.queryByLabelText('Auto-advance interval')).not.toBeInTheDocument()

      await user.click(screen.getByLabelText('Enable auto-advance'))

      const select = screen.getByLabelText('Auto-advance interval')
      expect(select).toBeInTheDocument()

      const options = select.querySelectorAll('option')
      expect(options).toHaveLength(6)
      expect(options[0]).toHaveTextContent('10s')
      expect(options[1]).toHaveTextContent('15s')
      expect(options[2]).toHaveTextContent('30s')
      expect(options[3]).toHaveTextContent('1m')
      expect(options[4]).toHaveTextContent('2m')
      expect(options[5]).toHaveTextContent('5m')
    })

    it('auto-advance calls advanceQueue after interval', () => {
      vi.useFakeTimers()
      setupHostContext()
      render(<TVModeClient />)

      // Enable auto-advance (use fireEvent to avoid fake timer conflicts)
      fireEvent.click(screen.getByLabelText('Enable auto-advance'))

      expect(mockAdvanceQueue).not.toHaveBeenCalled()

      // Default interval is 30s = 30000ms
      act(() => {
        vi.advanceTimersByTime(30000)
      })
      expect(mockAdvanceQueue).toHaveBeenCalledTimes(1)

      // Fires again after another interval
      act(() => {
        vi.advanceTimersByTime(30000)
      })
      expect(mockAdvanceQueue).toHaveBeenCalledTimes(2)
    })

    it('auto-advance stops when toggled off', () => {
      vi.useFakeTimers()
      setupHostContext()
      render(<TVModeClient />)

      // Enable auto-advance
      fireEvent.click(screen.getByLabelText('Enable auto-advance'))

      // Confirm it fires once
      act(() => {
        vi.advanceTimersByTime(30000)
      })
      expect(mockAdvanceQueue).toHaveBeenCalledTimes(1)

      // Toggle off
      fireEvent.click(screen.getByLabelText('Disable auto-advance'))

      // Should NOT fire again
      act(() => {
        vi.advanceTimersByTime(30000)
      })
      expect(mockAdvanceQueue).toHaveBeenCalledTimes(1)
    })

    it('unmount clears interval (no leaked timers)', () => {
      vi.useFakeTimers()
      setupHostContext()
      const { unmount } = render(<TVModeClient />)

      // Enable auto-advance
      fireEvent.click(screen.getByLabelText('Enable auto-advance'))

      // Unmount
      unmount()

      // Should NOT fire after unmount
      act(() => {
        vi.advanceTimersByTime(30000)
      })
      expect(mockAdvanceQueue).not.toHaveBeenCalled()
    })
  })
})
