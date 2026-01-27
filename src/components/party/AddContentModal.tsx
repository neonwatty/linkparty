import { useRef, useEffect } from 'react'
import type { ContentType, AddContentStep } from '../../types'
import type { ContentMetadataResponse } from '../../lib/contentMetadata'
import { detectContentType } from '../../utils/contentHelpers'
import {
  CloseIcon,
  LinkIcon,
  YoutubeIcon,
  TwitterIcon,
  RedditIcon,
  NoteIcon,
  ImageIcon,
  LoaderIcon,
  CheckIcon,
  CalendarIcon,
} from '../icons'

interface AddContentModalProps {
  isOpen: boolean
  step: AddContentStep
  contentUrl: string
  noteText: string
  noteDueDate: string
  detectedType: ContentType | null
  fetchedPreview: ContentMetadataResponse['data'] | null
  fetchError: string | null
  imagePreviewUrl: string | null
  imageCaption: string
  imageValidationError: string | null
  selectedImageFile: File | null
  pendingItemsCount: number
  onClose: () => void
  onContentUrlChange: (url: string) => void
  onNoteTextChange: (text: string) => void
  onNoteDueDateChange: (date: string) => void
  onImageCaptionChange: (caption: string) => void
  onUrlSubmit: () => void
  onNoteSubmit: () => void
  onAddToQueue: () => void
  onImageUpload: () => void
  onImageCancel: () => void
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void
  onGoToNoteStep: () => void
  onResetToInput: () => void
}

