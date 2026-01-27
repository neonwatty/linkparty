import { useState, useCallback, useRef } from 'react'
import { validateImage, uploadImage, optimizeImage, type ImageUploadResult } from '../lib/imageUpload'
import { logger } from '../lib/logger'
import { tryAction } from '../lib/rateLimit'

const log = logger.createLogger('useImageUpload')

export interface UseImageUploadOptions {
  onSuccess?: (result: ImageUploadResult, caption?: string) => void
  onError?: (error: string) => void
}

export interface UseImageUploadReturn {
  isUploading: boolean
  isOptimizing: boolean
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
  const [isOptimizing, setIsOptimizing] = useState(false)
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
      // Check rate limit for image uploads
      const rateLimitError = tryAction('imageUpload')
      if (rateLimitError) {
        setError(rateLimitError)
        onError?.(rateLimitError)
        return
      }

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
      setError(null)

      try {
        // Step 1: Optimize the image
        setIsOptimizing(true)
        log.debug('Starting image optimization', { originalSize: file.size })

        const optimizationResult = await optimizeImage(file)
        const fileToUpload = optimizationResult.file

        if (optimizationResult.wasOptimized) {
          const savings = ((1 - optimizationResult.optimizedSize / optimizationResult.originalSize) * 100).toFixed(1)
          log.info(`Image optimized: ${savings}% smaller`, {
            originalSize: optimizationResult.originalSize,
            optimizedSize: optimizationResult.optimizedSize,
          })
        }

        setIsOptimizing(false)

        // Step 2: Upload the optimized image
        setIsUploading(true)
        setUploadProgress(0)

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

        const result = await uploadImage(fileToUpload, partyId)

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
        setIsOptimizing(false)
        setIsUploading(false)
        setUploadProgress(0)
        const errorMessage = err instanceof Error ? err.message : 'Upload failed'
        setError(errorMessage)
        onError?.(errorMessage)
        log.error('Image upload failed', err)
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
    setIsOptimizing(false)
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
    isOptimizing,
    uploadProgress,
    error,
    selectedFile,
    startUpload,
    retry,
    cancel,
    clearError,
  }
}
