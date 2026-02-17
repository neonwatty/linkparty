'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { supabase, getSessionId } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { triggerItemAddedNotification, areNotificationsEnabled } from '@/lib/notificationTriggers'
import { tryAction } from '@/lib/rateLimit'
import { detectConflict, pendingChanges } from '@/lib/conflictResolver'
import type { ConflictInfo } from '@/lib/conflictResolver'
import type { DbParty, DbPartyMember, DbQueueItem } from '@/lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

const log = logger.createLogger('useParty')

// Check if we're in mock mode (no real Supabase credentials)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const IS_MOCK_MODE = !supabaseUrl || supabaseUrl.includes('placeholder') || supabaseUrl.includes('your-project-id')

export interface QueueItem {
  id: string
  type: 'youtube' | 'tweet' | 'reddit' | 'note' | 'image'
  addedBy: string
  addedBySessionId: string
  status: 'pending' | 'showing' | 'shown'
  position: number
  updatedAt?: string
  // YouTube-specific
  title?: string
  channel?: string
  duration?: string
  thumbnail?: string
  // Tweet-specific
  tweetAuthor?: string
  tweetHandle?: string
  tweetContent?: string
  tweetTimestamp?: string
  // Reddit-specific
  subreddit?: string
  redditTitle?: string
  redditBody?: string
  upvotes?: number
  commentCount?: number
  // Note-specific
  noteContent?: string
  // Image-specific
  imageName?: string
  imageUrl?: string
  imageStoragePath?: string
  imageCaption?: string
  // Reminder/completion fields
  dueDate?: string
  isCompleted: boolean
  completedAt?: string
  completedByUserId?: string
}

export interface PartyMember {
  id: string
  name: string
  avatar: string
  isHost: boolean
  sessionId: string
  userId?: string
}

export interface PartyInfo {
  id: string
  code: string
  name: string | null
  hostSessionId: string
  createdAt: string
  expiresAt: string
}

// Transform DB queue item to app queue item
function transformQueueItem(item: DbQueueItem): QueueItem {
  return {
    id: item.id,
    type: item.type,
    addedBy: item.added_by_name,
    addedBySessionId: item.added_by_session_id,
    status: item.status,
    position: item.position,
    updatedAt: item.updated_at || item.created_at,
    title: item.title ?? undefined,
    channel: item.channel ?? undefined,
    duration: item.duration ?? undefined,
    thumbnail: item.thumbnail ?? undefined,
    tweetAuthor: item.tweet_author ?? undefined,
    tweetHandle: item.tweet_handle ?? undefined,
    tweetContent: item.tweet_content ?? undefined,
    tweetTimestamp: item.tweet_timestamp ?? undefined,
    subreddit: item.subreddit ?? undefined,
    redditTitle: item.reddit_title ?? undefined,
    redditBody: item.reddit_body ?? undefined,
    upvotes: item.upvotes ?? undefined,
    commentCount: item.comment_count ?? undefined,
    noteContent: item.note_content ?? undefined,
    imageName: item.image_name ?? undefined,
    imageUrl: item.image_url ?? undefined,
    imageStoragePath: item.image_storage_path ?? undefined,
    imageCaption: item.image_caption ?? undefined,
    dueDate: item.due_date ?? undefined,
    isCompleted: item.is_completed ?? false,
    completedAt: item.completed_at ?? undefined,
    completedByUserId: item.completed_by_user_id ?? undefined,
  }
}

// Transform DB member to app member
function transformMember(member: DbPartyMember): PartyMember {
  return {
    id: member.id,
    name: member.display_name,
    avatar: member.avatar,
    isHost: member.is_host,
    sessionId: member.session_id,
    userId: member.user_id ?? undefined,
  }
}

// Generate mock queue items for testing
function generateMockQueueItems(sessionId: string): QueueItem[] {
  const now = new Date().toISOString()
  return [
    {
      id: 'mock-note-1',
      type: 'note',
      addedBy: 'TestUser1',
      addedBySessionId: sessionId,
      status: 'showing',
      position: 0,
      updatedAt: now,
      noteContent: 'Remember to bring snacks for the party!',
      isCompleted: false,
    },
    {
      id: 'mock-note-2',
      type: 'note',
      addedBy: 'TestUser1',
      addedBySessionId: sessionId,
      status: 'pending',
      position: 1,
      updatedAt: now,
      noteContent: 'First test note for removal',
      isCompleted: false,
    },
    {
      id: 'mock-note-3',
      type: 'note',
      addedBy: 'TestUser1',
      addedBySessionId: sessionId,
      status: 'pending',
      position: 2,
      updatedAt: now,
      noteContent: 'Second test note in queue',
      isCompleted: false,
    },
    {
      id: 'mock-note-4',
      type: 'note',
      addedBy: 'TestUser1',
      addedBySessionId: sessionId,
      status: 'pending',
      position: 3,
      updatedAt: now,
      noteContent: 'Third note to test queue operations',
      isCompleted: false,
    },
  ]
}

