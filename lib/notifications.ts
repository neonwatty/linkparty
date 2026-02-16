'use client'

import { supabase } from '@/lib/supabase'

export type NotificationType = 'friend_request' | 'friend_accepted' | 'party_invite'

export interface AppNotification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  body: string | null
  data: Record<string, string> | null
  read: boolean
  created_at: string
}

export async function getUnreadCount(): Promise<number> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return 0

  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('read', false)

  if (error) return 0
  return count ?? 0
}

export async function getNotifications(limit = 50): Promise<AppNotification[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return []
  return (data || []) as AppNotification[]
}

export async function markAsRead(notificationId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('notifications').update({ read: true }).eq('id', notificationId)

  if (error) return { error: error.message }
  return { error: null }
}

export async function markAllAsRead(): Promise<{ error: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false)

  if (error) return { error: error.message }
  return { error: null }
}
