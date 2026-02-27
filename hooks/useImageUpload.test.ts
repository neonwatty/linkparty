import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// --- Mock dependencies -------------------------------------------------------

const mockValidateImage = vi.fn()
const mockOptimizeImage = vi.fn()
const mockUploadImage = vi.fn()
const mockTryAction = vi.fn()

vi.mock('@/lib/imageUpload', () => ({
  validateImage: (...args: unknown[]) => mockValidateImage(...args),
  optimizeImage: (...args: unknown[]) => mockOptimizeImage(...args),
  uploadImage: (...args: unknown[]) => mockUploadImage(...args),
}))

vi.mock('@/lib/rateLimit', () => ({
  tryAction: (...args: unknown[]) => mockTryAction(...args),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    createLogger: () => ({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}))

// --- Helpers -----------------------------------------------------------------

function createFakeFile(name = 'photo.jpg', size = 1024): File {
  const buffer = new ArrayBuffer(size)
  return new File([buffer], name, { type: 'image/jpeg' })
}

const PARTY_ID = 'party-abc'

// --- Tests -------------------------------------------------------------------

describe('useImageUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()

    // Defaults: everything succeeds
    mockTryAction.mockReturnValue(null)
    mockValidateImage.mockResolvedValue({ valid: true })
    mockOptimizeImage.mockImplementation((file: File) =>
      Promise.resolve({
        file,
        originalSize: file.size,
        optimizedSize: file.size,
        wasOptimized: false,
      }),
    )
    mockUploadImage.mockResolvedValue({
      url: 'https://storage.example.com/photo.jpg',
      storagePath: 'party-abc/photo.jpg',
      fileName: 'photo.jpg',
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ---------- Initial state --------------------------------------------------

  describe('initial state', () => {
    it('returns not uploading, no error, no file', async () => {
      vi.resetModules()
      const { useImageUpload } = await import('./useImageUpload')
      const { result } = renderHook(() => useImageUpload())

      expect(result.current.isUploading).toBe(false)
      expect(result.current.isOptimizing).toBe(false)
      expect(result.current.uploadProgress).toBe(0)
      expect(result.current.error).toBeNull()
      expect(result.current.selectedFile).toBeNull()
    })
  })

  // ---------- startUpload — happy path ---------------------------------------

  describe('startUpload — success', () => {
    it('transitions through optimizing → uploading → calls onSuccess', async () => {
      vi.resetModules()
      const { useImageUpload } = await import('./useImageUpload')

      const onSuccess = vi.fn()
      const file = createFakeFile()

      const { result } = renderHook(() => useImageUpload({ onSuccess }))

      await act(async () => {
        const uploadPromise = result.current.startUpload(file, PARTY_ID, 'Nice photo')
        // Advance past the progress interval ticks
        await vi.advanceTimersByTimeAsync(2000)
        await uploadPromise
      })

      expect(mockTryAction).toHaveBeenCalledWith('imageUpload')
      expect(mockValidateImage).toHaveBeenCalledWith(file)
      expect(mockOptimizeImage).toHaveBeenCalledWith(file)
      expect(mockUploadImage).toHaveBeenCalledWith(file, PARTY_ID)
      expect(onSuccess).toHaveBeenCalledWith(
        { url: 'https://storage.example.com/photo.jpg', storagePath: 'party-abc/photo.jpg', fileName: 'photo.jpg' },
        'Nice photo',
      )
      // After success, progress reaches 100
      expect(result.current.uploadProgress).toBe(100)

      // After the 300ms cleanup timeout, uploading resets
      await act(async () => {
        await vi.advanceTimersByTimeAsync(300)
      })

      expect(result.current.isUploading).toBe(false)
      expect(result.current.selectedFile).toBeNull()
    })
  })

  // ---------- startUpload — invalid file -------------------------------------

  describe('startUpload — validation failure', () => {
    it('sets error from validation and does not upload', async () => {
      mockValidateImage.mockResolvedValue({ valid: false, error: 'File too large' })

      vi.resetModules()
      const { useImageUpload } = await import('./useImageUpload')

      const onError = vi.fn()
      const { result } = renderHook(() => useImageUpload({ onError }))

      await act(async () => {
        await result.current.startUpload(createFakeFile(), PARTY_ID)
      })

      expect(result.current.error).toBe('File too large')
      expect(onError).toHaveBeenCalledWith('File too large')
      expect(mockOptimizeImage).not.toHaveBeenCalled()
      expect(mockUploadImage).not.toHaveBeenCalled()
    })

    it('uses fallback error when validation error is undefined', async () => {
      mockValidateImage.mockResolvedValue({ valid: false })

      vi.resetModules()
      const { useImageUpload } = await import('./useImageUpload')

      const { result } = renderHook(() => useImageUpload())

      await act(async () => {
        await result.current.startUpload(createFakeFile(), PARTY_ID)
      })

      expect(result.current.error).toBe('Invalid file')
    })
  })

  // ---------- startUpload — rate limited -------------------------------------

  describe('startUpload — rate limited', () => {
    it('sets error from tryAction and does not proceed', async () => {
      mockTryAction.mockReturnValue('Too many images uploaded. Please wait 30 seconds before uploading more.')

      vi.resetModules()
      const { useImageUpload } = await import('./useImageUpload')

      const onError = vi.fn()
      const { result } = renderHook(() => useImageUpload({ onError }))

      await act(async () => {
        await result.current.startUpload(createFakeFile(), PARTY_ID)
      })

      expect(result.current.error).toBe('Too many images uploaded. Please wait 30 seconds before uploading more.')
      expect(onError).toHaveBeenCalled()
      expect(mockValidateImage).not.toHaveBeenCalled()
    })
  })

  // ---------- startUpload — upload failure -----------------------------------

  describe('startUpload — upload failure', () => {
    it('sets error when uploadImage throws', async () => {
      mockUploadImage.mockRejectedValue(new Error('Network error'))

      vi.resetModules()
      const { useImageUpload } = await import('./useImageUpload')

      const onError = vi.fn()
      const { result } = renderHook(() => useImageUpload({ onError }))

      // Await the upload directly — the mock rejects immediately so no timers needed
      await act(async () => {
        await result.current.startUpload(createFakeFile(), PARTY_ID)
      })

      expect(result.current.error).toBe('Network error')
      expect(result.current.isUploading).toBe(false)
      expect(result.current.isOptimizing).toBe(false)
      expect(onError).toHaveBeenCalledWith('Network error')
    })

    it('uses fallback error message for non-Error throws', async () => {
      mockUploadImage.mockRejectedValue('something unexpected')

      vi.resetModules()
      const { useImageUpload } = await import('./useImageUpload')

      const { result } = renderHook(() => useImageUpload())

      await act(async () => {
        await result.current.startUpload(createFakeFile(), PARTY_ID)
      })

      expect(result.current.error).toBe('Upload failed')
    })
  })

  // ---------- retry ----------------------------------------------------------

  describe('retry', () => {
    it('re-attempts the last upload after a failure', async () => {
      // First attempt fails
      mockUploadImage.mockRejectedValueOnce(new Error('Timeout'))

      vi.resetModules()
      const { useImageUpload } = await import('./useImageUpload')

      const onSuccess = vi.fn()
      const file = createFakeFile()
      const { result } = renderHook(() => useImageUpload({ onSuccess }))

      // First call fails (mock rejects immediately, no timers needed)
      await act(async () => {
        await result.current.startUpload(file, PARTY_ID, 'caption')
      })

      expect(result.current.error).toBe('Timeout')

      // Now make upload succeed for retry
      mockUploadImage.mockResolvedValue({
        url: 'https://storage.example.com/photo.jpg',
        storagePath: 'party-abc/photo.jpg',
        fileName: 'photo.jpg',
      })

      // retry() calls startUpload internally (fire-and-forget), so we trigger it
      // and advance timers to let the progress interval and async work complete
      await act(async () => {
        result.current.retry()
        // Flush microtasks for the async startUpload to proceed through validate/optimize/upload
        await vi.advanceTimersByTimeAsync(0)
        // Advance timers for the progress interval and the 300ms cleanup setTimeout
        await vi.advanceTimersByTimeAsync(2000)
      })

      expect(onSuccess).toHaveBeenCalled()
      expect(result.current.error).toBeNull()
    })

    it('does nothing when there is no previous upload', async () => {
      vi.resetModules()
      const { useImageUpload } = await import('./useImageUpload')

      const { result } = renderHook(() => useImageUpload())

      await act(async () => {
        result.current.retry()
      })

      // Nothing should have been called
      expect(mockValidateImage).not.toHaveBeenCalled()
      expect(mockUploadImage).not.toHaveBeenCalled()
    })
  })

  // ---------- cancel ---------------------------------------------------------

  describe('cancel', () => {
    it('resets all state', async () => {
      vi.resetModules()
      const { useImageUpload } = await import('./useImageUpload')

      const { result } = renderHook(() => useImageUpload())

      // Start an upload that will pend
      mockUploadImage.mockImplementation(() => new Promise(() => {})) // never resolves

      act(() => {
        result.current.startUpload(createFakeFile(), PARTY_ID)
      })

      // Allow validation and optimization to complete, then cancel
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100)
      })

      act(() => {
        result.current.cancel()
      })

      expect(result.current.isUploading).toBe(false)
      expect(result.current.isOptimizing).toBe(false)
      expect(result.current.uploadProgress).toBe(0)
      expect(result.current.error).toBeNull()
      expect(result.current.selectedFile).toBeNull()
    })
  })

  // ---------- clearError -----------------------------------------------------

  describe('clearError', () => {
    it('clears the error', async () => {
      mockValidateImage.mockResolvedValue({ valid: false, error: 'Bad image' })

      vi.resetModules()
      const { useImageUpload } = await import('./useImageUpload')

      const { result } = renderHook(() => useImageUpload())

      await act(async () => {
        await result.current.startUpload(createFakeFile(), PARTY_ID)
      })

      expect(result.current.error).toBe('Bad image')

      act(() => {
        result.current.clearError()
      })

      expect(result.current.error).toBeNull()
    })
  })

  // ---------- Progress increases during upload --------------------------------

  describe('upload progress', () => {
    it('increases via progress interval during upload', async () => {
      // Make the upload take a while so we can observe progress ticks
      let resolveUpload: (value: unknown) => void
      mockUploadImage.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveUpload = resolve
          }),
      )

      vi.resetModules()
      const { useImageUpload } = await import('./useImageUpload')

      const { result } = renderHook(() => useImageUpload())

      act(() => {
        result.current.startUpload(createFakeFile(), PARTY_ID)
      })

      // Let validation and optimization resolve
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0)
      })

      // After optimization completes, the upload starts with progress interval
      // Each tick is 200ms adding 10%
      await act(async () => {
        await vi.advanceTimersByTimeAsync(200)
      })

      expect(result.current.uploadProgress).toBeGreaterThanOrEqual(10)

      await act(async () => {
        await vi.advanceTimersByTimeAsync(400)
      })

      expect(result.current.uploadProgress).toBeGreaterThanOrEqual(20)

      // Resolve the upload
      await act(async () => {
        resolveUpload!({
          url: 'https://storage.example.com/photo.jpg',
          storagePath: 'party-abc/photo.jpg',
          fileName: 'photo.jpg',
        })
        await vi.advanceTimersByTimeAsync(0)
      })

      expect(result.current.uploadProgress).toBe(100)
    })
  })
})