export function useParty(partyId: string | null) {
  const sessionId = getSessionId()
  const [queue, setQueue] = useState<QueueItem[]>(IS_MOCK_MODE ? generateMockQueueItems(sessionId) : [])
  const [members, setMembers] = useState<PartyMember[]>(
    IS_MOCK_MODE ? [{ id: 'mock-member-1', name: 'TestUser1', avatar: '🎉', isHost: true, sessionId }] : [],
  )
  const [partyInfo, setPartyInfo] = useState<PartyInfo | null>(
    IS_MOCK_MODE
      ? {
          id: partyId || 'mock-party',
          code: partyId?.substring(0, 6).toUpperCase() || 'MOCK01',
          name: 'Test Party',
          hostSessionId: sessionId,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        }
      : null,
  )
  const [isLoading, setIsLoading] = useState(!IS_MOCK_MODE)
  const [error, setError] = useState<string | null>(null)
  const [lastConflict, setLastConflict] = useState<ConflictInfo[] | null>(null)
  const [syncingItemIds, setSyncingItemIds] = useState<Set<string>>(new Set())

  // Use ref to track current partyId for subscription callbacks
  // This prevents stale closure issues where callbacks capture an old partyId
  const partyIdRef = useRef(partyId)
  partyIdRef.current = partyId

  // Keep a ref to members for notification triggers
  const membersRef = useRef(members)
  membersRef.current = members

  // Keep a ref to queue for conflict detection
  const queueRef = useRef(queue)
  queueRef.current = queue

  // Clear conflict notification after display
  const clearConflict = useCallback(() => {
    setLastConflict(null)
  }, [])

  // Helper to make authenticated API requests
  const apiRequest = useCallback(async (url: string, options: RequestInit) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }
    } catch {
      /* anonymous user */
    }
    return fetch(url, { ...options, headers: { ...headers, ...options.headers } })
  }, [])

  // Fetch initial data (skip in mock mode)
  const fetchData = useCallback(async () => {
    if (IS_MOCK_MODE) {
      setIsLoading(false)
      return
    }

    if (!partyId) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Fetch party info
      const { data: partyData, error: partyError } = await supabase
        .from('parties')
        .select('*')
        .eq('id', partyId)
        .single()

      if (partyError) throw partyError

      const party = partyData as DbParty
      setPartyInfo({
        id: party.id,
        code: party.code,
        name: party.name,
        hostSessionId: party.host_session_id,
        createdAt: party.created_at,
        expiresAt: party.expires_at,
      })

      // Fetch queue items
      const { data: queueData, error: queueError } = await supabase
        .from('queue_items')
        .select('*')
        .eq('party_id', partyId)
        .neq('status', 'shown')
        .order('position', { ascending: true })

      if (queueError) throw queueError

      setQueue((queueData as DbQueueItem[]).map(transformQueueItem))

      // Fetch members
      const { data: membersData, error: membersError } = await supabase
        .from('party_members')
        .select('*')
        .eq('party_id', partyId)
        .order('joined_at', { ascending: true })

      if (membersError) throw membersError

      setMembers((membersData as DbPartyMember[]).map(transformMember))
    } catch (err) {
      log.error('Failed to fetch party data', err)
      setError(err instanceof Error ? err.message : 'Failed to load party')
    } finally {
      setIsLoading(false)
    }
  }, [partyId])

  // Set up real-time subscriptions
  useEffect(() => {
    if (!partyId) return

    // In mock mode, initialize mock data for this party
    if (IS_MOCK_MODE) {
      const currentSessionId = getSessionId()
      setQueue(generateMockQueueItems(currentSessionId))
      setMembers([{ id: 'mock-member-1', name: 'TestUser1', avatar: '🎉', isHost: true, sessionId: currentSessionId }])
      setPartyInfo({
        id: partyId,
        code: partyId.substring(0, 6).toUpperCase(),
        name: 'Test Party',
        hostSessionId: currentSessionId,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
      setIsLoading(false)
      return
    }

    // Fetch initial data inline to avoid dependency on fetchData
    const loadInitialData = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const { data: partyData, error: partyError } = await supabase
          .from('parties')
          .select('*')
          .eq('id', partyId)
          .single()

        if (partyError) throw partyError

        const party = partyData as DbParty
        setPartyInfo({
          id: party.id,
          code: party.code,
          name: party.name,
          hostSessionId: party.host_session_id,
          createdAt: party.created_at,
          expiresAt: party.expires_at,
        })

        const { data: queueData, error: queueError } = await supabase
          .from('queue_items')
          .select('*')
          .eq('party_id', partyId)
          .neq('status', 'shown')
          .order('position', { ascending: true })

        if (queueError) throw queueError
        setQueue((queueData as DbQueueItem[]).map(transformQueueItem))

        const { data: membersData, error: membersError } = await supabase
          .from('party_members')
          .select('*')
          .eq('party_id', partyId)
          .order('joined_at', { ascending: true })

        if (membersError) throw membersError
        setMembers((membersData as DbPartyMember[]).map(transformMember))
      } catch (err) {
        log.error('Failed to fetch party data', err)
        setError(err instanceof Error ? err.message : 'Failed to load party')
      } finally {
        setIsLoading(false)
      }
    }

    loadInitialData()

    // Subscribe to queue changes with incremental updates
    // Use partyIdRef.current in callbacks to always get the latest value
    const queueChannel: RealtimeChannel = supabase
      .channel(`queue:${partyId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'queue_items',
          filter: `party_id=eq.${partyId}`,
        },
        (payload) => {
          try {
            const newDbItem = payload.new as DbQueueItem
            // Filter out 'shown' items to match initial fetch behavior
            if (newDbItem.status === 'shown') return
            const newItem = transformQueueItem(newDbItem)
            setQueue((prev) => {
              // Skip if item already exists (e.g., optimistic update with temp ID replaced)
              // Replace any temp item at the same position, or add if truly new
              const withoutTemp = prev.filter((q) => !(q.id.startsWith('temp-') && q.position === newItem.position))
              if (withoutTemp.some((q) => q.id === newItem.id)) return prev
              return [...withoutTemp, newItem].sort((a, b) => a.position - b.position)
            })
          } catch (err) {
            log.error('Queue INSERT handler failed', err)
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'queue_items',
          filter: `party_id=eq.${partyId}`,
        },
        (payload) => {
          try {
            const updatedDbItem = payload.new as DbQueueItem
            const updatedItem = transformQueueItem(updatedDbItem)

            // Check for conflicts with pending local changes
            const localQueue = queueRef.current
            const localItem = localQueue.find((q) => q.id === updatedItem.id)
            if (localItem) {
              const itemPendingChanges = pendingChanges.getChanges(updatedItem.id)
              for (const change of itemPendingChanges) {
                const conflict = detectConflict(localItem, updatedItem, change)
                if (conflict) {
                  setLastConflict((prev) => (prev ? [...prev, conflict] : [conflict]))
                  pendingChanges.clearChanges(updatedItem.id)
                  log.info('Sync conflict detected on UPDATE', { conflict })
                }
              }
            }

            // If status changed to 'shown', remove from local state
            if (updatedItem.status === 'shown') {
              setQueue((prev) => prev.filter((q) => q.id !== updatedItem.id))
              return
            }

            setQueue((prev) => {
              const idx = prev.findIndex((q) => q.id === updatedItem.id)
              if (idx === -1) {
                // Item wasn't in local state (e.g., status changed from 'shown' to something else)
                return [...prev, updatedItem].sort((a, b) => a.position - b.position)
              }
              const newQueue = [...prev]
              newQueue[idx] = updatedItem
              return newQueue.sort((a, b) => a.position - b.position)
            })
          } catch (err) {
            log.error('Queue UPDATE handler failed', err)
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'queue_items',
          filter: `party_id=eq.${partyId}`,
        },
        (payload) => {
          try {
            const oldDbItem = payload.old as { id: string }
            if (!oldDbItem?.id) {
              log.warn('Queue DELETE payload missing id, skipping')
              return
            }

            // Detect deletion conflicts for items with pending changes
            const itemPendingChanges = pendingChanges.getChanges(oldDbItem.id)
            if (itemPendingChanges.length > 0) {
              const localItem = queueRef.current.find((q) => q.id === oldDbItem.id)
              if (localItem) {
                const conflict: ConflictInfo = {
                  type: 'deleted',
                  itemId: oldDbItem.id,
                  itemTitle: localItem.title || localItem.noteContent?.substring(0, 50) || 'Queue Item',
                  description: 'Item was deleted by another user',
                }
                setLastConflict((prev) => (prev ? [...prev, conflict] : [conflict]))
              }
              pendingChanges.clearChanges(oldDbItem.id)
            }

            setQueue((prev) => prev.filter((q) => q.id !== oldDbItem.id))
          } catch (err) {
            log.error('Queue DELETE handler failed', err)
          }
        },
      )
      .subscribe()

    // Subscribe to member changes with incremental updates
    const membersChannel: RealtimeChannel = supabase
      .channel(`members:${partyId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'party_members',
          filter: `party_id=eq.${partyId}`,
        },
        (payload) => {
          try {
            const newDbMember = payload.new as DbPartyMember
            const newMember = transformMember(newDbMember)
            setMembers((prev) => {
              // Skip if member already exists
              if (prev.some((m) => m.id === newMember.id)) return prev
              // Insert maintaining joined_at order (new members go at the end)
              return [...prev, newMember]
            })
          } catch (err) {
            log.error('Members INSERT handler failed', err)
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'party_members',
          filter: `party_id=eq.${partyId}`,
        },
        (payload) => {
          try {
            const updatedDbMember = payload.new as DbPartyMember
            const updatedMember = transformMember(updatedDbMember)
            setMembers((prev) => {
              const idx = prev.findIndex((m) => m.id === updatedMember.id)
              if (idx === -1) return [...prev, updatedMember]
              const newMembers = [...prev]
              newMembers[idx] = updatedMember
              return newMembers
            })
          } catch (err) {
            log.error('Members UPDATE handler failed', err)
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'party_members',
          filter: `party_id=eq.${partyId}`,
        },
        (payload) => {
          try {
            const oldDbMember = payload.old as { id?: string; session_id?: string }
            if (!oldDbMember?.id && !oldDbMember?.session_id) {
              log.warn('Members DELETE payload missing identifiers, skipping')
              return
            }
            setMembers((prev) =>
              prev.filter((m) => {
                if (oldDbMember.id) return m.id !== oldDbMember.id
                if (oldDbMember.session_id) return m.sessionId !== oldDbMember.session_id
                return true
              }),
            )
          } catch (err) {
            log.error('Members DELETE handler failed', err)
          }
        },
      )
      .subscribe()

    // Cleanup
    return () => {
      queueChannel.unsubscribe()
      membersChannel.unsubscribe()
    }
  }, [partyId]) // Removed fetchData dependency to prevent stale closures

  // Queue operations
  const addToQueue = useCallback(
    async (item: Omit<QueueItem, 'id' | 'position' | 'addedBySessionId'>) => {
      if (!partyId) return

      // Check rate limit for queue items
      const rateLimitError = tryAction('queueItem')
      if (rateLimitError) {
        throw new Error(rateLimitError)
      }

      const currentSessionId = getSessionId()
      const maxPos = queue.length > 0 ? Math.max(...queue.map((q) => q.position)) : -1
      const newPosition = maxPos + 1
      const tempId = `temp-${Date.now()}`

      // Optimistic update: add item immediately with temp ID
      const optimisticItem: QueueItem = {
        id: tempId,
        position: newPosition,
        addedBySessionId: currentSessionId,
        updatedAt: new Date().toISOString(),
        ...item,
      }
      setQueue((prev) => [...prev, optimisticItem])
      setSyncingItemIds((prev) => new Set(prev).add(tempId))

      if (IS_MOCK_MODE) {
        // In mock mode, just clear syncing state
        setSyncingItemIds((prev) => {
          const next = new Set(prev)
          next.delete(tempId)
          return next
        })
        return
      }

      try {
        // Prepare the request body for the API
        const apiRequestBody = {
          partyId,
          sessionId: currentSessionId,
          type: item.type,
          status: item.status,
          position: newPosition,
          addedByName: item.addedBy,
          title: item.title,
          channel: item.channel,
          duration: item.duration,
          thumbnail: item.thumbnail,
          tweetAuthor: item.tweetAuthor,
          tweetHandle: item.tweetHandle,
          tweetContent: item.tweetContent,
          tweetTimestamp: item.tweetTimestamp,
          subreddit: item.subreddit,
          redditTitle: item.redditTitle,
          redditBody: item.redditBody,
          upvotes: item.upvotes,
          commentCount: item.commentCount,
          noteContent: item.noteContent,
          imageName: item.imageName,
          imageUrl: item.imageUrl,
          imageStoragePath: item.imageStoragePath,
          imageCaption: item.imageCaption,
          dueDate: item.dueDate,
        }

        const apiResponse = await apiRequest('/api/queue/items', {
          method: 'POST',
          body: JSON.stringify(apiRequestBody),
        })

        if (apiResponse.status === 429) {
          const errorData = await apiResponse.json()
          setQueue((prev) => prev.filter((q) => q.id !== tempId))
          throw new Error(errorData.error || 'Rate limit exceeded. Please wait before adding more items.')
        }

        if (!apiResponse.ok) {
          const errorData = await apiResponse.json()
          setQueue((prev) => prev.filter((q) => q.id !== tempId))
          throw new Error(errorData.error || 'Failed to add item to queue')
        }

        // Clear syncing state (real-time subscription will update with real ID)
        setSyncingItemIds((prev) => {
          const next = new Set(prev)
          next.delete(tempId)
          return next
        })

        // Trigger notifications for other party members
        if (areNotificationsEnabled()) {
          const sessionId = getSessionId()
          const membersList = membersRef.current.map((m) => ({
            sessionId: m.sessionId,
            name: m.name,
          }))
          triggerItemAddedNotification(partyId, item, sessionId, membersList).catch((err) => {
            log.error('Failed to trigger notification', err)
          })
        }
      } catch (err) {
        // Ensure cleanup on any error
        setSyncingItemIds((prev) => {
          const next = new Set(prev)
          next.delete(tempId)
          return next
        })
        throw err
      }
    },
    [partyId, queue, apiRequest],
  )

  const moveItem = useCallback(
    async (itemId: string, direction: 'up' | 'down', steps: number = 1) => {
      if (!partyId) return

      const itemIndex = queue.findIndex((q) => q.id === itemId)
      if (itemIndex === -1) return

      // Get only pending items for reordering
      const pendingItems = queue.filter((q) => q.status === 'pending')
      const pendingItemIndex = pendingItems.findIndex((q) => q.id === itemId)
      if (pendingItemIndex === -1) return

      // Calculate target index in pending items
      let targetPendingIndex: number
      if (direction === 'up') {
        targetPendingIndex = Math.max(0, pendingItemIndex - steps)
      } else {
        targetPendingIndex = Math.min(pendingItems.length - 1, pendingItemIndex + steps)
      }

      if (targetPendingIndex === pendingItemIndex) return

      const item = pendingItems[pendingItemIndex]
      const targetItem = pendingItems[targetPendingIndex]

      // For single step moves, use the simple swap logic
      if (steps === 1) {
        // Track pending changes for conflict detection
        pendingChanges.addChange({
          itemId: item.id,
          field: 'position',
          oldValue: item.position,
          newValue: targetItem.position,
          timestamp: Date.now(),
        })
        pendingChanges.addChange({
          itemId: targetItem.id,
          field: 'position',
          oldValue: targetItem.position,
          newValue: item.position,
          timestamp: Date.now(),
        })

        // Store original positions for rollback
        const originalItemPos = item.position
        const originalTargetPos = targetItem.position

        // Optimistic update: swap items immediately
        setQueue((prev) => {
          const newQueue = [...prev]
          const idx = newQueue.findIndex((q) => q.id === item.id)
          const targetIdx = newQueue.findIndex((q) => q.id === targetItem.id)
          if (idx !== -1 && targetIdx !== -1) {
            newQueue[idx] = { ...newQueue[idx], position: originalTargetPos }
            newQueue[targetIdx] = { ...newQueue[targetIdx], position: originalItemPos }
          }
          return newQueue.sort((a, b) => a.position - b.position)
        })
        setSyncingItemIds((prev) => {
          const next = new Set(prev)
          next.add(item.id)
          next.add(targetItem.id)
          return next
        })

        if (IS_MOCK_MODE) {
          pendingChanges.clearChanges(item.id)
          pendingChanges.clearChanges(targetItem.id)
          setSyncingItemIds((prev) => {
            const next = new Set(prev)
            next.delete(item.id)
            next.delete(targetItem.id)
            return next
          })
          return
        }

        try {
          // Swap positions on server via API
          const response = await apiRequest('/api/queue/items/reorder', {
            method: 'POST',
            body: JSON.stringify({
              partyId,
              sessionId: getSessionId(),
              updates: [
                { id: item.id, position: originalTargetPos },
                { id: targetItem.id, position: originalItemPos },
              ],
            }),
          })

          if (!response.ok) {
            // Rollback on error
            setQueue((prev) => {
              const newQueue = [...prev]
              const idx = newQueue.findIndex((q) => q.id === item.id)
              const targetIdx = newQueue.findIndex((q) => q.id === targetItem.id)
              if (idx !== -1 && targetIdx !== -1) {
                newQueue[idx] = { ...newQueue[idx], position: originalItemPos }
                newQueue[targetIdx] = { ...newQueue[targetIdx], position: originalTargetPos }
              }
              return newQueue.sort((a, b) => a.position - b.position)
            })
            log.error('Failed to move item', await response.json())
            return
          }
        } finally {
          // Clear pending changes and syncing state
          pendingChanges.clearChanges(item.id)
          pendingChanges.clearChanges(targetItem.id)
          setSyncingItemIds((prev) => {
            const next = new Set(prev)
            next.delete(item.id)
            next.delete(targetItem.id)
            return next
          })
        }
      } else {
        // Multi-step move: shift all items between old and new position
        const movedItem = pendingItems[pendingItemIndex]
        const newPendingItems = [...pendingItems]
        newPendingItems.splice(pendingItemIndex, 1)
        newPendingItems.splice(targetPendingIndex, 0, movedItem)

        // Calculate new positions for all affected items
        const positionUpdates: { id: string; oldPosition: number; newPosition: number }[] = []
        const minIndex = Math.min(pendingItemIndex, targetPendingIndex)
        const maxIndex = Math.max(pendingItemIndex, targetPendingIndex)

        for (let i = minIndex; i <= maxIndex; i++) {
          const itemToUpdate = newPendingItems[i]
          const originalItem = pendingItems[i]
          if (itemToUpdate.position !== originalItem.position) {
            positionUpdates.push({
              id: itemToUpdate.id,
              oldPosition: itemToUpdate.position,
              newPosition: originalItem.position,
            })
            pendingChanges.addChange({
              itemId: itemToUpdate.id,
              field: 'position',
              oldValue: itemToUpdate.position,
              newValue: originalItem.position,
              timestamp: Date.now(),
            })
          }
        }

        // Track syncing items
        const syncingIds = positionUpdates.map((u) => u.id)
        setSyncingItemIds((prev) => {
          const next = new Set(prev)
          syncingIds.forEach((id) => next.add(id))
          return next
        })

        // Optimistic update
        setQueue((prev) => {
          const newQueue = [...prev]
          for (const update of positionUpdates) {
            const idx = newQueue.findIndex((q) => q.id === update.id)
            if (idx !== -1) {
              newQueue[idx] = { ...newQueue[idx], position: update.newPosition }
            }
          }
          return newQueue.sort((a, b) => a.position - b.position)
        })

        if (IS_MOCK_MODE) {
          syncingIds.forEach((id) => pendingChanges.clearChanges(id))
          setSyncingItemIds((prev) => {
            const next = new Set(prev)
            syncingIds.forEach((id) => next.delete(id))
            return next
          })
          return
        }

        try {
          // Update all positions on server via API
          const response = await apiRequest('/api/queue/items/reorder', {
            method: 'POST',
            body: JSON.stringify({
              partyId,
              sessionId: getSessionId(),
              updates: positionUpdates.map((u) => ({ id: u.id, position: u.newPosition })),
            }),
          })

          if (!response.ok) {
            log.error('Failed to reorder items', await response.json())
          }
        } finally {
          syncingIds.forEach((id) => pendingChanges.clearChanges(id))
          setSyncingItemIds((prev) => {
            const next = new Set(prev)
            syncingIds.forEach((id) => next.delete(id))
            return next
          })
        }
      }
    },
    [partyId, queue, apiRequest],
  )

  const deleteItem = useCallback(
    async (itemId: string) => {
      if (!partyId) return

      // Store item for potential rollback
      const deletedItem = queue.find((item) => item.id === itemId)
      if (!deletedItem) return

      // Optimistic update: remove item immediately
      setQueue((prev) => prev.filter((item) => item.id !== itemId))
      setSyncingItemIds((prev) => new Set(prev).add(itemId))

      if (IS_MOCK_MODE) {
        setSyncingItemIds((prev) => {
          const next = new Set(prev)
          next.delete(itemId)
          return next
        })
        return
      }

      try {
        const response = await apiRequest(`/api/queue/items/${itemId}`, {
          method: 'DELETE',
          body: JSON.stringify({ partyId, sessionId: getSessionId() }),
        })

        if (!response.ok) {
          // Rollback: restore deleted item
          setQueue((prev) => [...prev, deletedItem].sort((a, b) => a.position - b.position))
          const errorData = await response.json()
          log.error('Failed to delete item', errorData)
          throw new Error(errorData.error || 'Failed to delete item')
        }
      } finally {
        setSyncingItemIds((prev) => {
          const next = new Set(prev)
          next.delete(itemId)
          return next
        })
      }
    },
    [partyId, queue, apiRequest],
  )

  const advanceQueue = useCallback(async () => {
    if (!partyId) return

    const showingItem = queue.find((q) => q.status === 'showing')
    const firstPending = queue.find((q) => q.status === 'pending')

    // Optimistic update: apply status changes immediately
    setQueue((prev) =>
      prev
        .map((q) => {
          if (showingItem && q.id === showingItem.id) {
            return { ...q, status: 'shown' as const }
          }
          if (firstPending && q.id === firstPending.id) {
            return { ...q, status: 'showing' as const }
          }
          return q
        })
        .filter((q) => q.status !== 'shown'),
    ) // Remove shown items from view

    const itemIds = [showingItem?.id, firstPending?.id].filter(Boolean) as string[]
    setSyncingItemIds((prev) => {
      const next = new Set(prev)
      itemIds.forEach((id) => next.add(id))
      return next
    })

    if (IS_MOCK_MODE) {
      setSyncingItemIds((prev) => {
        const next = new Set(prev)
        itemIds.forEach((id) => next.delete(id))
        return next
      })
      return
    }

    try {
      // Update server state via API
      const response = await apiRequest('/api/queue/items/advance', {
        method: 'POST',
        body: JSON.stringify({
          partyId,
          sessionId: getSessionId(),
          showingItemId: showingItem?.id,
          firstPendingItemId: firstPending?.id,
        }),
      })

      if (!response.ok) {
        log.error('Failed to advance queue', await response.json())
      }
    } finally {
      setSyncingItemIds((prev) => {
        const next = new Set(prev)
        itemIds.forEach((id) => next.delete(id))
        return next
      })
    }
  }, [partyId, queue, apiRequest])

  const showNext = useCallback(
    async (itemId: string) => {
      if (!partyId) return

      // Find the showing item's position
      const showingItem = queue.find((q) => q.status === 'showing')
      if (!showingItem) return

      const item = queue.find((q) => q.id === itemId)
      if (!item) return

      // Set this item's position to be right after the showing item
      const newPosition = showingItem.position + 0.5 // Will be between showing and first pending
      const originalPosition = item.position

      // Optimistic update: move item immediately
      setQueue((prev) => {
        const newQueue = prev.map((q) => (q.id === itemId ? { ...q, position: newPosition } : q))
        return newQueue.sort((a, b) => a.position - b.position)
      })
      setSyncingItemIds((prev) => new Set(prev).add(itemId))

      if (IS_MOCK_MODE) {
        setSyncingItemIds((prev) => {
          const next = new Set(prev)
          next.delete(itemId)
          return next
        })
        return
      }

      try {
        const response = await apiRequest(`/api/queue/items/${itemId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            partyId,
            sessionId: getSessionId(),
            action: 'updatePosition',
            position: newPosition,
          }),
        })

        if (!response.ok) {
          // Rollback on error
          setQueue((prev) => {
            const newQueue = prev.map((q) => (q.id === itemId ? { ...q, position: originalPosition } : q))
            return newQueue.sort((a, b) => a.position - b.position)
          })
          log.error('Failed to move item to next', await response.json())
        }
      } finally {
        setSyncingItemIds((prev) => {
          const next = new Set(prev)
          next.delete(itemId)
          return next
        })
      }
    },
    [partyId, queue, apiRequest],
  )

  const updateNoteContent = useCallback(
    async (itemId: string, content: string) => {
      if (!partyId) return

      // Validate ownership - only the note creator can edit
      const currentSessionId = getSessionId()
      const item = queue.find((q) => q.id === itemId)
      if (!item) {
        throw new Error('Note not found')
      }
      if (item.addedBySessionId !== currentSessionId) {
        throw new Error('You can only edit notes you created')
      }

      // Track pending change for conflict detection
      pendingChanges.addChange({
        itemId,
        field: 'noteContent',
        oldValue: item.noteContent,
        newValue: content,
        timestamp: Date.now(),
      })

      if (IS_MOCK_MODE) {
        // In mock mode, update note content in local state
        setQueue((prev) => prev.map((q) => (q.id === itemId ? { ...q, noteContent: content } : q)))
        return
      }

      const response = await apiRequest(`/api/queue/items/${itemId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          partyId,
          sessionId: getSessionId(),
          action: 'updateNote',
          noteContent: content,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        log.error('Failed to update note', errorData)
        pendingChanges.clearChanges(itemId)
        throw new Error(errorData.error || 'Failed to update note')
      }
    },
    [partyId, queue, apiRequest],
  )

  const toggleComplete = useCallback(
    async (itemId: string, userId?: string) => {
      if (!partyId) return

      const item = queue.find((q) => q.id === itemId)
      if (!item) return

      const isCompleted = !item.isCompleted
      const completedAt = isCompleted ? new Date().toISOString() : undefined
      const completedByUserId = isCompleted ? (userId ?? undefined) : undefined

      // Track pending change for conflict detection
      pendingChanges.addChange({
        itemId,
        field: 'isCompleted',
        oldValue: item.isCompleted,
        newValue: isCompleted,
        timestamp: Date.now(),
      })

      // Optimistic UI update for immediate feedback
      setQueue((prev) =>
        prev.map((q) =>
          q.id === itemId
            ? {
                ...q,
                isCompleted,
                completedAt,
                completedByUserId,
              }
            : q,
        ),
      )

      if (IS_MOCK_MODE) {
        return
      }

      const response = await apiRequest(`/api/queue/items/${itemId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          partyId,
          sessionId: getSessionId(),
          action: 'toggleComplete',
          isCompleted,
          completedAt: isCompleted ? completedAt : null,
          completedByUserId: isCompleted ? (userId ?? null) : null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        log.error('Failed to toggle completion', errorData)
        pendingChanges.clearChanges(itemId)
        // Revert optimistic update on error
        setQueue((prev) =>
          prev.map((q) =>
            q.id === itemId
              ? {
                  ...q,
                  isCompleted: !isCompleted,
                  completedAt: !isCompleted ? completedAt : undefined,
                  completedByUserId: !isCompleted ? completedByUserId : undefined,
                }
              : q,
          ),
        )
        throw new Error(errorData.error || 'Failed to toggle completion')
      }
    },
    [partyId, queue, apiRequest],
  )

  const updateDueDate = useCallback(
    async (itemId: string, dueDate: string | null) => {
      if (!partyId) return

      const response = await apiRequest(`/api/queue/items/${itemId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          partyId,
          sessionId: getSessionId(),
          action: 'updateDueDate',
          dueDate,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        log.error('Failed to update due date', errorData)
        throw new Error(errorData.error || 'Failed to update due date')
      }
    },
    [partyId, apiRequest],
  )

  const leaveParty = useCallback(async () => {
    if (!partyId || IS_MOCK_MODE) return
    const currentSessionId = getSessionId()
    try {
      const response = await apiRequest('/api/party-members/leave', {
        method: 'POST',
        body: JSON.stringify({ partyId, sessionId: currentSessionId }),
      })
      if (!response.ok) {
        const errorData = await response.json()
        log.error('Failed to delete member on leave', errorData)
      }
    } catch (err) {
      log.error('Failed to delete member on leave', err)
    }
  }, [partyId, apiRequest])

  // Helper to check if a specific item is syncing
  const isSyncing = useCallback((itemId: string) => syncingItemIds.has(itemId), [syncingItemIds])

  // Memoize filtered queue items by status to prevent unnecessary re-computations
  const pendingItems = useMemo(() => queue.filter((item) => item.status === 'pending'), [queue])

  const showingItem = useMemo(() => queue.find((item) => item.status === 'showing') ?? null, [queue])

  const shownItems = useMemo(() => queue.filter((item) => item.status === 'shown'), [queue])

  return {
    queue,
    members,
    partyInfo,
    isLoading,
    error,
    lastConflict,
    clearConflict,
    syncingItemIds,
    isSyncing,
    addToQueue,
    moveItem,
    deleteItem,
    advanceQueue,
    showNext,
    updateNoteContent,
    toggleComplete,
    updateDueDate,
    leaveParty,
    refetch: fetchData,
    // Memoized filtered queue items
    pendingItems,
    showingItem,
    shownItems,
  }
}
