import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, getSessionId } from '../lib/supabase'
import { logger } from '../lib/logger'
import { triggerItemAddedNotification, areNotificationsEnabled } from '../lib/notificationTriggers'
import { tryAction } from '../lib/rateLimit'
import { mergeQueueState, pendingChanges } from '../lib/conflictResolver'
import type { ConflictInfo } from '../lib/conflictResolver'
import type { DbParty, DbPartyMember, DbQueueItem } from '../lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

const log = logger.createLogger('useParty')

// Check if we're in mock mode (no real Supabase credentials)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
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
}

export interface PartyInfo {
  id: string
  code: string
  name: string | null
  hostSessionId: string
  createdAt: string
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
  const [members, setMembers] = useState<PartyMember[]>(IS_MOCK_MODE ? [
    { id: 'mock-member-1', name: 'TestUser1', avatar: '🎉', isHost: true, sessionId }
  ] : [])
  const [partyInfo, setPartyInfo] = useState<PartyInfo | null>(IS_MOCK_MODE ? {
    id: partyId || 'mock-party',
    code: partyId?.substring(0, 6).toUpperCase() || 'MOCK01',
    name: 'Test Party',
    hostSessionId: sessionId,
    createdAt: new Date().toISOString(),
  } : null)
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

    // Subscribe to queue changes
    // Use partyIdRef.current in callbacks to always get the latest value
    const queueChannel: RealtimeChannel = supabase
      .channel(`queue:${partyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'queue_items',
          filter: `party_id=eq.${partyId}`,
        },
        async () => {
          // Use ref to get current partyId (prevents stale closure)
          const currentPartyId = partyIdRef.current
          if (!currentPartyId) return

          try {
            const { data, error } = await supabase
              .from('queue_items')
              .select('*')
              .eq('party_id', currentPartyId)
              .neq('status', 'shown')
              .order('position', { ascending: true })

            if (error) {
              log.error('Failed to refetch queue', error)
              return
            }

            if (data) {
              const serverQueue = (data as DbQueueItem[]).map(transformQueueItem)
              const localQueue = queueRef.current

              // Check for conflicts between local pending changes and server state
              const { mergedQueue, conflicts } = mergeQueueState(localQueue, serverQueue)

              setQueue(mergedQueue)

              // Notify about conflicts if any
              if (conflicts.length > 0) {
                setLastConflict(conflicts)
                log.info('Sync conflicts detected', { conflicts })
              }
            }
          } catch (err) {
            log.error('Queue subscription callback failed', err)
          }
        }
      )
      .subscribe()

    // Subscribe to member changes
    const membersChannel: RealtimeChannel = supabase
      .channel(`members:${partyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'party_members',
          filter: `party_id=eq.${partyId}`,
        },
        async () => {
          // Use ref to get current partyId (prevents stale closure)
          const currentPartyId = partyIdRef.current
          if (!currentPartyId) return

          try {
            const { data, error } = await supabase
              .from('party_members')
              .select('*')
              .eq('party_id', currentPartyId)
              .order('joined_at', { ascending: true })

            if (error) {
              log.error('Failed to refetch members', error)
              return
            }

            if (data) {
              setMembers((data as DbPartyMember[]).map(transformMember))
            }
          } catch (err) {
            log.error('Members subscription callback failed', err)
          }
        }
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
      const maxPos = queue.length > 0 ? Math.max(...queue.map(q => q.position)) : -1
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
      setQueue(prev => [...prev, optimisticItem])
      setSyncingItemIds(prev => new Set(prev).add(tempId))

      if (IS_MOCK_MODE) {
        // In mock mode, just clear syncing state
        setSyncingItemIds(prev => {
          const next = new Set(prev)
          next.delete(tempId)
          return next
        })
        return
      }

      try {
        const dbItem: Partial<DbQueueItem> = {
          party_id: partyId,
          type: item.type,
          status: item.status,
          position: newPosition,
          added_by_name: item.addedBy,
          added_by_session_id: currentSessionId,
          title: item.title ?? null,
          channel: item.channel ?? null,
          duration: item.duration ?? null,
          thumbnail: item.thumbnail ?? null,
          tweet_author: item.tweetAuthor ?? null,
          tweet_handle: item.tweetHandle ?? null,
          tweet_content: item.tweetContent ?? null,
          tweet_timestamp: item.tweetTimestamp ?? null,
          subreddit: item.subreddit ?? null,
          reddit_title: item.redditTitle ?? null,
          reddit_body: item.redditBody ?? null,
          upvotes: item.upvotes ?? null,
          comment_count: item.commentCount ?? null,
          note_content: item.noteContent ?? null,
          image_name: item.imageName ?? null,
          image_url: item.imageUrl ?? null,
          image_storage_path: item.imageStoragePath ?? null,
          image_caption: item.imageCaption ?? null,
          due_date: item.dueDate ?? null,
          is_completed: false,
        }

        const { error } = await supabase.from('queue_items').insert(dbItem)

        if (error) {
          // Rollback: remove optimistic item
          setQueue(prev => prev.filter(q => q.id !== tempId))
          log.error('Failed to add to queue', error)
          throw error
        }

        // Clear syncing state (real-time subscription will update with real ID)
        setSyncingItemIds(prev => {
          const next = new Set(prev)
          next.delete(tempId)
          return next
        })

        // Trigger notifications for other party members
        if (areNotificationsEnabled()) {
          const sessionId = getSessionId()
          const membersList = membersRef.current.map(m => ({
            sessionId: m.sessionId,
            name: m.name,
          }))
          triggerItemAddedNotification(partyId, item, sessionId, membersList).catch(err => {
            log.error('Failed to trigger notification', err)
          })
        }
      } catch (err) {
        // Ensure cleanup on any error
        setSyncingItemIds(prev => {
          const next = new Set(prev)
          next.delete(tempId)
          return next
        })
        throw err
      }
    },
    [partyId, queue]
  )

  const moveItem = useCallback(
    async (itemId: string, direction: 'up' | 'down') => {
      if (!partyId) return

      const itemIndex = queue.findIndex((q) => q.id === itemId)
      if (itemIndex === -1) return

      // Find the target index
      let targetIndex: number
      if (direction === 'up') {
        // Find the first pending item before this one
        targetIndex = -1
        for (let i = itemIndex - 1; i >= 0; i--) {
          if (queue[i].status === 'pending') {
            targetIndex = i
            break
          }
        }
      } else {
        // Find the first pending item after this one
        targetIndex = -1
        for (let i = itemIndex + 1; i < queue.length; i++) {
          if (queue[i].status === 'pending') {
            targetIndex = i
            break
          }
        }
      }

      if (targetIndex === -1) return

      const item = queue[itemIndex]
      const targetItem = queue[targetIndex]

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
      setQueue(prev => {
        const newQueue = [...prev]
        const idx = newQueue.findIndex(q => q.id === item.id)
        const targetIdx = newQueue.findIndex(q => q.id === targetItem.id)
        if (idx !== -1 && targetIdx !== -1) {
          newQueue[idx] = { ...newQueue[idx], position: originalTargetPos }
          newQueue[targetIdx] = { ...newQueue[targetIdx], position: originalItemPos }
        }
        return newQueue.sort((a, b) => a.position - b.position)
      })
      setSyncingItemIds(prev => {
        const next = new Set(prev)
        next.add(item.id)
        next.add(targetItem.id)
        return next
      })

      if (IS_MOCK_MODE) {
        pendingChanges.clearChanges(item.id)
        pendingChanges.clearChanges(targetItem.id)
        setSyncingItemIds(prev => {
          const next = new Set(prev)
          next.delete(item.id)
          next.delete(targetItem.id)
          return next
        })
        return
      }

      try {
        // Swap positions on server
        const { error: error1 } = await supabase
          .from('queue_items')
          .update({ position: originalTargetPos })
          .eq('id', item.id)

        if (error1) {
          // Rollback on error
          setQueue(prev => {
            const newQueue = [...prev]
            const idx = newQueue.findIndex(q => q.id === item.id)
            const targetIdx = newQueue.findIndex(q => q.id === targetItem.id)
            if (idx !== -1 && targetIdx !== -1) {
              newQueue[idx] = { ...newQueue[idx], position: originalItemPos }
              newQueue[targetIdx] = { ...newQueue[targetIdx], position: originalTargetPos }
            }
            return newQueue.sort((a, b) => a.position - b.position)
          })
          log.error('Failed to move item', error1)
          return
        }

        const { error: error2 } = await supabase
          .from('queue_items')
          .update({ position: originalItemPos })
          .eq('id', targetItem.id)

        if (error2) {
          log.error('Failed to move target item', error2)
        }
      } finally {
        // Clear pending changes and syncing state
        pendingChanges.clearChanges(item.id)
        pendingChanges.clearChanges(targetItem.id)
        setSyncingItemIds(prev => {
          const next = new Set(prev)
          next.delete(item.id)
          next.delete(targetItem.id)
          return next
        })
      }
    },
    [partyId, queue]
  )

  const deleteItem = useCallback(
    async (itemId: string) => {
      if (!partyId) return

      // Store item for potential rollback
      const deletedItem = queue.find(item => item.id === itemId)
      if (!deletedItem) return

      // Optimistic update: remove item immediately
      setQueue(prev => prev.filter(item => item.id !== itemId))
      setSyncingItemIds(prev => new Set(prev).add(itemId))

      if (IS_MOCK_MODE) {
        setSyncingItemIds(prev => {
          const next = new Set(prev)
          next.delete(itemId)
          return next
        })
        return
      }

      try {
        const { error } = await supabase.from('queue_items').delete().eq('id', itemId)

        if (error) {
          // Rollback: restore deleted item
          setQueue(prev => [...prev, deletedItem].sort((a, b) => a.position - b.position))
          log.error('Failed to delete item', error)
          throw error
        }
      } finally {
        setSyncingItemIds(prev => {
          const next = new Set(prev)
          next.delete(itemId)
          return next
        })
      }
    },
    [partyId, queue]
  )

  const advanceQueue = useCallback(async () => {
    if (!partyId) return

    const showingItem = queue.find((q) => q.status === 'showing')
    const firstPending = queue.find((q) => q.status === 'pending')

    // Optimistic update: apply status changes immediately
    setQueue(prev => prev.map(q => {
      if (showingItem && q.id === showingItem.id) {
        return { ...q, status: 'shown' as const }
      }
      if (firstPending && q.id === firstPending.id) {
        return { ...q, status: 'showing' as const }
      }
      return q
    }).filter(q => q.status !== 'shown')) // Remove shown items from view

    const itemIds = [showingItem?.id, firstPending?.id].filter(Boolean) as string[]
    setSyncingItemIds(prev => {
      const next = new Set(prev)
      itemIds.forEach(id => next.add(id))
      return next
    })

    if (IS_MOCK_MODE) {
      setSyncingItemIds(prev => {
        const next = new Set(prev)
        itemIds.forEach(id => next.delete(id))
        return next
      })
      return
    }

    try {
      // Update server state
      if (showingItem) {
        await supabase.from('queue_items').update({ status: 'shown' }).eq('id', showingItem.id)
      }
      if (firstPending) {
        await supabase.from('queue_items').update({ status: 'showing' }).eq('id', firstPending.id)
      }
    } finally {
      setSyncingItemIds(prev => {
        const next = new Set(prev)
        itemIds.forEach(id => next.delete(id))
        return next
      })
    }
  }, [partyId, queue])

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
      setQueue(prev => {
        const newQueue = prev.map(q =>
          q.id === itemId ? { ...q, position: newPosition } : q
        )
        return newQueue.sort((a, b) => a.position - b.position)
      })
      setSyncingItemIds(prev => new Set(prev).add(itemId))

      if (IS_MOCK_MODE) {
        setSyncingItemIds(prev => {
          const next = new Set(prev)
          next.delete(itemId)
          return next
        })
        return
      }

      try {
        const { error } = await supabase
          .from('queue_items')
          .update({ position: newPosition })
          .eq('id', itemId)

        if (error) {
          // Rollback on error
          setQueue(prev => {
            const newQueue = prev.map(q =>
              q.id === itemId ? { ...q, position: originalPosition } : q
            )
            return newQueue.sort((a, b) => a.position - b.position)
          })
          log.error('Failed to move item to next', error)
        }
      } finally {
        setSyncingItemIds(prev => {
          const next = new Set(prev)
          next.delete(itemId)
          return next
        })
      }
    },
    [partyId, queue]
  )

  const updateNoteContent = useCallback(
    async (itemId: string, content: string) => {
      if (!partyId) return

      // Validate ownership - only the note creator can edit
      const currentSessionId = getSessionId()
      const item = queue.find(q => q.id === itemId)
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
        setQueue(prev => prev.map(q =>
          q.id === itemId ? { ...q, noteContent: content } : q
        ))
        return
      }

      const { error } = await supabase
        .from('queue_items')
        .update({ note_content: content })
        .eq('id', itemId)

      if (error) {
        log.error('Failed to update note', error)
        pendingChanges.clearChanges(itemId)
        throw error
      }
    },
    [partyId, queue]
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
      setQueue(prev => prev.map(q =>
        q.id === itemId ? {
          ...q,
          isCompleted,
          completedAt,
          completedByUserId,
        } : q
      ))

      if (IS_MOCK_MODE) {
        return
      }

      const updates: Record<string, unknown> = {
        is_completed: isCompleted,
        completed_at: isCompleted ? completedAt : null,
        completed_by_user_id: isCompleted ? (userId ?? null) : null,
      }

      const { error } = await supabase
        .from('queue_items')
        .update(updates)
        .eq('id', itemId)

      if (error) {
        log.error('Failed to toggle completion', error)
        pendingChanges.clearChanges(itemId)
        // Revert optimistic update on error
        setQueue(prev => prev.map(q =>
          q.id === itemId ? {
            ...q,
            isCompleted: !isCompleted,
            completedAt: !isCompleted ? completedAt : undefined,
            completedByUserId: !isCompleted ? completedByUserId : undefined,
          } : q
        ))
        throw error
      }
    },
    [partyId, queue]
  )

  const updateDueDate = useCallback(
    async (itemId: string, dueDate: string | null) => {
      if (!partyId) return

      const { error } = await supabase
        .from('queue_items')
        .update({ due_date: dueDate })
        .eq('id', itemId)

      if (error) {
        log.error('Failed to update due date', error)
        throw error
      }
    },
    [partyId]
  )

  // Helper to check if a specific item is syncing
  const isSyncing = useCallback((itemId: string) => syncingItemIds.has(itemId), [syncingItemIds])

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
    refetch: fetchData,
  }
}
