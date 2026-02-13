'use client'

import { LoaderIcon } from '@/components/icons'
import type { FriendRequest, OutgoingRequest } from '@/lib/friends'

interface Props {
  incoming: FriendRequest[]
  outgoing: OutgoingRequest[]
  loading: boolean
  onAccept: (friendshipId: string) => void
  onDecline: (friendshipId: string) => void
  onCancel: (friendshipId: string) => void
}

export default function FriendRequests({ incoming, outgoing, loading, onAccept, onDecline, onCancel }: Props) {
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoaderIcon />
      </div>
    )
  }

  if (incoming.length === 0 && outgoing.length === 0) {
    return <p className="text-text-muted text-sm text-center py-8">No friend requests</p>
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Incoming requests */}
      <div>
        <p className="text-text-secondary text-sm mb-2">Incoming ({incoming.length})</p>
        {incoming.length === 0 ? (
          <p className="text-text-muted text-sm text-center py-4">No incoming requests</p>
        ) : (
          <div className="space-y-1">
            {incoming.map((req) => (
              <div key={req.friendship_id} className="flex items-center gap-3 bg-surface-800 rounded-lg px-3 py-2">
                <span className="text-2xl">{req.from.avatar_value}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{req.from.display_name}</p>
                  {req.from.username && <p className="text-text-muted text-sm truncate">@{req.from.username}</p>}
                </div>
                <button
                  onClick={() => onAccept(req.friendship_id)}
                  className="text-teal-400 text-sm font-medium hover:text-teal-300 shrink-0"
                >
                  Accept
                </button>
                <button
                  onClick={() => onDecline(req.friendship_id)}
                  className="text-text-muted text-sm hover:text-text-secondary shrink-0"
                >
                  Decline
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sent (outgoing) requests */}
      <div>
        <p className="text-text-secondary text-sm mb-2">Sent ({outgoing.length})</p>
        {outgoing.length === 0 ? (
          <p className="text-text-muted text-sm text-center py-4">No sent requests</p>
        ) : (
          <div className="space-y-1">
            {outgoing.map((req) => (
              <div key={req.friendship_id} className="flex items-center gap-3 bg-surface-800 rounded-lg px-3 py-2">
                <span className="text-2xl">{req.to.avatar_value}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{req.to.display_name}</p>
                  {req.to.username && <p className="text-text-muted text-sm truncate">@{req.to.username}</p>}
                </div>
                <button
                  onClick={() => onCancel(req.friendship_id)}
                  className="text-text-muted text-sm hover:text-text-secondary shrink-0"
                >
                  Cancel
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
