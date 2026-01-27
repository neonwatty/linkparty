import { describe, it, expect } from 'vitest'
import { validateImage } from './imageUpload'

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
