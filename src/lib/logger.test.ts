import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { logger } from './logger'

describe('src/lib/logger', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('debug and info (dev mode)', () => {
    it('debug logs to console.log', () => {
      logger.debug('debug message')
      expect(console.log).toHaveBeenCalledWith('debug message')
    })

    it('info logs to console.log', () => {
      logger.info('info message')
      expect(console.log).toHaveBeenCalledWith('info message')
    })

    it('debug with context formats message', () => {
      logger.debug('msg', { component: 'TestComp' })
      expect(console.log).toHaveBeenCalledWith('[TestComp] msg')
    })

    it('info with context formats message', () => {
      logger.info('msg', { action: 'init' })
      expect(console.log).toHaveBeenCalledWith('(init) msg')
    })
  })

  describe('warn', () => {
    it('logs warning message', () => {
      logger.warn('warning')
      expect(console.warn).toHaveBeenCalledWith('warning')
    })

    it('logs with context', () => {
      logger.warn('msg', { component: 'Auth', action: 'login' })
      expect(console.warn).toHaveBeenCalledWith('[Auth] (login) msg')
    })
  })

  describe('error', () => {
    it('logs plain error message', () => {
      logger.error('something broke')
      expect(console.error).toHaveBeenCalledWith('something broke')
    })

    it('logs with Error object', () => {
      const err = new Error('boom')
      logger.error('failed', err)
      expect(console.error).toHaveBeenCalledWith('failed', err)
    })

    it('logs with non-Error value', () => {
      logger.error('failed', 'string-error')
      expect(console.error).toHaveBeenCalledWith('failed', 'string-error')
    })

    it('logs with context', () => {
      logger.error('msg', undefined, { component: 'API' })
      expect(console.error).toHaveBeenCalledWith('[API] msg')
    })

    it('logs Error with context', () => {
      const err = new Error('timeout')
      logger.error('msg', err, { component: 'Net', action: 'fetch' })
      expect(console.error).toHaveBeenCalledWith('[Net] (fetch) msg', err)
    })
  })

  describe('formatMessage', () => {
    it('returns plain message without context', () => {
      logger.warn('plain message')
      expect(console.warn).toHaveBeenCalledWith('plain message')
    })

    it('formats with component only', () => {
      logger.warn('msg', { component: 'UI' })
      expect(console.warn).toHaveBeenCalledWith('[UI] msg')
    })

    it('formats with action only', () => {
      logger.warn('msg', { action: 'click' })
      expect(console.warn).toHaveBeenCalledWith('(click) msg')
    })

    it('formats with both component and action', () => {
      logger.warn('msg', { component: 'Button', action: 'press' })
      expect(console.warn).toHaveBeenCalledWith('[Button] (press) msg')
    })

    it('handles empty context object', () => {
      logger.warn('msg', {})
      expect(console.warn).toHaveBeenCalledWith('msg')
    })
  })

  describe('createLogger', () => {
    it('creates logger scoped to component', () => {
      const scoped = logger.createLogger('MyComp')
      scoped.warn('test')
      expect(console.warn).toHaveBeenCalledWith('[MyComp] test')
    })

    it('scoped debug logs', () => {
      const scoped = logger.createLogger('Comp')
      scoped.debug('debug msg')
      expect(console.log).toHaveBeenCalledWith('[Comp] debug msg')
    })

    it('scoped info logs', () => {
      const scoped = logger.createLogger('Comp')
      scoped.info('info msg')
      expect(console.log).toHaveBeenCalledWith('[Comp] info msg')
    })

    it('scoped error with Error object', () => {
      const scoped = logger.createLogger('API')
      const err = new Error('fail')
      scoped.error('request failed', err)
      expect(console.error).toHaveBeenCalledWith('[API] request failed', err)
    })

    it('scoped error without Error object', () => {
      const scoped = logger.createLogger('API')
      scoped.error('generic error')
      expect(console.error).toHaveBeenCalledWith('[API] generic error')
    })

    it('scoped logger merges additional context', () => {
      const scoped = logger.createLogger('Auth')
      scoped.warn('login', { action: 'attempt' })
      expect(console.warn).toHaveBeenCalledWith('[Auth] (attempt) login')
    })
  })
})
