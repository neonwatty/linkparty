import { memo } from 'react'
import { UsersIcon } from '../icons'

interface Member {
  id: string
  sessionId: string
  name: string
  avatar: string
  isHost: boolean
}

interface MemberItemProps {
  member: Member
  isCurrentUser: boolean
}

// Memoized individual member item to prevent re-renders when other members change
const MemberItem = memo(function MemberItem({ member, isCurrentUser }: MemberItemProps) {
  return (
    <div className="flex items-center gap-1.5 bg-surface-800 px-2 py-1 rounded-full text-sm">
      <span>{member.avatar}</span>
      <span>{isCurrentUser ? 'You' : member.name}</span>
      {member.isHost && (
        <span className="text-[10px] bg-accent-500/20 text-accent-400 px-1.5 py-0.5 rounded-full">
          HOST
        </span>
      )}
    </div>
  )
})

interface MembersListProps {
  members: Member[]
  currentSessionId: string
}

export const MembersList = memo(function MembersList({ members, currentSessionId }: MembersListProps) {
  return (
    <div className="px-4 py-3 border-b border-surface-800">
      <div className="flex items-center gap-2 text-text-secondary text-sm">
        <UsersIcon />
        <span>{members.length} watching</span>
      </div>
      <div className="flex gap-2 mt-2 flex-wrap">
        {members.map(member => (
          <MemberItem
            key={member.id}
            member={member}
            isCurrentUser={member.sessionId === currentSessionId}
          />
        ))}
      </div>
    </div>
  )
})
