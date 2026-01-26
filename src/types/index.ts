// Screen types for navigation
export type Screen = 'home' | 'login' | 'signup' | 'create' | 'join' | 'party' | 'tv' | 'history' | 'reset-password'

// Content types supported by the queue
export type ContentType = 'youtube' | 'tweet' | 'reddit' | 'note' | 'image'

// Add content modal step states
export type AddContentStep = 'input' | 'loading' | 'preview' | 'success' | 'note' | 'image'
