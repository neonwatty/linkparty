'use client'

import { LoaderIcon } from '@/components/icons'
import type { UserProfile } from '@/lib/profile'

interface Props {
  blockedUsers: UserProfile[]
  loading: boolean
  onUnblock: (userId: string) => void
}

export default function BlockedUsers({ blockedUsers, loading, onUnblock }: Props) {
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoaderIcon />
      </div>
    )
  }

  if (blockedUsers.length === 0) {
    return <p className="text-text-muted text-sm text-center py-8">No blocked users</p>
  }

  return (
    <div className="space-y-1 animate-fade-in-up">
      {blockedUsers.map((user) => (
        <div key={user.id} className="flex items-center gap-3 rounded-lg bg-surface-800 px-3 py-2">
          <span className="text-2xl">{user.avatar_value}</span>
          <div className="min-w-0 flex-1">
            <p className="font-medium truncate">{user.display_name}</p>
            {user.username && <p className="text-text-muted text-sm truncate">@{user.username}</p>}
          </div>
          <button onClick={() => onUnblock(user.id)} className="text-accent-400 text-sm shrink-0">
            Unblock
          </button>
        </div>
      ))}
    </div>
  )
}
