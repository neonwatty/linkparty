'use client'

import { useState, useEffect, useMemo } from 'react'
import { listFriends } from '@/lib/friends'
import type { FriendWithProfile } from '@/lib/friends'
import { LoaderIcon, CheckCircleIcon } from '@/components/icons'

const SearchIcon = () => (
  <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
)

interface FriendsPickerProps {
  selectedIds: string[]
  onSelectionChange: (ids: string[]) => void
  maxSelections?: number
}

export function FriendsPicker({ selectedIds, onSelectionChange, maxSelections = 20 }: FriendsPickerProps) {
  const [friends, setFriends] = useState<FriendWithProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [maxHint, setMaxHint] = useState(false)

  useEffect(() => {
    let cancelled = false
    listFriends()
      .then((data) => {
        if (!cancelled) setFriends(data)
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load friends')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Auto-dismiss max hint
  useEffect(() => {
    if (!maxHint) return
    const t = setTimeout(() => setMaxHint(false), 2000)
    return () => clearTimeout(t)
  }, [maxHint])

  const filtered = useMemo(() => {
    const sorted = [...friends].sort((a, b) => a.user.display_name.localeCompare(b.user.display_name))
    if (!search.trim()) return sorted
    const q = search.trim().toLowerCase()
    return sorted.filter(
      (f) => f.user.display_name.toLowerCase().includes(q) || f.user.username?.toLowerCase().includes(q),
    )
  }, [friends, search])

  const toggle = (userId: string) => {
    if (selectedIds.includes(userId)) {
      onSelectionChange(selectedIds.filter((id) => id !== userId))
    } else if (selectedIds.length >= maxSelections) {
      setMaxHint(true)
    } else {
      onSelectionChange([...selectedIds, userId])
    }
  }

  if (loading) {
    return (
      <div className="card p-4 flex items-center justify-center h-24 text-text-muted">
        <LoaderIcon />
      </div>
    )
  }

  if (error) {
    return <div className="card p-4 text-center text-red-400 text-sm">{error}</div>
  }

  if (friends.length === 0) {
    return (
      <div className="card p-4 text-center text-text-muted text-sm">No friends yet — add friends from your profile</div>
    )
  }

  return (
    <div className="card p-4">
      <div className="relative mb-3">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
          <SearchIcon />
        </span>
        <input
          type="text"
          placeholder="Search friends..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input w-full pl-9"
        />
      </div>

      {maxHint && <p className="text-xs text-amber-400 mb-2">Maximum of {maxSelections} friends can be selected</p>}

      <div className="max-h-[240px] overflow-y-auto space-y-1">
        {filtered.length === 0 ? (
          <p className="text-center text-text-muted text-sm py-4">No matches found</p>
        ) : (
          filtered.map((f) => {
            const selected = selectedIds.includes(f.user.id)
            return (
              <button
                key={f.user.id}
                type="button"
                onClick={() => toggle(f.user.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-colors ${
                  selected ? 'bg-accent-500/10 border-l-2 border-accent-400' : 'hover:bg-surface-700'
                }`}
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-lg shrink-0 bg-surface-700">
                  {f.user.avatar_type === 'emoji' ? (
                    f.user.avatar_value
                  ) : (
                    <span className="text-sm font-bold text-accent-400">
                      {f.user.display_name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{f.user.display_name}</p>
                  {f.user.username && <p className="text-xs text-text-muted truncate">@{f.user.username}</p>}
                </div>
                <div className={`shrink-0 ${selected ? 'text-accent-400' : 'text-surface-600'}`}>
                  <CheckCircleIcon size={20} filled={selected} />
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
