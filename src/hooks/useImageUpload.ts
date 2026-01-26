import { useState, useCallback, useRef } from 'react'
import { validateImage, uploadImage, type ImageUploadResult } from '../lib/imageUpload'

export interface UseImageUploadOptions {
  onSuccess?: (result: ImageUploadResult, caption?: string) => void
  onError?: (error: string) => void
}

export interface UseImageUploadReturn {
  isUploading: boolean
  uploadProgress: number
  error: string | null
  selectedFile: File | null
  startUpload: (file: File, partyId: string, caption?: string) => Promise<void>
  retry: () => void
  cancel: () => void
  clearError: () => void
}

export function useImageUpload(options: UseImageUploadOptions = {}): UseImageUploadReturn {
  const { onSuccess, onError } = options

  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  // Store last upload params for retry
  const lastUploadRef = useRef<{
    file: File
    partyId: string
    caption?: string
  } | null>(null)

  const startUpload = useCallback(
    async (file: File, partyId: string, caption?: string) => {
      // Validate the file first
      const validation = validateImage(file)
      if (!validation.valid) {
        setError(validation.error || 'Invalid file')
        onError?.(validation.error || 'Invalid file')
        return
      }

      // Store params for potential retry
      lastUploadRef.current = { file, partyId, caption }
      setSelectedFile(file)
      setIsUploading(true)
      setUploadProgress(0)
      setError(null)

      try {
        // Simulate progress since Supabase doesn't provide upload progress
        const progressInterval = setInterval(() => {
          setUploadProgress((prev) => {
            if (prev >= 90) {
              clearInterval(progressInterval)
              return prev
            }
            return prev + 10
          })
        }, 200)

        const result = await uploadImage(file, partyId)

        clearInterval(progressInterval)
        setUploadProgress(100)

        // Small delay to show 100% before completing
        setTimeout(async () => {
          setIsUploading(false)
          setSelectedFile(null)
          lastUploadRef.current = null
          await onSuccess?.(result, caption)
        }, 300)
      } catch (err) {
        setIsUploading(false)
        setUploadProgress(0)
        const errorMessage = err instanceof Error ? err.message : 'Upload failed'
        setError(errorMessage)
        onError?.(errorMessage)
      }
    },
    [onSuccess, onError]
  )

  const retry = useCallback(() => {
    if (lastUploadRef.current) {
      const { file, partyId, caption } = lastUploadRef.current
      startUpload(file, partyId, caption)
    }
  }, [startUpload])

  const cancel = useCallback(() => {
    setIsUploading(false)
    setUploadProgress(0)
    setError(null)
    setSelectedFile(null)
    lastUploadRef.current = null
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    isUploading,
    uploadProgress,
    error,
    selectedFile,
    startUpload,
    retry,
    cancel,
    clearError,
  }
}
