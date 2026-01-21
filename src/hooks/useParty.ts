import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, getSessionId } from '../lib/supabase'
import type { DbParty, DbPartyMember, DbQueueItem } from '../lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

// Check if we're in mock mode (no real Supabase credentials)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const IS_MOCK_MODE = !supabaseUrl || supabaseUrl.includes('placeholder') || supabaseUrl.includes('your-project-id')

export interface QueueItem {
  id: string
  type: 'youtube' | 'tweet' | 'reddit' | 'note'
  addedBy: string
  addedBySessionId: string
  status: 'pending' | 'showing' | 'shown'
  position: number
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
  return [
    {
      id: 'mock-note-1',
      type: 'note',
      addedBy: 'TestUser1',
      addedBySessionId: sessionId,
      status: 'showing',
      position: 0,
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

  // Use ref to track current partyId for subscription callbacks
  // This prevents stale closure issues where callbacks capture an old partyId
  const partyIdRef = useRef(partyId)
  partyIdRef.current = partyId

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
      console.error('Error fetching party data:', err)
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
        console.error('Error fetching party data:', err)
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
              console.error('Error refetching queue:', error)
              return
            }

            if (data) {
              setQueue((data as DbQueueItem[]).map(transformQueueItem))
            }
          } catch (err) {
            console.error('Error in queue subscription callback:', err)
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
              console.error('Error refetching members:', error)
              return
            }

            if (data) {
              setMembers((data as DbPartyMember[]).map(transformMember))
            }
          } catch (err) {
            console.error('Error in members subscription callback:', err)
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

      const currentSessionId = getSessionId()

      if (IS_MOCK_MODE) {
        // In mock mode, add to local state
        const maxPos = queue.length > 0 ? Math.max(...queue.map(q => q.position)) : -1
        const newItem: QueueItem = {
          id: `mock-${Date.now()}`,
          position: maxPos + 1,
          addedBySessionId: currentSessionId,
          ...item,
        }
        setQueue(prev => [...prev, newItem])
        return
      }

      // Get the max position
      const { data: maxPosData } = await supabase
        .from('queue_items')
        .select('position')
        .eq('party_id', partyId)
        .order('position', { ascending: false })
        .limit(1)

      const maxPos = maxPosData?.[0]?.position ?? -1
      const newPosition = maxPos + 1

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
        // due_date column not yet in database - skipping for now
        // due_date: item.dueDate ?? null,
      }

      const { error } = await supabase.from('queue_items').insert(dbItem)

      if (error) {
        console.error('Error adding to queue:', error)
        throw error
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

      if (IS_MOCK_MODE) {
        // In mock mode, swap items in local state
        setQueue(prev => {
          const newQueue = [...prev]
          const tempPos = newQueue[itemIndex].position
          newQueue[itemIndex] = { ...newQueue[itemIndex], position: newQueue[targetIndex].position }
          newQueue[targetIndex] = { ...newQueue[targetIndex], position: tempPos }
          return newQueue.sort((a, b) => a.position - b.position)
        })
        return
      }

      // Swap positions
      const { error: error1 } = await supabase
        .from('queue_items')
        .update({ position: targetItem.position })
        .eq('id', item.id)

      if (error1) {
        console.error('Error moving item:', error1)
        return
      }

      const { error: error2 } = await supabase
        .from('queue_items')
        .update({ position: item.position })
        .eq('id', targetItem.id)

      if (error2) {
        console.error('Error moving target item:', error2)
      }
    },
    [partyId, queue]
  )

  const deleteItem = useCallback(
    async (itemId: string) => {
      if (!partyId) return

      if (IS_MOCK_MODE) {
        // In mock mode, just update local state
        setQueue(prev => prev.filter(item => item.id !== itemId))
        return
      }

      const { error } = await supabase.from('queue_items').delete().eq('id', itemId)

      if (error) {
        console.error('Error deleting item:', error)
        throw error
      }
    },
    [partyId]
  )

  const advanceQueue = useCallback(async () => {
    if (!partyId) return

    // Find current showing item and mark as shown
    const showingItem = queue.find((q) => q.status === 'showing')
    if (showingItem) {
      await supabase.from('queue_items').update({ status: 'shown' }).eq('id', showingItem.id)
    }

    // Find first pending item and mark as showing
    const firstPending = queue.find((q) => q.status === 'pending')
    if (firstPending) {
      await supabase.from('queue_items').update({ status: 'showing' }).eq('id', firstPending.id)
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

      if (IS_MOCK_MODE) {
        // In mock mode, update position in local state
        setQueue(prev => {
          const newQueue = prev.map(q =>
            q.id === itemId ? { ...q, position: newPosition } : q
          )
          return newQueue.sort((a, b) => a.position - b.position)
        })
        return
      }

      const { error } = await supabase
        .from('queue_items')
        .update({ position: newPosition })
        .eq('id', itemId)

      if (error) {
        console.error('Error moving item to next:', error)
      }
    },
    [partyId, queue]
  )

  const updateNoteContent = useCallback(
    async (itemId: string, content: string) => {
      if (!partyId) return

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
        console.error('Error updating note:', error)
        throw error
      }
    },
    [partyId]
  )

  const toggleComplete = useCallback(
    async (itemId: string, userId?: string) => {
      if (!partyId) return

      const item = queue.find((q) => q.id === itemId)
      if (!item) return

      const isCompleted = !item.isCompleted
      const completedAt = isCompleted ? new Date().toISOString() : undefined
      const completedByUserId = isCompleted ? (userId ?? undefined) : undefined

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
        console.error('Error toggling completion:', error)
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
        console.error('Error updating due date:', error)
        throw error
      }
    },
    [partyId]
  )

  return {
    queue,
    members,
    partyInfo,
    isLoading,
    error,
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
