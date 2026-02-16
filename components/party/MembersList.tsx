'use client'

import { memo } from 'react'
import { UsersIcon } from '@/components/icons'
import type { FriendshipStatus } from '@/lib/friends'

interface Member {
  id: string
  sessionId: string
  name: string
  avatar: string
  isHost: boolean
  userId?: string
}

interface MemberItemProps {
  member: Member
  isCurrentUser: boolean
  friendshipStatus?: FriendshipStatus
  onAddFriend?: (userId: string) => void
}

// Memoized individual member item to prevent re-renders when other members change
const MemberItem = memo(function MemberItem({ member, isCurrentUser, friendshipStatus, onAddFriend }: MemberItemProps) {
  return (
    <div className="flex items-center gap-1.5 bg-surface-800 px-2 py-1 rounded-full text-sm">
      <span>{member.avatar}</span>
      <span>{isCurrentUser ? 'You' : member.name}</span>
      {member.isHost && (
        <span className="text-[10px] bg-accent-500/20 text-accent-400 px-1.5 py-0.5 rounded-full">HOST</span>
      )}
      {!isCurrentUser && member.userId && friendshipStatus === 'none' && (
        <button
          onClick={() => onAddFriend?.(member.userId!)}
          className="text-accent-400 text-xs bg-accent-500/10 px-1.5 py-0.5 rounded-full hover:bg-accent-500/20 transition-colors"
          aria-label={`Add ${member.name} as friend`}
        >
          +
        </button>
      )}
      {!isCurrentUser && member.userId && friendshipStatus === 'pending_sent' && (
        <span className="text-text-muted text-[10px] px-1.5 py-0.5">Sent</span>
      )}
    </div>
  )
})

interface MembersListProps {
  members: Member[]
  currentSessionId: string
  friendshipStatuses?: Record<string, FriendshipStatus>
  onAddFriend?: (userId: string) => void
}

export const MembersList = memo(function MembersList({
  members,
  currentSessionId,
  friendshipStatuses,
  onAddFriend,
}: MembersListProps) {
  return (
    <div className="px-4 py-3 border-b border-surface-800">
      <div className="flex items-center gap-2 text-text-secondary text-sm">
        <UsersIcon />
        <span>{members.length} watching</span>
      </div>
      <div className="flex gap-2 mt-2 flex-wrap">
        {members.map((member) => (
          <MemberItem
            key={member.id}
            member={member}
            isCurrentUser={member.sessionId === currentSessionId}
            friendshipStatus={member.userId ? friendshipStatuses?.[member.userId] : undefined}
            onAddFriend={onAddFriend}
          />
        ))}
      </div>
    </div>
  )
})
