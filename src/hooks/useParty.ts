import { useState, useEffect, useCallback } from 'react'
import { supabase, getSessionId } from '../lib/supabase'
import type { DbParty, DbPartyMember, DbQueueItem } from '../lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

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

export function useParty(partyId: string | null) {
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [members, setMembers] = useState<PartyMember[]>([])
  const [partyInfo, setPartyInfo] = useState<PartyInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch initial data
  const fetchData = useCallback(async () => {
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

    fetchData()

    // Subscribe to queue changes
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
          // Refetch queue to get correct ordering
          const { data } = await supabase
            .from('queue_items')
            .select('*')
            .eq('party_id', partyId)
            .neq('status', 'shown')
            .order('position', { ascending: true })

          if (data) {
            setQueue((data as DbQueueItem[]).map(transformQueueItem))
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
          // Refetch members
          const { data } = await supabase
            .from('party_members')
            .select('*')
            .eq('party_id', partyId)
            .order('joined_at', { ascending: true })

          if (data) {
            setMembers((data as DbPartyMember[]).map(transformMember))
          }
        }
      )
      .subscribe()

    // Cleanup
    return () => {
      queueChannel.unsubscribe()
      membersChannel.unsubscribe()
    }
  }, [partyId, fetchData])

  // Queue operations
  const addToQueue = useCallback(
    async (item: Omit<QueueItem, 'id' | 'position' | 'addedBySessionId'>) => {
      if (!partyId) return

      const sessionId = getSessionId()

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
        added_by_session_id: sessionId,
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
        due_date: item.dueDate ?? null,
      }

      const { error } = await supabase.from('queue_items').insert(dbItem)

      if (error) {
        console.error('Error adding to queue:', error)
        throw error
      }
    },
    [partyId]
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
      const updates: Record<string, unknown> = {
        is_completed: isCompleted,
        completed_at: isCompleted ? new Date().toISOString() : null,
        completed_by_user_id: isCompleted ? (userId ?? null) : null,
      }

      const { error } = await supabase
        .from('queue_items')
        .update(updates)
        .eq('id', itemId)

      if (error) {
        console.error('Error toggling completion:', error)
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
