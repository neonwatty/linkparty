'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { LoaderIcon } from '@/components/icons'
import type { FriendWithProfile } from '@/lib/friends'

interface Props {
  friends: FriendWithProfile[]
  loading: boolean
  onRemoveFriend: (friendshipId: string) => void
  onBlockUser?: (userId: string) => void
}

export default function FriendsList({ friends, loading, onRemoveFriend, onBlockUser }: Props) {
  const [search, setSearch] = useState('')
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [confirmAction, setConfirmAction] = useState<'remove' | 'block'>('remove')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearConfirm = useCallback(() => setConfirmId(null), [])

  // Reset confirm after 3 seconds
  useEffect(() => {
    if (!confirmId) return
    timerRef.current = setTimeout(clearConfirm, 3000)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [confirmId, clearConfirm])

  // Click-away handler
  useEffect(() => {
    if (!confirmId) return
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-confirm-btn]')) setConfirmId(null)
    }
    document.addEventListener('click', handler, true)
    return () => document.removeEventListener('click', handler, true)
  }, [confirmId])

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoaderIcon />
      </div>
    )
  }

  if (friends.length === 0) {
    return <p className="text-text-muted text-sm text-center py-8">No friends yet</p>
  }

  const query = search.toLowerCase()
  const filtered = query
    ? friends.filter(
        (f) => f.user.display_name.toLowerCase().includes(query) || f.user.username?.toLowerCase().includes(query),
      )
    : friends

  return (
    <div className="space-y-3 animate-fade-in-up">
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search friends..."
        className="input"
      />

      {filtered.length === 0 ? (
        <p className="text-text-muted text-sm text-center py-4">No matches</p>
      ) : (
        <div className="space-y-1">
          {filtered.map((f) => (
            <div key={f.friendship_id} className="flex items-center gap-3 rounded-lg bg-surface-800 px-3 py-2">
              <span className="text-2xl">{f.user.avatar_value}</span>
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{f.user.display_name}</p>
                {f.user.username && <p className="text-text-muted text-sm truncate">@{f.user.username}</p>}
              </div>
              {confirmId === f.friendship_id ? (
                <button
                  data-confirm-btn
                  onClick={() => {
                    if (confirmAction === 'block' && onBlockUser) {
                      onBlockUser(f.user.id)
                    } else {
                      onRemoveFriend(f.friendship_id)
                    }
                    setConfirmId(null)
                  }}
                  className="text-red-400 text-sm font-medium shrink-0"
                >
                  {confirmAction === 'block' ? 'Block?' : 'Sure?'}
                </button>
              ) : (
                <div className="flex gap-2 shrink-0">
                  <button
                    data-confirm-btn
                    onClick={() => {
                      setConfirmAction('remove')
                      setConfirmId(f.friendship_id)
                    }}
                    className="text-red-400 text-sm"
                  >
                    Remove
                  </button>
                  {onBlockUser && (
                    <button
                      data-confirm-btn
                      onClick={() => {
                        setConfirmAction('block')
                        setConfirmId(f.friendship_id)
                      }}
                      className="text-text-muted text-sm hover:text-red-400"
                    >
                      Block
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
