import { useState } from 'react'
import { useParty } from '../../hooks/useParty'
import { getQueueItemTitle } from '../../utils/queueHelpers'
import { getContentTypeBadge } from '../../utils/contentHelpers'
import type { Screen } from '../../types'
import { ImageLightbox } from '../ui/ImageLightbox'
import {
  ChevronLeftIcon,
  TwitterIcon,
  RedditIcon,
  NoteIcon,
  ImageIcon,
  UsersIcon,
} from '../icons'

interface TVModeScreenProps {
  onNavigate: (screen: Screen) => void
  partyId: string
  partyCode: string
}

export function TVModeScreen({ onNavigate, partyId, partyCode }: TVModeScreenProps) {
  const { queue, members, partyInfo } = useParty(partyId)
  const [lightboxImage, setLightboxImage] = useState<{ url: string; caption?: string } | null>(null)

  const currentItem = queue.find(v => v.status === 'showing')
  const upNext = queue.filter(v => v.status === 'pending').slice(0, 3)

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Exit button - clearly visible */}
      <button
        onClick={() => onNavigate('party')}
        className="absolute top-12 left-4 z-10 bg-surface-800/90 backdrop-blur-sm border border-white/20 px-4 py-2 rounded-full text-sm text-white font-medium cursor-pointer hover:bg-surface-700 active:scale-95 transition-all flex items-center gap-2"
        aria-label="Exit TV mode"
      >
        <ChevronLeftIcon />
        Exit
      </button>

      {/* Content area - Different display for each type */}
      <div className="flex-1 flex items-center justify-center relative">
        {currentItem?.type === 'youtube' && (
          <>
            <img
              src={currentItem.thumbnail}
              alt={currentItem.title}
              className="w-full h-full object-cover absolute inset-0"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-white/50 text-6xl">▶</div>
            </div>
          </>
        )}

        {currentItem?.type === 'tweet' && (
          <div className="max-w-3xl mx-auto p-8">
            <div className="bg-surface-900/90 backdrop-blur rounded-2xl p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                  <TwitterIcon size={32} />
                </div>
                <div>
                  <div className="text-2xl font-bold">{currentItem.tweetAuthor}</div>
                  <div className="text-text-muted text-lg">{currentItem.tweetHandle}</div>
                </div>
              </div>
              <p className="text-3xl leading-relaxed mb-6">{currentItem.tweetContent}</p>
              <div className="text-text-muted text-lg">{currentItem.tweetTimestamp}</div>
            </div>
          </div>
        )}

        {currentItem?.type === 'reddit' && (
          <div className="max-w-4xl mx-auto p-8">
            <div className="bg-surface-900/90 backdrop-blur rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-500">
                  <RedditIcon size={20} />
                </div>
                <span className="text-orange-500 text-xl font-medium">{currentItem.subreddit}</span>
              </div>
              <h2 className="text-3xl font-bold mb-4">{currentItem.redditTitle}</h2>
              <p className="text-xl text-text-secondary leading-relaxed mb-6">{currentItem.redditBody}</p>
              <div className="flex items-center gap-6 text-text-muted text-lg">
                <span>{currentItem.upvotes?.toLocaleString()} upvotes</span>
                <span>{currentItem.commentCount?.toLocaleString()} comments</span>
              </div>
            </div>
          </div>
        )}

        {currentItem?.type === 'note' && (
          <div className="max-w-3xl mx-auto p-8">
            <div className="bg-surface-900/90 backdrop-blur rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-gray-500/20 flex items-center justify-center text-gray-400">
                  <NoteIcon size={24} />
                </div>
                <span className="text-text-muted text-lg">Note from {currentItem.addedBy}</span>
              </div>
              <p className="text-3xl leading-relaxed">{currentItem.noteContent}</p>
            </div>
          </div>
        )}

        {currentItem?.type === 'image' && (
          <div className="max-w-5xl mx-auto p-8 flex items-center justify-center">
            <div
              className="cursor-pointer"
              onClick={() => currentItem.imageUrl && setLightboxImage({
                url: currentItem.imageUrl,
                caption: currentItem.imageCaption,
              })}
            >
              {currentItem.imageUrl ? (
                <div className="text-center">
                  <img
                    src={currentItem.imageUrl}
                    alt={currentItem.imageCaption || currentItem.imageName || 'Shared image'}
                    className="max-w-full max-h-[70vh] object-contain rounded-2xl"
                  />
                  {currentItem.imageCaption && (
                    <p className="text-text-secondary text-xl mt-4">{currentItem.imageCaption}</p>
                  )}
                  <p className="text-text-muted text-sm mt-2">
                    Shared by {currentItem.addedBy} · Click to expand
                  </p>
                </div>
              ) : (
                <div className="bg-surface-900/90 backdrop-blur rounded-2xl p-12 flex flex-col items-center justify-center">
                  <div className="text-purple-400 mb-4">
                    <ImageIcon size={64} />
                  </div>
                  <p className="text-text-muted text-lg">Image unavailable</p>
                </div>
              )}
            </div>
          </div>
        )}

        {!currentItem && (
          <div className="text-center text-text-muted">
            <p className="text-2xl">No content showing</p>
            <p className="text-lg mt-2">Add items to the queue to get started</p>
          </div>
        )}
      </div>

      {/* Bottom bar - Now showing + Up next */}
      <div className="bg-gradient-to-t from-black via-black/95 to-transparent p-6 pt-12">
        <div className="flex items-end justify-between gap-8">
          {/* Now showing */}
          <div className="flex-1">
            <div className="text-accent-500 text-xs font-mono mb-1 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-500 animate-pulse"></span>
              NOW SHOWING
            </div>
            <h2 className="text-2xl font-bold">{currentItem ? getQueueItemTitle(currentItem) : 'Nothing playing'}</h2>
            <p className="text-text-muted mt-1">
              {currentItem?.type === 'youtube' && currentItem.channel}
              {currentItem?.type === 'tweet' && currentItem.tweetAuthor}
              {currentItem?.type === 'reddit' && currentItem.subreddit}
              {currentItem?.type === 'note' && `Added by ${currentItem.addedBy}`}
              {currentItem?.type === 'image' && `Added by ${currentItem.addedBy}`}
            </p>
          </div>

          {/* Up next */}
          {upNext.length > 0 && (
            <div className="flex-shrink-0">
              <div className="text-text-muted text-xs mb-2">UP NEXT</div>
              <div className="flex gap-2">
                {upNext.map((item) => {
                  const badge = getContentTypeBadge(item.type)
                  const BadgeIcon = badge.icon
                  return (
                    <div key={item.id} className={`w-24 h-14 rounded-lg overflow-hidden ${badge.bg} flex items-center justify-center`}>
                      {item.type === 'youtube' && item.thumbnail ? (
                        <img
                          src={item.thumbnail}
                          alt={item.title}
                          className="w-full h-full object-cover opacity-70"
                        />
                      ) : item.type === 'image' && item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.imageCaption || item.imageName || 'Image'}
                          className="w-full h-full object-cover opacity-70"
                        />
                      ) : (
                        <span className={`${badge.color} opacity-70`}>
                          <BadgeIcon size={24} />
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Party info */}
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/10">
          <div className="font-mono text-sm text-text-muted">{partyCode}</div>
          <div className="flex items-center gap-1 text-text-muted text-sm">
            <UsersIcon />
            <span>{members.length}</span>
          </div>
          {partyInfo?.name && (
            <div className="text-text-muted text-sm">{partyInfo.name}</div>
          )}
        </div>
      </div>

      {/* Image Lightbox */}
      {lightboxImage && (
        <ImageLightbox
          imageUrl={lightboxImage.url}
          caption={lightboxImage.caption}
          isOpen={!!lightboxImage}
          onClose={() => setLightboxImage(null)}
        />
      )}
    </div>
  )
}
