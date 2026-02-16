'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { getNotifications, markAsRead, markAllAsRead } from '@/lib/notifications'
import { useAuth } from '@/contexts/AuthContext'
import { logger } from '@/lib/logger'
import type { AppNotification } from '@/lib/notifications'
import type { RealtimeChannel } from '@supabase/supabase-js'

const log = logger.createLogger('useNotifications')

export function useNotifications() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  // Derive unread count from notifications array — single source of truth
  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications])

  // Fetch initial data when user is authenticated
  useEffect(() => {
    if (!user) {
      setNotifications([])
      return
    }

    const fetchInitialData = async () => {
      setLoading(true)
      try {
        const notifs = await getNotifications()
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
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as AppNotification
            setNotifications((prev) => prev.map((n) => (n.id === updated.id ? updated : n)))
          } else if (payload.eventType === 'DELETE') {
            const deleted = payload.old as Partial<AppNotification>
            setNotifications((prev) => prev.filter((n) => n.id !== deleted.id))
          }
        },
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [user])

  const handleMarkAsRead = useCallback(async (notificationId: string) => {
    // Guard against already-read notifications
    setNotifications((prev) => {
      const target = prev.find((n) => n.id === notificationId)
      if (!target || target.read) return prev
      return prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
    })

    const { error } = await markAsRead(notificationId)
    if (error) {
      log.error('Failed to mark notification as read', { notificationId, error })
      // Revert optimistic update
      setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, read: false } : n)))
    }
  }, [])

  const handleMarkAllAsRead = useCallback(async () => {
    // Capture previous state via functional updater for rollback
    let previousNotifications: AppNotification[] = []

    setNotifications((prev) => {
      previousNotifications = prev
      return prev.map((n) => ({ ...n, read: true }))
    })

    const { error } = await markAllAsRead()
    if (error) {
      log.error('Failed to mark all notifications as read', { error })
      setNotifications(previousNotifications)
    }
  }, [])

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
