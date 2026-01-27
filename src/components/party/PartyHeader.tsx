import { ChevronLeftIcon, TvIcon, ShareIcon } from '../icons'

interface PartyHeaderProps {
  partyName: string
  partyCode: string
  onLeave: () => void
  onTvMode: () => void
  onShare: () => void
}

export function PartyHeader({
  partyName,
  partyCode,
  onLeave,
  onTvMode,
  onShare,
}: PartyHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-surface-800 safe-area-top">
      <button
        onClick={onLeave}
        className="btn-ghost icon-btn -ml-2 rounded-full"
        aria-label="Leave party"
      >
        <ChevronLeftIcon />
      </button>
      <div className="text-center">
        <div className="font-semibold">{partyName}</div>
        <div className="text-xs text-text-muted font-mono">{partyCode}</div>
      </div>
      <div className="flex gap-0">
        <button
          onClick={onTvMode}
          className="btn-ghost icon-btn rounded-full"
          aria-label="Open TV mode"
        >
          <TvIcon />
        </button>
        <button
          onClick={onShare}
          className="btn-ghost icon-btn rounded-full"
          aria-label="Share party"
        >
          <ShareIcon />
        </button>
      </div>
    </div>
  )
}
