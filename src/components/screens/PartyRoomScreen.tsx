import { useState } from 'react'
import type { Screen, ContentType, AddContentStep } from '../../types'
import { getSessionId, getDisplayName, clearCurrentParty } from '../../lib/supabase'
import { useParty } from '../../hooks/useParty'
import type { QueueItem } from '../../hooks/useParty'
import { fetchContentMetadata, type ContentMetadataResponse } from '../../lib/contentMetadata'
import { detectContentType, getContentTypeBadge } from '../../utils/contentHelpers'
import { getQueueItemTitle, getQueueItemSubtitle } from '../../utils/queueHelpers'
import { isItemOverdue } from '../../utils/dateHelpers'
import {
  PlayIcon,
  SkipIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
  DragIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  PlayNextIcon,
  ShareIcon,
  ChevronLeftIcon,
  CloseIcon,
  YoutubeIcon,
  TwitterIcon,
  RedditIcon,
  NoteIcon,
  LinkIcon,
  CheckIcon,
  CheckCircleIcon,
  LoaderIcon,
  AlertIcon,
  ClockIcon,
  CalendarIcon,
  UsersIcon,
  TvIcon,
} from '../icons'

interface PartyRoomScreenProps {
  onNavigate: (screen: Screen) => void
  partyId: string
  partyCode: string
  onLeaveParty: () => void
}

