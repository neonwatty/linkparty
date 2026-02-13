'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { getUnreadCount, getNotifications, markAsRead, markAllAsRead } from '@/lib/notifications'
import { useAuth } from '@/contexts/AuthContext'
import { logger } from '@/lib/logger'
import type { AppNotification } from '@/lib/notifications'
import type { RealtimeChannel } from '@supabase/supabase-js'

const log = logger.createLogger('useNotifications')

export function useNotifications() {
  const { user } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const channelRef = useRef<RealtimeChannel | null>(null)

  // Fetch initial data when user is authenticated
  useEffect(() => {
    if (!user) {
      setUnreadCount(0)
      setNotifications([])
      return
    }

    const fetchInitialData = async () => {
      setLoading(true)
      try {
        const [count, notifs] = await Promise.all([getUnreadCount(), getNotifications()])
        setUnreadCount(count)
        setNotifications(notifs)
      } catch (err) {
        log.error('Failed to fetch notifications', err)
      } finally {
        setLoading(false)
      }
    }

    fetchInitialData()
  }, [user])

  // Set up Realtime subscription
  useEffect(() => {
    if (!user) return

    const channel: RealtimeChannel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newNotification = payload.new as AppNotification
            setNotifications((prev) => [newNotification, ...prev])
            if (!newNotification.read) {
              setUnreadCount((prev) => prev + 1)
            }
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as AppNotification
            setNotifications((prev) => prev.map((n) => (n.id === updated.id ? updated : n)))
            // Recalculate unread count
            setNotifications((prev) => {
              setUnreadCount(prev.filter((n) => !n.read).length)
              return prev
            })
          } else if (payload.eventType === 'DELETE') {
            const deleted = payload.old as Partial<AppNotification>
            setNotifications((prev) => prev.filter((n) => n.id !== deleted.id))
            setNotifications((prev) => {
              setUnreadCount(prev.filter((n) => !n.read).length)
              return prev
            })
          }
        },
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      channel.unsubscribe()
      channelRef.current = null
    }
  }, [user])

  const handleMarkAsRead = useCallback(
    async (notificationId: string) => {
      // Optimistic update
      setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n)))
      setUnreadCount((prev) => Math.max(0, prev - 1))

      const { error } = await markAsRead(notificationId)
      if (error) {
        log.error('Failed to mark notification as read', { notificationId, error })
        // Revert optimistic update
        setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, read: false } : n)))
        setUnreadCount((prev) => prev + 1)
      }
    },
    [setNotifications, setUnreadCount],
  )

  const handleMarkAllAsRead = useCallback(async () => {
    // Store previous state for rollback
    const previousNotifications = notifications
    const previousUnreadCount = unreadCount

    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    setUnreadCount(0)

    const { error } = await markAllAsRead()
    if (error) {
      log.error('Failed to mark all notifications as read', { error })
      // Revert optimistic update
      setNotifications(previousNotifications)
      setUnreadCount(previousUnreadCount)
    }
  }, [notifications, unreadCount])

  return {
    unreadCount,
    notifications,
    markAsRead: handleMarkAsRead,
    markAllAsRead: handleMarkAllAsRead,
    isOpen,
    setIsOpen,
    loading,
  }
}
