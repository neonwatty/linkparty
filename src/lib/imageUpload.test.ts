import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  validateImage,
  optimizeImage,
  uploadImage,
  deleteImage,
  createPreviewUrl,
  revokePreviewUrl,
} from './imageUpload'

// Mock supabase
const mockUpload = vi.fn()
const mockRemove = vi.fn()
const mockGetPublicUrl = vi.fn()

vi.mock('./supabase', () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        upload: mockUpload,
        remove: mockRemove,
        getPublicUrl: mockGetPublicUrl,
      })),
    },
  },
}))

// Mock logger
vi.mock('./logger', () => ({
  logger: {
    createLogger: () => ({
      debug: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
    }),
  },
}))

// Helper to create a mock File
function createMockFile(
  name: string,
  type: string,
  size: number
): File {
  const content = new Array(size).fill('a').join('')
  return new File([content], name, { type })
}

describe('validateImage', () => {
  describe('file type validation', () => {
    it('should accept JPEG images', () => {
      const file = createMockFile('test.jpg', 'image/jpeg', 1000)
      expect(validateImage(file)).toEqual({ valid: true })
    })

    it('should accept PNG images', () => {
      const file = createMockFile('test.png', 'image/png', 1000)
      expect(validateImage(file)).toEqual({ valid: true })
    })

    it('should accept GIF images', () => {
      const file = createMockFile('test.gif', 'image/gif', 1000)
      expect(validateImage(file)).toEqual({ valid: true })
    })

    it('should accept WebP images', () => {
      const file = createMockFile('test.webp', 'image/webp', 1000)
      expect(validateImage(file)).toEqual({ valid: true })
    })

    it('should reject SVG images', () => {
      const file = createMockFile('test.svg', 'image/svg+xml', 1000)
      const result = validateImage(file)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('JPG, PNG, GIF, or WebP')
    })

    it('should reject PDF files', () => {
      const file = createMockFile('test.pdf', 'application/pdf', 1000)
      const result = validateImage(file)
      expect(result.valid).toBe(false)
    })

    it('should reject text files', () => {
      const file = createMockFile('test.txt', 'text/plain', 1000)
      const result = validateImage(file)
      expect(result.valid).toBe(false)
    })

    it('should reject BMP images', () => {
      const file = createMockFile('test.bmp', 'image/bmp', 1000)
      const result = validateImage(file)
      expect(result.valid).toBe(false)
    })
  })

  describe('file size validation', () => {
    it('should accept files under 5MB', () => {
      const file = createMockFile('test.jpg', 'image/jpeg', 4 * 1024 * 1024)
      expect(validateImage(file)).toEqual({ valid: true })
    })

    it('should accept files exactly at 5MB', () => {
      const file = createMockFile('test.jpg', 'image/jpeg', 5 * 1024 * 1024)
      expect(validateImage(file)).toEqual({ valid: true })
    })

    it('should reject files over 5MB', () => {
      const file = createMockFile('test.jpg', 'image/jpeg', 5 * 1024 * 1024 + 1)
      const result = validateImage(file)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('too large')
      expect(result.error).toContain('5MB')
    })

    it('should show actual file size in error message', () => {
      const file = createMockFile('test.jpg', 'image/jpeg', 6.5 * 1024 * 1024)
      const result = validateImage(file)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('6.5MB')
    })

    it('should accept small files', () => {
      const file = createMockFile('test.jpg', 'image/jpeg', 100)
      expect(validateImage(file)).toEqual({ valid: true })
    })
  })

  describe('combined validation', () => {
    it('should fail on invalid type even if size is ok', () => {
      const file = createMockFile('test.exe', 'application/octet-stream', 1000)
      const result = validateImage(file)
      expect(result.valid).toBe(false)
    })

    it('should fail on oversized file even if type is ok', () => {
      const file = createMockFile('test.png', 'image/png', 10 * 1024 * 1024)
      const result = validateImage(file)
      expect(result.valid).toBe(false)
    })

    // Type validation happens first
    it('should report type error first for invalid type and size', () => {
      const file = createMockFile('test.exe', 'application/octet-stream', 10 * 1024 * 1024)
      const result = validateImage(file)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('JPG, PNG, GIF, or WebP')
    })
  })
})

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks()
  mockUpload.mockResolvedValue({ error: null })
  mockRemove.mockResolvedValue({ error: null })
  mockGetPublicUrl.mockReturnValue({
    data: { publicUrl: 'https://example.com/storage/image.jpg' },
  })
})

