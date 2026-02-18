import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import {
  validateImage,
  optimizeImage,
  uploadImage,
  deleteImage,
  createPreviewUrl,
  revokePreviewUrl,
} from './imageUpload'

// Polyfill Blob.prototype.arrayBuffer for JSDOM, which lacks it on sliced blobs.
// The production code calls file.slice(0, n).arrayBuffer() for magic-byte verification
// and JSDOM's Blob.slice() returns a Blob without the arrayBuffer method.
beforeAll(() => {
  if (typeof Blob.prototype.arrayBuffer !== 'function') {
    Blob.prototype.arrayBuffer = function (): Promise<ArrayBuffer> {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as ArrayBuffer)
        reader.onerror = () => reject(reader.error)
        reader.readAsArrayBuffer(this)
      })
    }
  }
})

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

// Magic byte headers for valid image files
const JPEG_HEADER = new Uint8Array([0xff, 0xd8, 0xff, 0xe0])
const PNG_HEADER = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const GIF_HEADER = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61])
const WEBP_HEADER = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50])

/** Create a mock file with proper magic bytes for the given type */
function createMockImageFile(name: string, type: string, size: number): File {
  let header: Uint8Array
  switch (type) {
    case 'image/jpeg':
      header = JPEG_HEADER
      break
    case 'image/png':
      header = PNG_HEADER
      break
    case 'image/gif':
      header = GIF_HEADER
      break
    case 'image/webp':
      header = WEBP_HEADER
      break
    default:
      header = new Uint8Array(0)
  }
  // Pad to reach desired size
  const padding = new Uint8Array(Math.max(0, size - header.length))
  const blob = new Blob([header, padding], { type })
  return new File([blob], name, { type })
}

/** Create a mock file without valid magic bytes */
function createMockFile(name: string, type: string, size: number): File {
  const content = new Uint8Array(size)
  return new File([content], name, { type })
}

describe('validateImage', () => {
  describe('file type validation', () => {
    it('should accept JPEG images', async () => {
      const file = createMockImageFile('test.jpg', 'image/jpeg', 1000)
      expect(await validateImage(file)).toEqual({ valid: true })
    })

    it('should accept PNG images', async () => {
      const file = createMockImageFile('test.png', 'image/png', 1000)
      expect(await validateImage(file)).toEqual({ valid: true })
    })

    it('should accept GIF images', async () => {
      const file = createMockImageFile('test.gif', 'image/gif', 1000)
      expect(await validateImage(file)).toEqual({ valid: true })
    })

    it('should accept WebP images', async () => {
      const file = createMockImageFile('test.webp', 'image/webp', 1000)
      expect(await validateImage(file)).toEqual({ valid: true })
    })

    it('should reject SVG images', async () => {
      const file = createMockFile('test.svg', 'image/svg+xml', 1000)
      const result = await validateImage(file)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('JPG, PNG, GIF, or WebP')
    })

    it('should reject PDF files', async () => {
      const file = createMockFile('test.pdf', 'application/pdf', 1000)
      const result = await validateImage(file)
      expect(result.valid).toBe(false)
    })

    it('should reject text files', async () => {
      const file = createMockFile('test.txt', 'text/plain', 1000)
      const result = await validateImage(file)
      expect(result.valid).toBe(false)
    })

    it('should reject BMP images', async () => {
      const file = createMockFile('test.bmp', 'image/bmp', 1000)
      const result = await validateImage(file)
      expect(result.valid).toBe(false)
    })
  })

  describe('file extension validation', () => {
    it('should reject files with disallowed extensions', async () => {
      const file = createMockImageFile('test.exe', 'image/jpeg', 1000)
      // Override the name
      Object.defineProperty(file, 'name', { value: 'test.exe' })
      const result = await validateImage(file)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('extension')
    })

    it('should accept .jpeg extension', async () => {
      const file = createMockImageFile('test.jpeg', 'image/jpeg', 1000)
      expect(await validateImage(file)).toEqual({ valid: true })
    })
  })

  describe('magic byte validation', () => {
    it('should reject file with valid MIME type but wrong magic bytes', async () => {
      // Create a file that claims to be JPEG but has wrong bytes
      const fakeContent = new Uint8Array([0x00, 0x00, 0x00, 0x00])
      const file = new File([fakeContent], 'fake.jpg', { type: 'image/jpeg' })
      const result = await validateImage(file)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('does not match')
    })
  })

  describe('file size validation', () => {
    it('should accept files under 5MB', async () => {
      const file = createMockImageFile('test.jpg', 'image/jpeg', 4 * 1024 * 1024)
      expect(await validateImage(file)).toEqual({ valid: true })
    })

    it('should accept files exactly at 5MB', async () => {
      const file = createMockImageFile('test.jpg', 'image/jpeg', 5 * 1024 * 1024)
      expect(await validateImage(file)).toEqual({ valid: true })
    })

    it('should reject files over 5MB', async () => {
      const file = createMockImageFile('test.jpg', 'image/jpeg', 5 * 1024 * 1024 + 1)
      const result = await validateImage(file)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('too large')
      expect(result.error).toContain('5MB')
    })

    it('should show actual file size in error message', async () => {
      const file = createMockImageFile('test.jpg', 'image/jpeg', 6.5 * 1024 * 1024)
      const result = await validateImage(file)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('6.5MB')
    })

    it('should accept small files', async () => {
      const file = createMockImageFile('test.jpg', 'image/jpeg', 100)
      expect(await validateImage(file)).toEqual({ valid: true })
    })
  })

  describe('combined validation', () => {
    it('should fail on invalid type even if size is ok', async () => {
      const file = createMockFile('test.exe', 'application/octet-stream', 1000)
      const result = await validateImage(file)
      expect(result.valid).toBe(false)
    })

    it('should fail on oversized file even if type is ok', async () => {
      const file = createMockImageFile('test.png', 'image/png', 10 * 1024 * 1024)
      const result = await validateImage(file)
      expect(result.valid).toBe(false)
    })

    // Type validation happens first
    it('should report type error first for invalid type and size', async () => {
      const file = createMockFile('test.exe', 'application/octet-stream', 10 * 1024 * 1024)
      const result = await validateImage(file)
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
    const file = createMockImageFile('anim.gif', 'image/gif', 200 * 1024)
    const result = await optimizeImage(file)
    expect(result.wasOptimized).toBe(false)
    expect(result.file).toBe(file)
    expect(result.originalSize).toBe(file.size)
    expect(result.optimizedSize).toBe(file.size)
  })

  it('skips small files under 100KB', async () => {
    const file = createMockImageFile('tiny.jpg', 'image/jpeg', 50 * 1024)
    const result = await optimizeImage(file)
    expect(result.wasOptimized).toBe(false)
    expect(result.file).toBe(file)
    expect(result.originalSize).toBe(file.size)
    expect(result.optimizedSize).toBe(file.size)
  })
})

describe('uploadImage', () => {
  it('uploads file and returns URL and path', async () => {
    const file = createMockImageFile('photo.jpg', 'image/jpeg', 1000)
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
    const file = createMockImageFile('photo.jpg', 'image/jpeg', 1000)

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

    const file = createMockImageFile('preview.jpg', 'image/jpeg', 1000)
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
