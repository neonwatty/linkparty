import type { QueueItem } from '../../hooks/useParty'
import {
  PlayIcon,
  SkipIcon,
  TwitterIcon,
  RedditIcon,
  NoteIcon,
  ImageIcon,
} from '../icons'

interface NowShowingSectionProps {
  currentItem: QueueItem
  isHost: boolean
  onNext: () => void
  onImageClick: (url: string, caption?: string) => void
}

export function NowShowingSection({
  currentItem,
  isHost,
  onNext,
  onImageClick,
}: NowShowingSectionProps) {
  return (
    <div className="p-4 bg-gradient-to-b from-surface-900 to-surface-950">
      <div className="text-xs text-accent-500 font-mono mb-2 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-accent-500 animate-pulse"></span>
        NOW SHOWING
      </div>

      {/* YouTube Content */}
      {currentItem.type === 'youtube' && (
        <>
          <div className="relative aspect-video bg-surface-800 rounded-xl overflow-hidden mb-4 glow-accent">
            <img
              src={currentItem.thumbnail}
              alt={currentItem.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                <PlayIcon />
              </div>
            </div>
          </div>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-lg truncate">{currentItem.title}</h2>
              <p className="text-text-muted text-sm">{currentItem.channel}</p>
            </div>
          </div>
        </>
      )}

      {/* Tweet Content */}
      {currentItem.type === 'tweet' && (
        <div className="bg-surface-800 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
              <TwitterIcon size={24} />
            </div>
            <div>
              <div className="font-semibold">{currentItem.tweetAuthor}</div>
              <div className="text-text-muted text-sm">{currentItem.tweetHandle}</div>
            </div>
          </div>
          <p className="text-lg leading-relaxed mb-3">{currentItem.tweetContent}</p>
          <div className="text-text-muted text-sm">{currentItem.tweetTimestamp}</div>
        </div>
      )}

      {/* Reddit Content */}
      {currentItem.type === 'reddit' && (
        <div className="bg-surface-800 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-500">
              <RedditIcon size={14} />
            </div>
            <span className="text-orange-500 text-sm font-medium">{currentItem.subreddit}</span>
          </div>
          <h2 className="font-semibold text-lg mb-2">{currentItem.redditTitle}</h2>
          <p className="text-text-secondary text-sm mb-3 line-clamp-3">{currentItem.redditBody}</p>
          <div className="flex items-center gap-4 text-text-muted text-sm">
            <span>{currentItem.upvotes?.toLocaleString()} upvotes</span>
            <span>{currentItem.commentCount?.toLocaleString()} comments</span>
          </div>
        </div>
      )}

      {/* Note Content */}
      {currentItem.type === 'note' && (
        <div className="bg-surface-800 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-gray-500/20 flex items-center justify-center text-gray-400">
              <NoteIcon size={16} />
            </div>
            <span className="text-text-muted text-sm">Note from {currentItem.addedBy}</span>
          </div>
          <p className="text-lg leading-relaxed">{currentItem.noteContent}</p>
        </div>
      )}

      {/* Image Content */}
      {currentItem.type === 'image' && (
        <div className="mb-4">
          <div
            className="relative rounded-xl overflow-hidden cursor-pointer"
            onClick={() => currentItem.imageUrl && onImageClick(currentItem.imageUrl, currentItem.imageCaption)}
          >
            {currentItem.imageUrl ? (
              <img
                src={currentItem.imageUrl}
                alt={currentItem.imageCaption || currentItem.imageName || 'Shared image'}
                className="w-full max-h-[50vh] object-contain bg-surface-800 rounded-xl"
              />
            ) : (
              <div className="w-full aspect-video bg-surface-800 rounded-xl flex items-center justify-center">
                <div className="text-purple-400">
                  <ImageIcon size={48} />
                </div>
              </div>
            )}
          </div>
          {currentItem.imageCaption && (
            <p className="text-text-secondary text-sm mt-2 text-center">{currentItem.imageCaption}</p>
          )}
          <p className="text-text-muted text-xs mt-1 text-center">
            Shared by {currentItem.addedBy} · Tap to expand
          </p>
        </div>
      )}

      {/* Host Controls */}
      {isHost && (
        <div className="flex items-center justify-center mt-4">
          <button
            onClick={onNext}
            className="flex items-center gap-2 px-6 py-3 rounded-full bg-accent-500 hover:bg-accent-400 transition-colors font-medium"
          >
            <SkipIcon />
            Next
          </button>
        </div>
      )}
    </div>
  )
}
