/**
 * Logging utility with environment awareness and log levels.
 *
 * In production:
 * - debug and info logs are suppressed
 * - warn and error logs are shown
 *
 * In development:
 * - All log levels are shown
 *
 * This logger is designed to be easily extended with external
 * monitoring services (Sentry, LogRocket, etc.) in the future.
 */

interface LogContext {
  component?: string
  action?: string
  userId?: string
  [key: string]: unknown
}

const isDev = process.env.NODE_ENV !== 'production'

/**
 * Format a log message with optional context
 */
function formatMessage(message: string, context?: LogContext): string {
  if (!context) return message

  const contextParts: string[] = []
  if (context.component) contextParts.push(`[${context.component}]`)
  if (context.action) contextParts.push(`(${context.action})`)

  const prefix = contextParts.length > 0 ? `${contextParts.join(' ')} ` : ''
  return `${prefix}${message}`
}

/**
 * Log a debug message (dev only)
 */
function debug(message: string, context?: LogContext): void {
  if (isDev) {
    console.log(formatMessage(message, context))
  }
}

/**
 * Log an info message (dev only)
 */
function info(message: string, context?: LogContext): void {
  if (isDev) {
    console.log(formatMessage(message, context))
  }
}

/**
 * Log a warning message (always shown)
 */
function warn(message: string, context?: LogContext): void {
  console.warn(formatMessage(message, context))
}

/**
 * Log an error message (always shown)
 * Optionally accepts an Error object for stack trace
 */
function error(message: string, err?: unknown, context?: LogContext): void {
  const formattedMessage = formatMessage(message, context)

  if (err instanceof Error) {
    console.error(formattedMessage, err)

    // Future: Send to external monitoring service
    // if (!isDev) {
    //   Sentry.captureException(err, { extra: { message, ...context } })
    // }
  } else if (err !== undefined) {
    console.error(formattedMessage, err)
  } else {
    console.error(formattedMessage)
  }
}

/**
 * Create a logger scoped to a specific component
 */
function createLogger(component: string) {
  return {
    debug: (message: string, context?: Omit<LogContext, 'component'>) => debug(message, { ...context, component }),
    info: (message: string, context?: Omit<LogContext, 'component'>) => info(message, { ...context, component }),
    warn: (message: string, context?: Omit<LogContext, 'component'>) => warn(message, { ...context, component }),
    error: (message: string, err?: unknown, context?: Omit<LogContext, 'component'>) =>
      error(message, err, { ...context, component }),
  }
}

export const logger = {
  debug,
  info,
  warn,
  error,
  createLogger,
}