describe('optimizeImage', () => {
  it('skips GIF files to preserve animation', async () => {
    const file = createMockFile('anim.gif', 'image/gif', 200 * 1024)
    const result = await optimizeImage(file)
    expect(result.wasOptimized).toBe(false)
    expect(result.file).toBe(file)
    expect(result.originalSize).toBe(file.size)
    expect(result.optimizedSize).toBe(file.size)
  })

  it('skips small files under 100KB', async () => {
    const file = createMockFile('tiny.jpg', 'image/jpeg', 50 * 1024)
    const result = await optimizeImage(file)
    expect(result.wasOptimized).toBe(false)
    expect(result.file).toBe(file)
    expect(result.originalSize).toBe(file.size)
    expect(result.optimizedSize).toBe(file.size)
  })
})

describe('uploadImage', () => {
  it('uploads file and returns URL and path', async () => {
    const file = createMockFile('photo.jpg', 'image/jpeg', 1000)
    const result = await uploadImage(file, 'party-123')

    expect(mockUpload).toHaveBeenCalledOnce()
    expect(mockUpload).toHaveBeenCalledWith(expect.stringContaining('party-123/'), file, {
      contentType: 'image/jpeg',
      upsert: false,
    })
    expect(mockGetPublicUrl).toHaveBeenCalledOnce()
    expect(result.url).toBe('https://example.com/storage/image.jpg')
    expect(result.storagePath).toContain('party-123/')
    expect(result.storagePath).toMatch(/\.jpg$/)
    expect(result.fileName).toBe('photo.jpg')
  })

  it('throws when upload fails', async () => {
    mockUpload.mockResolvedValueOnce({ error: { message: 'Bucket not found' } })
    const file = createMockFile('photo.jpg', 'image/jpeg', 1000)

    await expect(uploadImage(file, 'party-123')).rejects.toThrow('Upload failed: Bucket not found')
  })
})

describe('deleteImage', () => {
  it('returns true when delete succeeds', async () => {
    const result = await deleteImage('party-123/image.jpg')
    expect(result).toBe(true)
    expect(mockRemove).toHaveBeenCalledWith(['party-123/image.jpg'])
  })

  it('returns false when delete fails', async () => {
    mockRemove.mockResolvedValueOnce({ error: { message: 'Not found' } })
    const result = await deleteImage('party-123/image.jpg')
    expect(result).toBe(false)
  })

  it('returns true for empty storagePath', async () => {
    const result = await deleteImage('')
    expect(result).toBe(true)
    expect(mockRemove).not.toHaveBeenCalled()
  })
})

describe('createPreviewUrl', () => {
  it('creates object URL from file', () => {
    const mockObjectUrl = 'blob:http://localhost/fake-uuid'
    const originalCreateObjectURL = globalThis.URL.createObjectURL
    globalThis.URL.createObjectURL = vi.fn(() => mockObjectUrl)

    const file = createMockFile('preview.jpg', 'image/jpeg', 1000)
    const url = createPreviewUrl(file)

    expect(url).toBe(mockObjectUrl)
    expect(globalThis.URL.createObjectURL).toHaveBeenCalledWith(file)

    globalThis.URL.createObjectURL = originalCreateObjectURL
  })
})

describe('revokePreviewUrl', () => {
  it('revokes object URL', () => {
    const originalRevokeObjectURL = globalThis.URL.revokeObjectURL
    globalThis.URL.revokeObjectURL = vi.fn()

    const url = 'blob:http://localhost/fake-uuid'
    revokePreviewUrl(url)

    expect(globalThis.URL.revokeObjectURL).toHaveBeenCalledWith(url)

    globalThis.URL.revokeObjectURL = originalRevokeObjectURL
  })
})
