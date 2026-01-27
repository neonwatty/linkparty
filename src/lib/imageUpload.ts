import { supabase } from './supabase'
import { logger } from './logger'

const log = logger.createLogger('ImageUpload')

// Allowed image types and max file size
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

// Image optimization settings
const MAX_WIDTH = 1920
const MAX_HEIGHT = 1920
const JPEG_QUALITY = 0.85
const WEBP_QUALITY = 0.85

export interface ImageValidationResult {
  valid: boolean
  error?: string
}

export interface ImageUploadResult {
  url: string
  storagePath: string
  fileName: string
}

export interface OptimizationResult {
  file: File
  originalSize: number
  optimizedSize: number
  wasOptimized: boolean
}

/**
 * Load an image file into an HTMLImageElement
 */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(img.src)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(img.src)
      reject(new Error('Failed to load image'))
    }
    img.src = URL.createObjectURL(file)
  })
}

/**
 * Calculate new dimensions while maintaining aspect ratio
 */
function calculateDimensions(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  if (width <= maxWidth && height <= maxHeight) {
    return { width, height }
  }

  const ratio = Math.min(maxWidth / width, maxHeight / height)
  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio),
  }
}

/**
 * Convert a canvas to a File object
 */
function canvasToFile(
  canvas: HTMLCanvasElement,
  fileName: string,
  mimeType: string,
  quality: number
): Promise<File> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to create blob from canvas'))
          return
        }
        const file = new File([blob], fileName, { type: mimeType })
        resolve(file)
      },
      mimeType,
      quality
    )
  })
}

/**
 * Optimize an image by resizing and compressing it
 * - Resizes images larger than MAX_WIDTH x MAX_HEIGHT
 * - Compresses to JPEG or WebP with quality settings
 * - Skips GIFs to preserve animation
 */
export async function optimizeImage(file: File): Promise<OptimizationResult> {
  const originalSize = file.size

  // Skip GIFs (to preserve animation) and already small files
  if (file.type === 'image/gif') {
    log.debug('Skipping GIF optimization to preserve animation')
    return { file, originalSize, optimizedSize: originalSize, wasOptimized: false }
  }

  // Skip small files that don't need optimization
  if (file.size < 100 * 1024) { // Under 100KB
    log.debug('Skipping optimization for small file')
    return { file, originalSize, optimizedSize: originalSize, wasOptimized: false }
  }

  try {
    const img = await loadImage(file)
    const { width: newWidth, height: newHeight } = calculateDimensions(
      img.width,
      img.height,
      MAX_WIDTH,
      MAX_HEIGHT
    )

    // If no resize needed and file is reasonably small, skip
    const needsResize = newWidth !== img.width || newHeight !== img.height
    const isLargeFile = file.size > 500 * 1024 // Over 500KB

    if (!needsResize && !isLargeFile) {
      log.debug('No optimization needed')
      return { file, originalSize, optimizedSize: originalSize, wasOptimized: false }
    }

    // Create canvas and draw resized image
    const canvas = document.createElement('canvas')
    canvas.width = newWidth
    canvas.height = newHeight
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      throw new Error('Failed to get canvas context')
    }

    // Use high-quality image smoothing
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, 0, 0, newWidth, newHeight)

    // Determine output format and quality
    // Prefer WebP for better compression, fall back to JPEG
    const supportsWebP = canvas.toDataURL('image/webp').startsWith('data:image/webp')
    const outputType = supportsWebP ? 'image/webp' : 'image/jpeg'
    const quality = supportsWebP ? WEBP_QUALITY : JPEG_QUALITY
    const extension = supportsWebP ? 'webp' : 'jpg'

    // Generate new filename
    const baseName = file.name.replace(/\.[^/.]+$/, '')
    const newFileName = `${baseName}.${extension}`

    const optimizedFile = await canvasToFile(canvas, newFileName, outputType, quality)

    // Only use optimized version if it's actually smaller
    if (optimizedFile.size >= file.size) {
      log.debug('Optimized file not smaller, using original')
      return { file, originalSize, optimizedSize: originalSize, wasOptimized: false }
    }

    const savings = ((1 - optimizedFile.size / originalSize) * 100).toFixed(1)
    log.debug(`Image optimized: ${savings}% smaller (${formatBytes(originalSize)} -> ${formatBytes(optimizedFile.size)})`)

    return {
      file: optimizedFile,
      originalSize,
      optimizedSize: optimizedFile.size,
      wasOptimized: true,
    }
  } catch (err) {
    log.error('Image optimization failed, using original', err)
    return { file, originalSize, optimizedSize: originalSize, wasOptimized: false }
  }
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// Validate image file type and size
export function validateImage(file: File): ImageValidationResult {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'Please select a JPG, PNG, GIF, or WebP image',
    }
  }

  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1)
    return {
      valid: false,
      error: `File is too large (${sizeMB}MB). Maximum size is 5MB`,
    }
  }

  return { valid: true }
}

// Upload image to Supabase Storage
export async function uploadImage(
  file: File,
  partyId: string
): Promise<ImageUploadResult> {
  // Generate unique filename
  const timestamp = Date.now()
  const randomId = Math.random().toString(36).substring(2, 8)
  const extension = file.name.split('.').pop() || 'jpg'
  const fileName = `${timestamp}-${randomId}.${extension}`
  const storagePath = `${partyId}/${fileName}`

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from('queue-images')
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    })

  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`)
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('queue-images')
    .getPublicUrl(storagePath)

  return {
    url: urlData.publicUrl,
    storagePath,
    fileName: file.name,
  }
}

// Delete image from Supabase Storage
export async function deleteImage(storagePath: string): Promise<boolean> {
  if (!storagePath) return true

  const { error } = await supabase.storage
    .from('queue-images')
    .remove([storagePath])

  if (error) {
    log.error('Failed to delete image', error)
    return false
  }

  return true
}

// Create object URL for preview (remember to revoke when done)
export function createPreviewUrl(file: File): string {
  return URL.createObjectURL(file)
}

// Revoke object URL to free memory
export function revokePreviewUrl(url: string): void {
  URL.revokeObjectURL(url)
}
