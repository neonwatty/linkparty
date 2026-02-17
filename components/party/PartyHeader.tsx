'use client'

import { memo } from 'react'
import { ChevronLeftIcon, TvIcon, ShareIcon, MailIcon } from '@/components/icons'
import { ExpirationBadge } from './ExpirationBadge'

interface PartyHeaderProps {
  partyName: string
  partyCode: string
  expiresAt?: string
  onLeave: () => void
  onTvMode: () => void
  onShare: () => void
  onInvite: () => void
}

export const PartyHeader = memo(function PartyHeader({
  partyName,
  partyCode,
  expiresAt,
  onLeave,
  onTvMode,
  onShare,
  onInvite,
}: PartyHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-surface-800 safe-area-top">
      <button onClick={onLeave} className="btn-ghost icon-btn -ml-2 rounded-full" aria-label="Leave party">
        <ChevronLeftIcon />
      </button>
      <div className="text-center">
        <div className="font-semibold">{partyName}</div>
        <div className="text-xs text-text-muted font-mono flex items-center justify-center gap-2">
          <span data-testid="party-code">{partyCode}</span>
          {expiresAt && <ExpirationBadge expiresAt={expiresAt} />}
        </div>
      </div>
      <div className="flex gap-0">
        <button onClick={onTvMode} className="btn-ghost icon-btn rounded-full" aria-label="Open TV mode">
          <TvIcon />
        </button>
        <button onClick={onInvite} className="btn-ghost icon-btn rounded-full" aria-label="Invite by email">
          <MailIcon />
        </button>
        <button onClick={onShare} className="btn-ghost icon-btn rounded-full" aria-label="Share party">
          <ShareIcon />
        </button>
      </div>
    </div>
  )
})
