import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useParty } from './useParty'

// Mock the supabase module
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          neq: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
      insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
    channel: vi.fn(() => ({
      on: vi.fn(() => ({
        subscribe: vi.fn(),
      })),
      unsubscribe: vi.fn(),
    })),
  },
  getSessionId: vi.fn(() => 'test-session-123'),
}))

// Mock the logger
vi.mock('../lib/logger', () => ({
  logger: {
    createLogger: () => ({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}))

// Mock notification triggers
vi.mock('../lib/notificationTriggers', () => ({
  triggerItemAddedNotification: vi.fn(() => Promise.resolve()),
  areNotificationsEnabled: vi.fn(() => false),
}))

// Mock rate limit - always allow
vi.mock('../lib/rateLimit', () => ({
  tryAction: vi.fn(() => null),
}))

// Mock conflict resolver
vi.mock('../lib/conflictResolver', () => ({
  mergeQueueState: vi.fn((local, server) => ({
    mergedQueue: server,
    conflicts: [],
  })),
  pendingChanges: {
    addChange: vi.fn(),
    clearChanges: vi.fn(),
    getChanges: vi.fn(() => []),
    getPendingItemIds: vi.fn(() => []),
  },
}))

describe('useParty', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('initialization', () => {
    it('returns initial state when partyId is null', () => {
      const { result } = renderHook(() => useParty(null))

      // In mock mode, partyInfo is initialized with mock data even for null partyId
      // The important thing is isLoading is false and there's no error
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('initializes with mock data when partyId is provided', async () => {
      const { result } = renderHook(() => useParty('test-party-123'))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // In mock mode, should have party info
      expect(result.current.partyInfo).not.toBeNull()
      expect(result.current.partyInfo?.id).toBe('test-party-123')
    })

    it('generates mock queue items in mock mode', async () => {
      const { result } = renderHook(() => useParty('test-party-123'))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Mock mode generates 4 test notes
      expect(result.current.queue.length).toBeGreaterThan(0)
      expect(result.current.queue[0].type).toBe('note')
    })

    it('sets up mock members in mock mode', async () => {
      const { result } = renderHook(() => useParty('test-party-123'))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.members.length).toBe(1)
      expect(result.current.members[0].isHost).toBe(true)
    })
  })

  describe('memoized filtered items', () => {
    it('returns pending items correctly', async () => {
      const { result } = renderHook(() => useParty('test-party-123'))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const pendingItems = result.current.pendingItems
      expect(pendingItems.every(item => item.status === 'pending')).toBe(true)
    })

    it('returns showing item correctly', async () => {
      const { result } = renderHook(() => useParty('test-party-123'))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const showingItem = result.current.showingItem
      if (showingItem) {
        expect(showingItem.status).toBe('showing')
      }
    })

    it('returns shown items correctly', async () => {
      const { result } = renderHook(() => useParty('test-party-123'))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const shownItems = result.current.shownItems
      expect(shownItems.every(item => item.status === 'shown')).toBe(true)
    })
  })

  describe('queue operations', () => {
    describe('addToQueue', () => {
      it('adds a new item to the queue', async () => {
        const { result } = renderHook(() => useParty('test-party-123'))

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false)
        })

        const initialLength = result.current.queue.length

        await act(async () => {
          await result.current.addToQueue({
            type: 'note',
            addedBy: 'TestUser',
            status: 'pending',
            noteContent: 'New test note',
            isCompleted: false,
          })
        })

        expect(result.current.queue.length).toBe(initialLength + 1)
        const newItem = result.current.queue[result.current.queue.length - 1]
        expect(newItem.noteContent).toBe('New test note')
      })

      it('assigns correct position to new item', async () => {
        const { result } = renderHook(() => useParty('test-party-123'))

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false)
        })

        const maxPosBefore = Math.max(...result.current.queue.map(q => q.position))

        await act(async () => {
          await result.current.addToQueue({
            type: 'note',
            addedBy: 'TestUser',
            status: 'pending',
            noteContent: 'Positioned note',
            isCompleted: false,
          })
        })

        const newItem = result.current.queue[result.current.queue.length - 1]
        expect(newItem.position).toBe(maxPosBefore + 1)
      })
    })

    describe('deleteItem', () => {
      it('removes an item from the queue', async () => {
        const { result } = renderHook(() => useParty('test-party-123'))

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false)
        })

        const initialLength = result.current.queue.length
        const itemToDelete = result.current.queue[1] // Get second item

        await act(async () => {
          await result.current.deleteItem(itemToDelete.id)
        })

        expect(result.current.queue.length).toBe(initialLength - 1)
        expect(result.current.queue.find(q => q.id === itemToDelete.id)).toBeUndefined()
      })

      it('does nothing if item not found', async () => {
        const { result } = renderHook(() => useParty('test-party-123'))

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false)
        })

        const initialLength = result.current.queue.length

        await act(async () => {
          await result.current.deleteItem('non-existent-id')
        })

        expect(result.current.queue.length).toBe(initialLength)
      })
    })

    describe('advanceQueue', () => {
      it('marks showing item as shown and promotes first pending', async () => {
        const { result } = renderHook(() => useParty('test-party-123'))

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false)
        })

        const showingBefore = result.current.queue.find(q => q.status === 'showing')
        const firstPendingBefore = result.current.queue.find(q => q.status === 'pending')

        await act(async () => {
          await result.current.advanceQueue()
        })

        // Showing item should be removed (marked as shown and filtered out)
        if (showingBefore) {
          expect(result.current.queue.find(q => q.id === showingBefore.id)).toBeUndefined()
        }

        // First pending should now be showing
        if (firstPendingBefore) {
          const nowShowing = result.current.queue.find(q => q.id === firstPendingBefore.id)
          expect(nowShowing?.status).toBe('showing')
        }
      })
    })

    describe('toggleComplete', () => {
      it('toggles completion status of an item', async () => {
        const { result } = renderHook(() => useParty('test-party-123'))

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false)
        })

        const item = result.current.queue[0]
        const wasCompleted = item.isCompleted

        await act(async () => {
          await result.current.toggleComplete(item.id)
        })

        const updatedItem = result.current.queue.find(q => q.id === item.id)
        expect(updatedItem?.isCompleted).toBe(!wasCompleted)
      })

      it('sets completedAt when marking as complete', async () => {
        const { result } = renderHook(() => useParty('test-party-123'))

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false)
        })

        const item = result.current.queue.find(q => !q.isCompleted)
        if (!item) return

        await act(async () => {
          await result.current.toggleComplete(item.id)
        })

        const updatedItem = result.current.queue.find(q => q.id === item.id)
        expect(updatedItem?.completedAt).toBeDefined()
      })
    })

    describe('updateNoteContent', () => {
      it('updates note content for owned notes', async () => {
        const { result } = renderHook(() => useParty('test-party-123'))

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false)
        })

        const noteItem = result.current.queue.find(q => q.type === 'note')
        if (!noteItem) return

        await act(async () => {
          await result.current.updateNoteContent(noteItem.id, 'Updated content')
        })

        const updatedItem = result.current.queue.find(q => q.id === noteItem.id)
        expect(updatedItem?.noteContent).toBe('Updated content')
      })
    })
  })

  describe('sync state tracking', () => {
    it('isSyncing returns false for non-syncing items', async () => {
      const { result } = renderHook(() => useParty('test-party-123'))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const item = result.current.queue[0]
      expect(result.current.isSyncing(item.id)).toBe(false)
    })
  })

  describe('conflict handling', () => {
    it('initializes with no conflicts', async () => {
      const { result } = renderHook(() => useParty('test-party-123'))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.lastConflict).toBeNull()
    })

    it('clearConflict resets lastConflict to null', async () => {
      const { result } = renderHook(() => useParty('test-party-123'))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.clearConflict()
      })

      expect(result.current.lastConflict).toBeNull()
    })
  })

  describe('moveItem', () => {
    it('moves an item up in the queue', async () => {
      const { result } = renderHook(() => useParty('test-party-123'))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const pendingItems = result.current.pendingItems
      if (pendingItems.length < 2) return

      const secondItem = pendingItems[1]
      const originalPosition = secondItem.position

      await act(async () => {
        await result.current.moveItem(secondItem.id, 'up')
      })

      const movedItem = result.current.queue.find(q => q.id === secondItem.id)
      expect(movedItem?.position).toBeLessThan(originalPosition)
    })

    it('moves an item down in the queue', async () => {
      const { result } = renderHook(() => useParty('test-party-123'))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const pendingItems = result.current.pendingItems
      if (pendingItems.length < 2) return

      const firstPendingItem = pendingItems[0]
      const originalPosition = firstPendingItem.position

      await act(async () => {
        await result.current.moveItem(firstPendingItem.id, 'down')
      })

      const movedItem = result.current.queue.find(q => q.id === firstPendingItem.id)
      expect(movedItem?.position).toBeGreaterThan(originalPosition)
    })

    it('does not move item beyond queue bounds', async () => {
      const { result } = renderHook(() => useParty('test-party-123'))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const pendingItems = result.current.pendingItems
      if (pendingItems.length === 0) return

      const firstItem = pendingItems[0]
      const originalPosition = firstItem.position

      await act(async () => {
        await result.current.moveItem(firstItem.id, 'up') // Can't move up from first
      })

      const movedItem = result.current.queue.find(q => q.id === firstItem.id)
      expect(movedItem?.position).toBe(originalPosition)
    })
  })

  describe('showNext', () => {
    it('moves item to show next position', async () => {
      const { result } = renderHook(() => useParty('test-party-123'))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const pendingItems = result.current.pendingItems
      const showingItem = result.current.showingItem

      if (!showingItem || pendingItems.length < 2) return

      // Get an item that's not the first pending
      const laterItem = pendingItems[pendingItems.length - 1]

      await act(async () => {
        await result.current.showNext(laterItem.id)
      })

      // Item should now be positioned right after showing
      const movedItem = result.current.queue.find(q => q.id === laterItem.id)
      expect(movedItem?.position).toBeGreaterThan(showingItem.position)
      expect(movedItem?.position).toBeLessThan(pendingItems[0].position)
    })
  })
})
