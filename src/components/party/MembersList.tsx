import { UsersIcon } from '../icons'

interface Member {
  id: string
  sessionId: string
  name: string
  avatar: string
  isHost: boolean
}

interface MembersListProps {
  members: Member[]
  currentSessionId: string
}

export function MembersList({ members, currentSessionId }: MembersListProps) {
  return (
    <div className="px-4 py-3 border-b border-surface-800">
      <div className="flex items-center gap-2 text-text-secondary text-sm">
        <UsersIcon />
        <span>{members.length} watching</span>
      </div>
      <div className="flex gap-2 mt-2 flex-wrap">
        {members.map(member => (
          <div
            key={member.id}
            className="flex items-center gap-1.5 bg-surface-800 px-2 py-1 rounded-full text-sm"
          >
            <span>{member.avatar}</span>
            <span>{member.sessionId === currentSessionId ? 'You' : member.name}</span>
            {member.isHost && (
              <span className="text-[10px] bg-accent-500/20 text-accent-400 px-1.5 py-0.5 rounded-full">
                HOST
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
