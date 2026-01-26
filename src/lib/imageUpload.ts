import { supabase } from './supabase'

// Allowed image types and max file size
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

export interface ImageValidationResult {
  valid: boolean
  error?: string
}

export interface ImageUploadResult {
  url: string
  storagePath: string
  fileName: string
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
    console.error('Failed to delete image:', error)
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
