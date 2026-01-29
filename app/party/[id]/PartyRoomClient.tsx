'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import type { ContentType, AddContentStep } from '@/types'
import { getSessionId, getDisplayName, clearCurrentParty, getCurrentParty } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { useParty } from '@/hooks/useParty'
import type { QueueItem } from '@/hooks/useParty'
import { fetchContentMetadata, type ContentMetadataResponse } from '@/lib/contentMetadata'
import { detectContentType } from '@/utils/contentHelpers'
import { useImageUpload } from '@/hooks/useImageUpload'
import { validateImage, createPreviewUrl, revokePreviewUrl, deleteImage } from '@/lib/imageUpload'
import { UploadToast } from '@/components/ui/UploadToast'
import { ImageLightbox } from '@/components/ui/ImageLightbox'
import { ConflictToast } from '@/components/ui/ConflictToast'
import { PlusIcon, LoaderIcon } from '@/components/icons'
import {
  PartyHeader,
  MembersList,
  NowShowingSection,
  QueueList,
  QueueItemActionsSheet,
  AddContentModal,
  DeleteConfirmDialog,
  NoteViewModal,
  NoteEditModal,
} from '@/components/party'

const log = logger.createLogger('PartyRoom')

export default function PartyRoomClient() {
  const router = useRouter()
  const params = useParams()
  const partyId = params.id as string
  const partyCode = getCurrentParty()?.partyCode || ''

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
    lastConflict,
    clearConflict,
    pendingItems: memoizedPendingItems,
    showingItem,
  } = useParty(partyId)

  // Modal/sheet visibility states
  const [showAddContent, setShowAddContent] = useState(false)
  const [selectedItem, setSelectedItem] = useState<QueueItem | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showEditNote, setShowEditNote] = useState(false)
  const [showViewNote, setShowViewNote] = useState(false)
  const [viewingNote, setViewingNote] = useState<QueueItem | null>(null)

  // Add content form states
  const [addContentStep, setAddContentStep] = useState<AddContentStep>('input')
  const [contentUrl, setContentUrl] = useState('')
  const [noteText, setNoteText] = useState('')
  const [noteDueDate, setNoteDueDate] = useState<string>('')
  const [detectedType, setDetectedType] = useState<ContentType | null>(null)
  const [fetchedPreview, setFetchedPreview] = useState<ContentMetadataResponse['data'] | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Note editing state
  const [editNoteText, setEditNoteText] = useState('')
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)

  // Image upload state
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const [imageCaption, setImageCaption] = useState('')
  const [imageValidationError, setImageValidationError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // UI feedback states
  const [showCopied, setShowCopied] = useState(false)
  const [lightboxImage, setLightboxImage] = useState<{ url: string; caption?: string } | null>(null)
  const [showUploadToast, setShowUploadToast] = useState(false)

  const sessionId = getSessionId()
  const currentUserDisplayName = getDisplayName() || 'You'
  const isHost = partyInfo?.hostSessionId === sessionId

  // Use memoized values from useParty hook
  const currentItem = showingItem
  const pendingItems = memoizedPendingItems

  // Refs to prevent stale closures
  const addToQueueRef = useRef(addToQueue)
  useEffect(() => {
    addToQueueRef.current = addToQueue
  }, [addToQueue])

  const queueLengthRef = useRef(queue.length)
  useEffect(() => {
    queueLengthRef.current = queue.length
  }, [queue.length])

  // Image upload hook
  const imageUpload = useImageUpload({
    onSuccess: async (result, caption) => {
      const itemToAdd = {
        type: 'image' as const,
        status: (queueLengthRef.current === 0 ? 'showing' : 'pending') as 'pending' | 'showing',
        addedBy: currentUserDisplayName,
        isCompleted: false,
        imageName: result.fileName,
        imageUrl: result.url,
        imageStoragePath: result.storagePath,
        imageCaption: caption,
      }
      try {
        await addToQueueRef.current(itemToAdd)
      } catch (err) {
        log.error('Failed to add image to queue', err)
      }
    },
    onError: (error) => {
      log.error('Image upload failed', error)
    },
  })

  // File selection handler
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validation = validateImage(file)
    if (!validation.valid) {
      setImageValidationError(validation.error || 'Invalid file')
      return
    }

    if (imagePreviewUrl) {
      revokePreviewUrl(imagePreviewUrl)
    }

    setSelectedImageFile(file)
    setImagePreviewUrl(createPreviewUrl(file))
    setImageValidationError(null)
    setAddContentStep('preview')
    setDetectedType('image')

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Image upload submission
  const handleImageUpload = () => {
    if (!selectedImageFile) return

    setShowAddContent(false)
    setAddContentStep('input')
    setShowUploadToast(true)

    imageUpload.startUpload(selectedImageFile, partyId, imageCaption || undefined)

    if (imagePreviewUrl) {
      revokePreviewUrl(imagePreviewUrl)
    }

    setSelectedImageFile(null)
    setImagePreviewUrl(null)
    setImageCaption('')
    setDetectedType(null)
  }

  // Image upload cancel
  const handleImageCancel = () => {
    if (imagePreviewUrl) {
      revokePreviewUrl(imagePreviewUrl)
    }
    setSelectedImageFile(null)
    setImagePreviewUrl(null)
    setImageCaption('')
    setImageValidationError(null)
    setAddContentStep('input')
    setDetectedType(null)
  }

  // Delete with image cleanup
  const handleDeleteWithCleanup = async () => {
    if (selectedItem) {
      try {
        if (selectedItem.type === 'image' && selectedItem.imageStoragePath) {
          await deleteImage(selectedItem.imageStoragePath)
        }
        await deleteItem(selectedItem.id)
        setShowDeleteConfirm(false)
        setSelectedItem(null)
      } catch (err) {
        log.error('Failed to delete item', err)
      }
    }
  }

  // URL submission - fetch metadata
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
        setFetchedPreview(null)
        setAddContentStep('preview')
      }
    } catch (err) {
      log.error('Metadata fetch failed', err)
      setFetchError(err instanceof Error ? err.message : 'Failed to fetch content')
      setFetchedPreview(null)
      setAddContentStep('preview')
    }
  }

  // Add to queue
  const handleAddToQueue = () => {
    if (!detectedType) return

    setAddContentStep('success')

    const doAddToQueue = async () => {
      try {
        let queueItemData: Partial<QueueItem>

        if (detectedType === 'note') {
          queueItemData = { noteContent: noteText, dueDate: noteDueDate || undefined }
        } else if (fetchedPreview) {
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
        log.error('Failed to add to queue', err)
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

  // Note submit
  const handleNoteSubmit = () => {
    if (noteText.trim()) {
      setDetectedType('note')
      setAddContentStep('preview')
    }
  }

  // Reset add content modal
  const handleResetToInput = () => {
    setAddContentStep('input')
    setContentUrl('')
    setNoteText('')
    setNoteDueDate('')
    setDetectedType(null)
    setFetchedPreview(null)
    setFetchError(null)
  }

  // Note editing handlers
  const handleOpenEditNote = useCallback((item: QueueItem) => {
    if (item.type === 'note') {
      setEditNoteText(item.noteContent || '')
      setEditingNoteId(item.id)
      setShowEditNote(true)
      setSelectedItem(null)
    }
  }, [])

  const handleSaveNote = useCallback(async () => {
    if (editingNoteId && editNoteText.trim()) {
      try {
        await updateNoteContent(editingNoteId, editNoteText.trim())
        setShowEditNote(false)
        setEditNoteText('')
        setEditingNoteId(null)
      } catch (err) {
        log.error('Failed to update note', err)
      }
    }
  }, [editingNoteId, editNoteText, updateNoteContent])

  const handleCancelEditNote = useCallback(() => {
    setShowEditNote(false)
    setEditNoteText('')
    setEditingNoteId(null)
  }, [])

  // Note viewing handlers
  const handleViewNote = useCallback((item: QueueItem) => {
    if (item.type === 'note') {
      setViewingNote(item)
      setShowViewNote(true)
      setSelectedItem(null)
    }
  }, [])

  // Queue item actions
  const handleMoveUp = useCallback(async (itemId: string) => {
    await moveItem(itemId, 'up')
    setSelectedItem(null)
  }, [moveItem])

  const handleMoveDown = useCallback(async (itemId: string) => {
    await moveItem(itemId, 'down')
    setSelectedItem(null)
  }, [moveItem])

  // Handle drag-and-drop reorder
  const handleReorder = useCallback(async (activeId: string, overId: string) => {
    const oldIndex = pendingItems.findIndex(item => item.id === activeId)
    const newIndex = pendingItems.findIndex(item => item.id === overId)

    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return

    const direction = newIndex > oldIndex ? 'down' : 'up'
    const steps = Math.abs(newIndex - oldIndex)

    await moveItem(activeId, direction, steps)
  }, [pendingItems, moveItem])

  const handleShowNext = useCallback(async (itemId: string) => {
    await showNext(itemId)
    setSelectedItem(null)
  }, [showNext])

  // Party actions
  const handleLeave = useCallback(() => {
    clearCurrentParty()
    router.push('/')
  }, [router])

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setShowCopied(true)
      setTimeout(() => setShowCopied(false), 2000)
    } catch (err) {
      log.error('Failed to copy to clipboard', err)
    }
  }, [])

  const handleShare = useCallback(async () => {
    const shareUrl = `${window.location.origin}/join/${partyCode}`

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${partyInfo?.name || 'Party'}`,
          text: `Join my Link Party with code ${partyCode}`,
          url: shareUrl,
        })
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          await copyToClipboard(shareUrl)
        }
      }
    } else {
      await copyToClipboard(shareUrl)
    }
  }, [partyCode, partyInfo, copyToClipboard])

  // Modal handlers
  const handleOpenAddContent = useCallback(() => {
    setShowAddContent(true)
  }, [])

  const handleCloseAddContent = useCallback(() => {
    setShowAddContent(false)
  }, [])

  const handleCloseSelectedItem = useCallback(() => {
    setSelectedItem(null)
  }, [])

  const handleOpenDeleteConfirm = useCallback(() => {
    setShowDeleteConfirm(true)
  }, [])

  const handleCancelDelete = useCallback(() => {
    setShowDeleteConfirm(false)
    setSelectedItem(null)
  }, [])

  const handleCloseViewNote = useCallback(() => {
    setShowViewNote(false)
    setViewingNote(null)
  }, [])

  const handleEditFromView = useCallback(() => {
    setShowViewNote(false)
    if (viewingNote) handleOpenEditNote(viewingNote)
    setViewingNote(null)
  }, [viewingNote, handleOpenEditNote])

  const handleCloseLightbox = useCallback(() => {
    setLightboxImage(null)
  }, [])

  const handleImageClick = useCallback((url: string, caption?: string) => {
    setLightboxImage({ url, caption })
  }, [])

  const handleDismissUploadToast = useCallback(() => {
    setShowUploadToast(false)
    imageUpload.clearError()
  }, [imageUpload])

  const handleTvMode = useCallback(() => {
    router.push(`/party/${partyId}/tv`)
  }, [router, partyId])

  const handleGoToNoteStep = useCallback(() => {
    setAddContentStep('note')
  }, [])

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
      <PartyHeader
        partyName={partyInfo?.name || 'Party'}
        partyCode={partyCode}
        onLeave={handleLeave}
        onTvMode={handleTvMode}
        onShare={handleShare}
      />

      {currentItem && (
        <NowShowingSection
          currentItem={currentItem}
          isHost={isHost}
          onNext={advanceQueue}
          onImageClick={handleImageClick}
        />
      )}

      <MembersList
        members={members}
        currentSessionId={sessionId}
      />

      <QueueList
        items={pendingItems}
        currentSessionId={sessionId}
        onItemClick={setSelectedItem}
        onToggleComplete={toggleComplete}
        onReorder={handleReorder}
      />

      {/* Add Content FAB */}
      <button
        onClick={handleOpenAddContent}
        className="fab bg-accent-500 hover:bg-accent-400 transition-all hover:scale-105 animate-pulse-glow"
      >
        <PlusIcon />
      </button>

      {/* Add Content Modal */}
      <AddContentModal
        isOpen={showAddContent}
        step={addContentStep}
        contentUrl={contentUrl}
        noteText={noteText}
        noteDueDate={noteDueDate}
        detectedType={detectedType}
        fetchedPreview={fetchedPreview}
        fetchError={fetchError}
        imagePreviewUrl={imagePreviewUrl}
        imageCaption={imageCaption}
        imageValidationError={imageValidationError}
        selectedImageFile={selectedImageFile}
        pendingItemsCount={pendingItems.length}
        onClose={handleCloseAddContent}
        onContentUrlChange={setContentUrl}
        onNoteTextChange={setNoteText}
        onNoteDueDateChange={setNoteDueDate}
        onImageCaptionChange={setImageCaption}
        onUrlSubmit={handleUrlSubmit}
        onNoteSubmit={handleNoteSubmit}
        onAddToQueue={handleAddToQueue}
        onImageUpload={handleImageUpload}
        onImageCancel={handleImageCancel}
        onFileSelect={handleFileSelect}
        onGoToNoteStep={handleGoToNoteStep}
        onResetToInput={handleResetToInput}
      />

      {/* Queue Item Actions Sheet */}
      {selectedItem && !showDeleteConfirm && (
        <QueueItemActionsSheet
          item={selectedItem}
          isOwnItem={selectedItem.addedBySessionId === sessionId}
          onClose={handleCloseSelectedItem}
          onShowNext={handleShowNext}
          onMoveUp={handleMoveUp}
          onMoveDown={handleMoveDown}
          onDelete={handleOpenDeleteConfirm}
          onToggleComplete={toggleComplete}
          onViewNote={handleViewNote}
          onEditNote={handleOpenEditNote}
        />
      )}

      {/* Delete Confirmation */}
      <DeleteConfirmDialog
        isOpen={showDeleteConfirm && !!selectedItem}
        onConfirm={handleDeleteWithCleanup}
        onCancel={handleCancelDelete}
      />

      {/* View Note Modal */}
      <NoteViewModal
        isOpen={showViewNote}
        note={viewingNote}
        isOwnNote={viewingNote?.addedBySessionId === sessionId}
        onClose={handleCloseViewNote}
        onEdit={handleEditFromView}
      />

      {/* Edit Note Modal */}
      <NoteEditModal
        isOpen={showEditNote}
        noteText={editNoteText}
        onNoteTextChange={setEditNoteText}
        onSave={handleSaveNote}
        onCancel={handleCancelEditNote}
      />

      {/* Conflict Toast */}
      <ConflictToast conflicts={lastConflict} onDismiss={clearConflict} />

      {/* Share toast notification */}
      {showCopied && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-surface-800 text-white px-4 py-2 rounded-full shadow-lg z-50 animate-fade-in">
          Party link copied!
        </div>
      )}

      {/* Upload Toast */}
      <UploadToast
        isVisible={showUploadToast || imageUpload.isOptimizing || imageUpload.isUploading || !!imageUpload.error}
        isOptimizing={imageUpload.isOptimizing}
        isUploading={imageUpload.isUploading}
        progress={imageUpload.uploadProgress}
        error={imageUpload.error}
        onRetry={imageUpload.retry}
        onDismiss={handleDismissUploadToast}
      />

      {/* Image Lightbox */}
      {lightboxImage && (
        <ImageLightbox
          imageUrl={lightboxImage.url}
          caption={lightboxImage.caption}
          isOpen={!!lightboxImage}
          onClose={handleCloseLightbox}
        />
      )}
    </div>
  )
}