export function AddContentModal({
  isOpen,
  step,
  contentUrl,
  noteText,
  noteDueDate,
  detectedType,
  fetchedPreview,
  fetchError,
  imagePreviewUrl,
  imageCaption,
  imageValidationError,
  selectedImageFile,
  pendingItemsCount,
  onClose,
  onContentUrlChange,
  onNoteTextChange,
  onNoteDueDateChange,
  onImageCaptionChange,
  onUrlSubmit,
  onNoteSubmit,
  onAddToQueue,
  onImageUpload,
  onImageCancel,
  onFileSelect,
  onGoToNoteStep,
  onResetToInput,
}: AddContentModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end justify-center z-50">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Add content to queue"
        className="bg-surface-900 w-full max-w-md rounded-t-3xl p-6 bottom-sheet animate-fade-in-up"
      >
        <div className="w-12 h-1 bg-surface-600 rounded-full mx-auto mb-6"></div>

        {/* Step: Input - URL or Note */}
        {step === 'input' && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Add to queue</h3>
              <button onClick={onClose} className="text-text-muted" aria-label="Close modal">
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
                onChange={(e) => onContentUrlChange(e.target.value)}
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
              onClick={onUrlSubmit}
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
              onClick={onGoToNoteStep}
              className="btn btn-secondary w-full flex items-center justify-center gap-2 mb-2"
            >
              <NoteIcon size={20} />
              Write a note
            </button>

            {/* Upload an Image Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn btn-secondary w-full flex items-center justify-center gap-2"
            >
              <ImageIcon size={20} />
              Upload an image
            </button>
            <div className="text-xs text-text-muted text-center mt-2">
              JPG, PNG, GIF, WebP up to 5MB
            </div>
            {imageValidationError && (
              <div className="text-xs text-red-400 text-center mt-1">{imageValidationError}</div>
            )}

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={onFileSelect}
              className="hidden"
            />
          </>
        )}

        {/* Step: Write Note */}
        {step === 'note' && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Write a note</h3>
              <button
                onClick={() => { onResetToInput(); onNoteTextChange(''); }}
                className="text-text-muted"
                aria-label="Close note editor"
              >
                <CloseIcon />
              </button>
            </div>

            <textarea
              placeholder="Share a thought, reminder, or message..."
              value={noteText}
              onChange={(e) => onNoteTextChange(e.target.value)}
              className="input min-h-[120px] resize-none"
              autoFocus
              maxLength={1000}
            />
            <div className="flex justify-end mt-1 mb-3">
              <span className={`text-xs ${noteText.length >= 900 ? 'text-yellow-400' : 'text-text-muted'}`}>
                {noteText.length}/1000
              </span>
            </div>

            {/* Optional Due Date */}
            <div className="mb-4">
              <label className="flex items-center gap-2 text-sm text-text-secondary mb-2">
                <CalendarIcon size={16} />
                Due date (optional)
              </label>
              <input
                type="datetime-local"
                value={noteDueDate}
                onChange={(e) => onNoteDueDateChange(e.target.value)}
                className="input"
                min={new Date().toISOString().slice(0, 16)}
              />
              {noteDueDate && (
                <button
                  onClick={() => onNoteDueDateChange('')}
                  className="text-xs text-text-muted hover:text-text-secondary mt-1"
                >
                  Clear due date
                </button>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { onResetToInput(); onNoteTextChange(''); onNoteDueDateChange(''); }}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={onNoteSubmit}
                disabled={!noteText.trim()}
                className="btn btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Preview
              </button>
            </div>
          </>
        )}

        {/* Step: Loading */}
        {step === 'loading' && (
          <div className="py-8 flex flex-col items-center">
            <LoaderIcon />
            <p className="text-text-secondary mt-4">Fetching content details...</p>
          </div>
        )}

        {/* Step: Preview */}
        {step === 'preview' && detectedType && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Add to queue?</h3>
              <button
                onClick={onResetToInput}
                className="text-text-muted"
                aria-label="Close preview"
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

            {/* Preview Card */}
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

              {detectedType === 'image' && imagePreviewUrl && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-purple-400"><ImageIcon size={16} /></span>
                    <span className="text-purple-400 text-sm">Your image</span>
                  </div>
                  <div className="relative rounded-lg overflow-hidden bg-surface-800 max-h-48">
                    <img
                      src={imagePreviewUrl}
                      alt="Preview"
                      className="w-full h-auto max-h-48 object-contain"
                    />
                  </div>
                  {selectedImageFile && (
                    <div className="text-text-muted text-xs mt-1">{selectedImageFile.name}</div>
                  )}
                  <textarea
                    placeholder="Add a caption (optional)..."
                    value={imageCaption}
                    onChange={(e) => onImageCaptionChange(e.target.value)}
                    className="input mt-3 min-h-[60px] resize-none"
                    rows={2}
                    maxLength={200}
                  />
                  {imageCaption.length > 0 && (
                    <div className="flex justify-end mt-1">
                      <span className={`text-xs ${imageCaption.length >= 180 ? 'text-yellow-400' : 'text-text-muted'}`}>
                        {imageCaption.length}/200
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="text-text-muted text-xs mb-4">
              This will be added to the end of the queue
            </div>

            <div className="flex gap-3 pb-2">
              <button
                onClick={() => {
                  if (detectedType === 'image') {
                    onImageCancel()
                  } else {
                    onResetToInput()
                  }
                }}
                onTouchEnd={(e) => {
                  e.stopPropagation()
                  e.preventDefault()
                  if (detectedType === 'image') {
                    onImageCancel()
                  } else {
                    onResetToInput()
                  }
                }}
                className="btn btn-secondary flex-1 min-h-[52px]"
              >
                Cancel
              </button>
              <button
                onClick={detectedType === 'image' ? onImageUpload : onAddToQueue}
                onTouchEnd={(e) => {
                  e.stopPropagation()
                  e.preventDefault()
                  if (detectedType === 'image') {
                    onImageUpload()
                  } else {
                    onAddToQueue()
                  }
                }}
                className="btn btn-primary flex-1 min-h-[52px]"
              >
                Add to Queue
              </button>
            </div>
          </>
        )}

        {/* Step: Success */}
        {step === 'success' && (
          <div className="py-8 flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-teal-500/20 flex items-center justify-center mb-4">
              <CheckIcon />
            </div>
            <p className="text-text-primary font-semibold">Added to queue!</p>
            <p className="text-text-muted text-sm mt-1">Position #{pendingItemsCount + 1}</p>
          </div>
        )}
      </div>
    </div>
  )
}