export function PartyRoomScreen({ onNavigate, partyId, partyCode, onLeaveParty }: PartyRoomScreenProps) {
  const {
    queue,
    members,
    partyInfo,
    isLoading,
    addToQueue,
    moveItem,
    deleteItem,
    advanceQueue,
    showNext,
    updateNoteContent,
    toggleComplete,
  } = useParty(partyId)

  const [showAddContent, setShowAddContent] = useState(false)
  const [addContentStep, setAddContentStep] = useState<AddContentStep>('input')
  const [contentUrl, setContentUrl] = useState('')
  const [noteText, setNoteText] = useState('')
  const [noteDueDate, setNoteDueDate] = useState<string>('')
  const [detectedType, setDetectedType] = useState<ContentType | null>(null)
  const [fetchedPreview, setFetchedPreview] = useState<ContentMetadataResponse['data'] | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<QueueItem | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  // Note editing state
  const [showEditNote, setShowEditNote] = useState(false)
  const [editNoteText, setEditNoteText] = useState('')
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  // Note viewing state
  const [showViewNote, setShowViewNote] = useState(false)
  const [viewingNote, setViewingNote] = useState<QueueItem | null>(null)
  // Share/copy feedback state
  const [showCopied, setShowCopied] = useState(false)

  const sessionId = getSessionId()
  const currentUserDisplayName = getDisplayName() || 'You'
  const isHost = partyInfo?.hostSessionId === sessionId

  const currentItem = queue.find(v => v.status === 'showing')
  const pendingItems = queue.filter(v => v.status === 'pending')

  // Handle URL submission - fetch real metadata
  const handleUrlSubmit = async () => {
    const type = detectContentType(contentUrl)
    if (!type) return

    setDetectedType(type)
    setAddContentStep('loading')
    setFetchError(null)

    try {
      const result = await fetchContentMetadata(contentUrl)

      if (result.success && result.data) {
        setFetchedPreview(result.data)
        setAddContentStep('preview')
      } else {
        setFetchError(result.error || 'Failed to fetch content')
        // Still show preview with limited data
        setFetchedPreview(null)
        setAddContentStep('preview')
      }
    } catch (err) {
      console.error('Metadata fetch error:', err)
      setFetchError(err instanceof Error ? err.message : 'Failed to fetch content')
      setFetchedPreview(null)
      setAddContentStep('preview')
    }
  }

  const handleAddToQueue = () => {
    if (!detectedType) return

    // Immediately show success state (sync) to ensure iOS touch event completes
    setAddContentStep('success')

    // Then do async work
    const doAddToQueue = async () => {
      try {
        let queueItemData: Partial<QueueItem>

        if (detectedType === 'note') {
          queueItemData = { noteContent: noteText, dueDate: noteDueDate || undefined }
        } else if (fetchedPreview) {
          // Map fetched preview data to queue item fields
          queueItemData = {
            title: fetchedPreview.title,
            channel: fetchedPreview.channel,
            duration: fetchedPreview.duration,
            thumbnail: fetchedPreview.thumbnail,
            tweetAuthor: fetchedPreview.tweetAuthor,
            tweetHandle: fetchedPreview.tweetHandle,
            tweetContent: fetchedPreview.tweetContent,
            tweetTimestamp: fetchedPreview.tweetTimestamp,
            subreddit: fetchedPreview.subreddit,
            redditTitle: fetchedPreview.redditTitle,
            redditBody: fetchedPreview.redditBody,
            upvotes: fetchedPreview.upvotes,
            commentCount: fetchedPreview.commentCount,
          }
        } else {
          // Fallback if no preview data
          queueItemData = {}
        }

        await addToQueue({
          type: detectedType,
          status: queue.length === 0 ? 'showing' : 'pending',
          addedBy: currentUserDisplayName,
          isCompleted: false,
          ...queueItemData,
        })
      } catch (err) {
        console.error('Failed to add to queue:', err)
      }
    }

    doAddToQueue()

    setTimeout(() => {
      setShowAddContent(false)
      setAddContentStep('input')
      setContentUrl('')
      setNoteText('')
      setNoteDueDate('')
      setDetectedType(null)
      setFetchedPreview(null)
      setFetchError(null)
    }, 1500)
  }

  const handleNoteSubmit = () => {
    console.log('handleNoteSubmit called, noteText:', noteText.trim())
    if (noteText.trim()) {
      console.log('Setting detectedType to note')
      setDetectedType('note')
      setAddContentStep('preview')
    }
  }

  // Note editing handlers
  const handleOpenEditNote = (item: QueueItem) => {
    if (item.type === 'note') {
      setEditNoteText(item.noteContent || '')
      setEditingNoteId(item.id)
      setShowEditNote(true)
      setSelectedItem(null)
    }
  }

  const handleSaveNote = async () => {
    if (editingNoteId && editNoteText.trim()) {
      try {
        await updateNoteContent(editingNoteId, editNoteText.trim())
        setShowEditNote(false)
        setEditNoteText('')
        setEditingNoteId(null)
      } catch (err) {
        console.error('Failed to update note:', err)
      }
    }
  }

  const handleCancelEditNote = () => {
    setShowEditNote(false)
    setEditNoteText('')
    setEditingNoteId(null)
  }

  // Note viewing handlers
  const handleViewNote = (item: QueueItem) => {
    if (item.type === 'note') {
      setViewingNote(item)
      setShowViewNote(true)
      setSelectedItem(null)
    }
  }

  const handleMoveUp = async (itemId: string) => {
    await moveItem(itemId, 'up')
    setSelectedItem(null)
  }

  const handleMoveDown = async (itemId: string) => {
    await moveItem(itemId, 'down')
    setSelectedItem(null)
  }

  const handleDelete = async () => {
    if (selectedItem) {
      try {
        await deleteItem(selectedItem.id)
        setShowDeleteConfirm(false)
        setSelectedItem(null)
      } catch (err) {
        console.error('Failed to delete item:', err)
      }
    }
  }

  const handleShowNext = async (itemId: string) => {
    await showNext(itemId)
    setSelectedItem(null)
  }

  const handleNext = async () => {
    await advanceQueue()
  }

  const handleLeave = () => {
    clearCurrentParty()
    onLeaveParty()
  }

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}?join=${partyCode}`

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${partyInfo?.name || 'Party'}`,
          text: `Join my Link Party with code ${partyCode}`,
          url: shareUrl,
        })
      } catch (err) {
        // User cancelled or share failed, fall back to clipboard
        if ((err as Error).name !== 'AbortError') {
          await copyToClipboard(shareUrl)
        }
      }
    } else {
      await copyToClipboard(shareUrl)
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setShowCopied(true)
      setTimeout(() => setShowCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  if (isLoading) {
    return (
      <div className="container-mobile bg-surface-950 flex flex-col items-center justify-center">
        <LoaderIcon />
        <p className="text-text-muted mt-4">Loading party...</p>
      </div>
    )
  }

  return (
    <div className="container-mobile bg-surface-950 flex flex-col min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-surface-800 safe-area-top">
        <button
          onClick={handleLeave}
          className="btn-ghost icon-btn -ml-2 rounded-full"
        >
          <ChevronLeftIcon />
        </button>
        <div className="text-center">
          <div className="font-semibold">{partyInfo?.name || 'Party'}</div>
          <div className="text-xs text-text-muted font-mono">{partyCode}</div>
        </div>
        <div className="flex gap-0">
          <button
            onClick={() => onNavigate('tv')}
            className="btn-ghost icon-btn rounded-full"
            title="TV Mode"
          >
            <TvIcon />
          </button>
          <button
            onClick={handleShare}
            className="btn-ghost icon-btn rounded-full"
            title="Share Party"
          >
            <ShareIcon />
          </button>
        </div>
      </div>

      {/* Now Showing */}
      {currentItem && (
        <div className="p-4 bg-gradient-to-b from-surface-900 to-surface-950">
          <div className="text-xs text-accent-500 font-mono mb-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent-500 animate-pulse"></span>
            NOW SHOWING
          </div>

          {/* Content Display - Different for each type */}
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

          {/* Host Controls - Just Next button */}
          {isHost && (
            <div className="flex items-center justify-center mt-4">
              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-6 py-3 rounded-full bg-accent-500 hover:bg-accent-400 transition-colors font-medium"
              >
                <SkipIcon />
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* Members */}
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
              <span>{member.sessionId === sessionId ? 'You' : member.name}</span>
              {member.isHost && (
                <span className="text-[10px] bg-accent-500/20 text-accent-400 px-1.5 py-0.5 rounded-full">
                  HOST
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Queue */}
      <div className="flex-1 overflow-auto">
        <div className="px-4 py-3 flex items-center justify-between sticky top-0 bg-surface-950/95 backdrop-blur z-10">
          <div className="text-sm text-text-secondary">
            Up next · {pendingItems.length} items
          </div>
          <div className="text-xs text-text-muted">Tap to edit</div>
        </div>

        <div className="px-4 pb-24">
          {pendingItems.map((item, index) => {
            const badge = getContentTypeBadge(item.type)
            const BadgeIcon = badge.icon
            const isOwnItem = item.addedBySessionId === sessionId
            const overdue = isItemOverdue(item)
            return (
              <div
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className={`queue-item cursor-pointer active:bg-surface-700 ${item.isCompleted ? 'opacity-60' : ''}`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Completion checkbox for notes */}
                {item.type === 'note' ? (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleComplete(item.id)
                    }}
                    onTouchEnd={(e) => {
                      e.stopPropagation()
                      e.preventDefault()
                      toggleComplete(item.id)
                    }}
                    className={`flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center -ml-2 cursor-pointer ${item.isCompleted ? 'text-green-500' : overdue ? 'text-red-500' : 'text-text-muted'}`}
                  >
                    <CheckCircleIcon size={24} filled={item.isCompleted} />
                  </div>
                ) : (
                  <DragIcon />
                )}
                {/* Content type badge/preview */}
                <div className={`relative w-20 h-12 rounded-lg overflow-hidden flex-shrink-0 ${badge.bg} flex items-center justify-center`}>
                  {item.type === 'youtube' && item.thumbnail ? (
                    <img
                      src={item.thumbnail}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className={badge.color}>
                      <BadgeIcon size={24} />
                    </span>
                  )}
                  {isOwnItem && (
                    <div className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-teal-500"></div>
                  )}
                  {/* Overdue indicator */}
                  {overdue && (
                    <div className="absolute bottom-0.5 right-0.5 text-red-500">
                      <AlertIcon size={12} />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`${badge.color}`}>
                      <BadgeIcon size={12} />
                    </span>
                    <span className={`font-medium text-sm truncate ${item.isCompleted ? 'line-through' : ''}`}>
                      {getQueueItemTitle(item)}
                    </span>
                    {/* Due date indicator */}
                    {item.dueDate && !item.isCompleted && (
                      <span className={`flex-shrink-0 ${overdue ? 'text-red-400' : 'text-amber-400'}`}>
                        <ClockIcon size={12} />
                      </span>
                    )}
                  </div>
                  <div className={`text-xs ${overdue ? 'text-red-400' : 'text-text-muted'}`}>
                    {getQueueItemSubtitle(item)}
                  </div>
                </div>
                <div className="text-text-muted">
                  <EditIcon />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Add Content FAB */}
      <button
        onClick={() => setShowAddContent(true)}
        className="fab bg-accent-500 hover:bg-accent-400 transition-all hover:scale-105 animate-pulse-glow"
      >
        <PlusIcon />
      </button>

      {/* Add Content Modal - Enhanced */}
      {showAddContent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end justify-center z-50">
          <div className="bg-surface-900 w-full max-w-md rounded-t-3xl p-6 bottom-sheet animate-fade-in-up">
            <div className="w-12 h-1 bg-surface-600 rounded-full mx-auto mb-6"></div>

            {/* Step: Input - URL or Note */}
            {addContentStep === 'input' && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold">Add to queue</h3>
                  <button onClick={() => setShowAddContent(false)} className="text-text-muted">
                    <CloseIcon />
                  </button>
                </div>

                {/* URL Input */}
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <LinkIcon />
                    <span className="text-sm text-text-secondary">Paste a URL</span>
                  </div>
                  <input
                    type="text"
                    placeholder="YouTube, Twitter/X, or Reddit URL..."
                    value={contentUrl}
                    onChange={(e) => setContentUrl(e.target.value)}
                    className="input"
                    autoFocus
                  />
                  <div className="flex items-center gap-4 mt-2 text-xs text-text-muted">
                    <span className="flex items-center gap-1"><YoutubeIcon size={12} /> YouTube</span>
                    <span className="flex items-center gap-1"><TwitterIcon size={12} /> Twitter/X</span>
                    <span className="flex items-center gap-1"><RedditIcon size={12} /> Reddit</span>
                  </div>
                </div>

                <button
                  onClick={handleUrlSubmit}
                  disabled={!contentUrl || !detectContentType(contentUrl)}
                  className="btn btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed mb-4"
                >
                  Continue
                </button>

                <div className="flex items-center gap-4 mb-4">
                  <div className="flex-1 h-px bg-surface-700"></div>
                  <span className="text-text-muted text-sm">or</span>
                  <div className="flex-1 h-px bg-surface-700"></div>
                </div>

                {/* Write a Note Button */}
                <button
                  onClick={() => setAddContentStep('note')}
                  className="btn btn-secondary w-full flex items-center justify-center gap-2"
                >
                  <NoteIcon size={20} />
                  Write a note
                </button>
              </>
            )}

            {/* Step: Write Note */}
            {addContentStep === 'note' && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold">Write a note</h3>
                  <button
                    onClick={() => { setAddContentStep('input'); setNoteText(''); }}
                    className="text-text-muted"
                  >
                    <CloseIcon />
                  </button>
                </div>

                <textarea
                  placeholder="Share a thought, reminder, or message..."
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  className="input min-h-[120px] resize-none mb-4"
                  autoFocus
                />

                {/* Optional Due Date */}
                <div className="mb-4">
                  <label className="flex items-center gap-2 text-sm text-text-secondary mb-2">
                    <CalendarIcon size={16} />
                    Due date (optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={noteDueDate}
                    onChange={(e) => setNoteDueDate(e.target.value)}
                    className="input"
                    min={new Date().toISOString().slice(0, 16)}
                  />
                  {noteDueDate && (
                    <button
                      onClick={() => setNoteDueDate('')}
                      className="text-xs text-text-muted hover:text-text-secondary mt-1"
                    >
                      Clear due date
                    </button>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => { setAddContentStep('input'); setNoteText(''); setNoteDueDate(''); }}
                    className="btn btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleNoteSubmit}
                    disabled={!noteText.trim()}
                    className="btn btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Preview
                  </button>
                </div>
              </>
            )}

            {/* Step: Loading */}
            {addContentStep === 'loading' && (
              <div className="py-8 flex flex-col items-center">
                <LoaderIcon />
                <p className="text-text-secondary mt-4">Fetching content details...</p>
              </div>
            )}

            {/* Step: Preview */}
            {addContentStep === 'preview' && detectedType && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold">Add to queue?</h3>
                  <button
                    onClick={() => { setAddContentStep('input'); setContentUrl(''); setNoteText(''); setDetectedType(null); setFetchedPreview(null); setFetchError(null); }}
                    className="text-text-muted"
                  >
                    <CloseIcon />
                  </button>
                </div>

                {/* Error message if fetch failed */}
                {fetchError && (
                  <div className="card p-3 mb-4 border-yellow-500/50 bg-yellow-500/10">
                    <p className="text-yellow-500 text-sm">{fetchError}</p>
                    <p className="text-text-muted text-xs mt-1">Content will be added with limited preview</p>
                  </div>
                )}

                {/* Preview Card - Different for each type */}
                <div className="card p-3 mb-4">
                  {detectedType === 'youtube' && (
                    <div className="flex gap-3">
                      {fetchedPreview?.thumbnail && (
                        <div className="w-32 h-18 rounded-lg overflow-hidden bg-surface-800 flex-shrink-0">
                          <img
                            src={fetchedPreview.thumbnail}
                            alt={fetchedPreview.title || 'YouTube video'}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 mb-1">
                          <YoutubeIcon size={12} />
                          <span className="text-red-500 text-xs">YouTube</span>
                        </div>
                        <div className="font-medium text-sm line-clamp-2">{fetchedPreview?.title || 'YouTube Video'}</div>
                        {fetchedPreview?.channel && (
                          <div className="text-text-muted text-xs mt-1">{fetchedPreview.channel}</div>
                        )}
                        {fetchedPreview?.duration && (
                          <div className="text-text-muted text-xs mt-1 font-mono">{fetchedPreview.duration}</div>
                        )}
                      </div>
                    </div>
                  )}

                  {detectedType === 'tweet' && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-blue-400/20 flex items-center justify-center text-blue-400">
                          <TwitterIcon size={16} />
                        </div>
                        <div>
                          <div className="font-medium text-sm">{fetchedPreview?.tweetAuthor || 'Twitter User'}</div>
                          {fetchedPreview?.tweetHandle && (
                            <div className="text-text-muted text-xs">{fetchedPreview.tweetHandle}</div>
                          )}
                        </div>
                      </div>
                      {fetchedPreview?.tweetContent && (
                        <p className="text-sm">{fetchedPreview.tweetContent}</p>
                      )}
                    </div>
                  )}

                  {detectedType === 'reddit' && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-orange-500"><RedditIcon size={16} /></span>
                        <span className="text-orange-500 text-sm">{fetchedPreview?.subreddit || 'Reddit'}</span>
                      </div>
                      <div className="font-medium text-sm mb-1">{fetchedPreview?.redditTitle || 'Reddit Post'}</div>
                      {fetchedPreview?.redditBody && (
                        <p className="text-text-muted text-xs line-clamp-2">{fetchedPreview.redditBody}</p>
                      )}
                    </div>
                  )}

                  {detectedType === 'note' && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-gray-400"><NoteIcon size={16} /></span>
                        <span className="text-gray-400 text-sm">Your note</span>
                      </div>
                      <p className="text-sm">{noteText}</p>
                    </div>
                  )}
                </div>

                <div className="text-text-muted text-xs mb-4">
                  This will be added to the end of the queue
                </div>

                <div className="flex gap-3 pb-2">
                  <button
                    onClick={() => { setAddContentStep('input'); setContentUrl(''); setNoteText(''); setDetectedType(null); setFetchedPreview(null); setFetchError(null); }}
                    onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); setAddContentStep('input'); setContentUrl(''); setNoteText(''); setDetectedType(null); setFetchedPreview(null); setFetchError(null); }}
                    className="btn btn-secondary flex-1 min-h-[52px]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddToQueue}
                    onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); handleAddToQueue(); }}
                    className="btn btn-primary flex-1 min-h-[52px]"
                  >
                    Add to Queue
                  </button>
                </div>
              </>
            )}

            {/* Step: Success */}
            {addContentStep === 'success' && (
              <div className="py-8 flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-teal-500/20 flex items-center justify-center mb-4">
                  <CheckIcon />
                </div>
                <p className="text-text-primary font-semibold">Added to queue!</p>
                <p className="text-text-muted text-sm mt-1">Position #{pendingItems.length + 1}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Queue Item Actions Sheet */}
      {selectedItem && !showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end justify-center z-50">
          <div className="bg-surface-900 w-full max-w-md rounded-t-3xl p-6 bottom-sheet animate-fade-in-up max-h-[85vh] overflow-hidden flex flex-col">
            <div className="w-12 h-1 bg-surface-600 rounded-full mx-auto mb-6 flex-shrink-0"></div>

            {/* Item Info */}
            <div className="flex gap-3 mb-6 flex-shrink-0">
              {(() => {
                const badge = getContentTypeBadge(selectedItem.type)
                const BadgeIcon = badge.icon
                return (
                  <>
                    <div className={`w-20 h-12 rounded-lg overflow-hidden flex-shrink-0 ${badge.bg} flex items-center justify-center`}>
                      {selectedItem.type === 'youtube' && selectedItem.thumbnail ? (
                        <img
                          src={selectedItem.thumbnail}
                          alt={selectedItem.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className={badge.color}>
                          <BadgeIcon size={24} />
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{getQueueItemTitle(selectedItem)}</div>
                      <div className="text-text-muted text-xs">Added by {selectedItem.addedBy}</div>
                    </div>
                  </>
                )
              })()}
            </div>

            {/* Actions */}
            <div className="space-y-2 flex-1 overflow-y-auto min-h-0">
              {/* Note-specific actions */}
              {selectedItem.type === 'note' && (
                <>
                  <button
                    onClick={() => {
                      toggleComplete(selectedItem.id)
                      setSelectedItem(null)
                    }}
                    onTouchEnd={(e) => {
                      e.stopPropagation()
                      e.preventDefault()
                      toggleComplete(selectedItem.id)
                      setSelectedItem(null)
                    }}
                    className="w-full flex items-center gap-4 p-3 rounded-xl bg-green-900/30 hover:bg-surface-800 transition-colors text-left min-h-[64px]"
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${selectedItem.isCompleted ? 'bg-gray-500/20 text-gray-400' : 'bg-green-500/20 text-green-400'}`}>
                      <CheckCircleIcon size={20} filled={selectedItem.isCompleted} />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{selectedItem.isCompleted ? 'Mark Incomplete' : 'Mark Complete'}</div>
                      <div className="text-text-muted text-xs">{selectedItem.isCompleted ? 'Remove completion status' : 'Mark this note as done'}</div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleViewNote(selectedItem)}
                    className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-surface-800 transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-gray-500/20 flex items-center justify-center text-gray-400">
                      <NoteIcon size={20} />
                    </div>
                    <div>
                      <div className="font-medium">View Note</div>
                      <div className="text-text-muted text-xs">Read the full note</div>
                    </div>
                  </button>

                  {selectedItem.addedBySessionId === sessionId && (
                    <button
                      onClick={() => handleOpenEditNote(selectedItem)}
                      className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-surface-800 transition-colors text-left"
                    >
                      <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                        <EditIcon />
                      </div>
                      <div>
                        <div className="font-medium">Edit Note</div>
                        <div className="text-text-muted text-xs">Modify note content</div>
                      </div>
                    </button>
                  )}

                  <div className="h-px bg-surface-700 my-2"></div>
                </>
              )}

              <button
                onClick={() => handleShowNext(selectedItem.id)}
                className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-surface-800 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-full bg-accent-500/20 flex items-center justify-center text-accent-500">
                  <PlayNextIcon />
                </div>
                <div>
                  <div className="font-medium">Show Next</div>
                  <div className="text-text-muted text-xs">Move to top of queue</div>
                </div>
              </button>

              <button
                onClick={() => handleMoveUp(selectedItem.id)}
                className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-surface-800 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-full bg-surface-700 flex items-center justify-center text-text-secondary">
                  <ArrowUpIcon />
                </div>
                <div>
                  <div className="font-medium">Move Up</div>
                  <div className="text-text-muted text-xs">Move one position earlier</div>
                </div>
              </button>

              <button
                onClick={() => handleMoveDown(selectedItem.id)}
                className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-surface-800 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-full bg-surface-700 flex items-center justify-center text-text-secondary">
                  <ArrowDownIcon />
                </div>
                <div>
                  <div className="font-medium">Move Down</div>
                  <div className="text-text-muted text-xs">Move one position later</div>
                </div>
              </button>

              <div className="h-px bg-surface-700 my-2"></div>

              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-red-500/10 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center text-red-400">
                  <TrashIcon />
                </div>
                <div>
                  <div className="font-medium text-red-400">Remove from Queue</div>
                  <div className="text-text-muted text-xs">Delete this item</div>
                </div>
              </button>
            </div>

            <button
              onClick={() => setSelectedItem(null)}
              className="btn btn-secondary w-full mt-4 flex-shrink-0"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && selectedItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="bg-surface-900 w-full max-w-sm rounded-2xl p-6 animate-fade-in-up">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                <TrashIcon />
              </div>
              <h3 className="text-xl font-bold mb-2">Remove item?</h3>
              <p className="text-text-muted text-sm">
                This item will be removed from the queue.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setShowDeleteConfirm(false); setSelectedItem(null); }}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="btn flex-1 bg-red-500 text-white hover:bg-red-600"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Note Modal */}
      {showViewNote && viewingNote && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end justify-center z-50">
          <div className="bg-surface-900 w-full max-w-md rounded-t-3xl p-6 bottom-sheet animate-fade-in-up max-h-[80vh] flex flex-col">
            <div className="w-12 h-1 bg-surface-600 rounded-full mx-auto mb-6"></div>

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-500/20 flex items-center justify-center text-gray-400">
                  <NoteIcon size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Note</h3>
                  <p className="text-text-muted text-xs">Added by {viewingNote.addedBy}</p>
                </div>
              </div>
              <button
                onClick={() => { setShowViewNote(false); setViewingNote(null); }}
                className="text-text-muted"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="flex-1 overflow-auto">
              <div className="bg-surface-800 rounded-xl p-4">
                <p className="text-lg leading-relaxed whitespace-pre-wrap">{viewingNote.noteContent}</p>
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              {viewingNote.addedBySessionId === sessionId && (
                <button
                  onClick={() => {
                    setShowViewNote(false)
                    setViewingNote(null)
                    handleOpenEditNote(viewingNote)
                  }}
                  className="btn btn-secondary flex-1 flex items-center justify-center gap-2"
                >
                  <EditIcon />
                  Edit
                </button>
              )}
              <button
                onClick={() => { setShowViewNote(false); setViewingNote(null); }}
                className="btn btn-primary flex-1"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Note Modal */}
      {showEditNote && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end justify-center z-50">
          <div className="bg-surface-900 w-full max-w-md rounded-t-3xl p-6 bottom-sheet animate-fade-in-up">
            <div className="w-12 h-1 bg-surface-600 rounded-full mx-auto mb-6"></div>

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                  <EditIcon />
                </div>
                <h3 className="text-xl font-bold">Edit Note</h3>
              </div>
              <button onClick={handleCancelEditNote} className="text-text-muted">
                <CloseIcon />
              </button>
            </div>

            <textarea
              placeholder="Write your note..."
              value={editNoteText}
              onChange={(e) => setEditNoteText(e.target.value)}
              className="input min-h-[150px] resize-none mb-4"
              autoFocus
            />

            <p className="text-text-muted text-xs mb-4">
              {editNoteText.length} characters
            </p>

            <div className="flex gap-3">
              <button
                onClick={handleCancelEditNote}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNote}
                disabled={!editNoteText.trim()}
                className="btn btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share toast notification */}
      {showCopied && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-surface-800 text-white px-4 py-2 rounded-full shadow-lg z-50 animate-fade-in">
          Party link copied!
        </div>
      )}
    </div>
  )
}
