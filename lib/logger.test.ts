import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { logger } from './logger'

describe('logger', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('debug and info (non-production)', () => {
    // In test environment, NODE_ENV is 'test' which is not 'production',
    // so isDev is true and debug/info will log.

    it('debug logs to console.log', () => {
      logger.debug('test debug')
      expect(console.log).toHaveBeenCalledWith('test debug')
    })

    it('info logs to console.log', () => {
      logger.info('test info')
      expect(console.log).toHaveBeenCalledWith('test info')
    })
  })

  describe('warn and error (always shown)', () => {
    it('warn logs with formatted message', () => {
      logger.warn('test warning')
      expect(console.warn).toHaveBeenCalledWith('test warning')
    })

    it('error logs plain message', () => {
      logger.error('test error')
      expect(console.error).toHaveBeenCalledWith('test error')
    })

    it('error logs with Error object', () => {
      const err = new Error('boom')
      logger.error('something failed', err)
      expect(console.error).toHaveBeenCalledWith('something failed', err)
    })

    it('error logs with non-Error value', () => {
      logger.error('something failed', 'string-error')
      expect(console.error).toHaveBeenCalledWith('something failed', 'string-error')
    })
  })

  describe('formatMessage with context', () => {
    it('formats with component context', () => {
      logger.warn('msg', { component: 'TestComp' })
      expect(console.warn).toHaveBeenCalledWith('[TestComp] msg')
    })

    it('formats with component and action', () => {
      logger.warn('msg', { component: 'Comp', action: 'init' })
      expect(console.warn).toHaveBeenCalledWith('[Comp] (init) msg')
    })

    it('formats with action only', () => {
      logger.warn('msg', { action: 'click' })
      expect(console.warn).toHaveBeenCalledWith('(click) msg')
    })
  })

  describe('createLogger', () => {
    it('creates scoped logger with component prefix', () => {
      const scoped = logger.createLogger('MyComponent')
      scoped.warn('scoped warning')
      expect(console.warn).toHaveBeenCalledWith('[MyComponent] scoped warning')
    })

    it('scoped logger passes additional context', () => {
      const scoped = logger.createLogger('Auth')
      scoped.warn('login failed', { action: 'login' })
      expect(console.warn).toHaveBeenCalledWith('[Auth] (login) login failed')
    })

    it('scoped logger error with Error object', () => {
      const scoped = logger.createLogger('API')
      const err = new Error('timeout')
      scoped.error('request failed', err)
      expect(console.error).toHaveBeenCalledWith('[API] request failed', err)
    })
  })
})
