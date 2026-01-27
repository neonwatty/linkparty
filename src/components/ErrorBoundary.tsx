import { Component, type ReactNode } from 'react'
import { logger } from '../lib/logger'

const log = logger.createLogger('ErrorBoundary')

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    log.error('Caught an error', error, { action: 'componentDidCatch' })
    log.error('Component stack', errorInfo.componentStack)

    // Call optional error handler
    this.props.onError?.(error, errorInfo)
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null })
  }

  handleGoHome = (): void => {
    // Clear any saved party state that might be causing issues
    localStorage.removeItem('party-queue-current-party')
    this.setState({ hasError: false, error: null })
    window.location.href = '/'
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return (
        <div className="container-mobile bg-gradient-party flex flex-col items-center justify-center p-6">
          <div className="card-base text-center max-w-sm">
            <div className="text-6xl mb-4">😵</div>
            <h1 className="text-2xl font-bold text-text-primary mb-2">
              Oops! Something went wrong
            </h1>
            <p className="text-text-muted mb-6">
              The app encountered an unexpected error. Don't worry, you can try again.
            </p>

            <div className="space-y-3">
              <button
                onClick={this.handleReset}
                className="btn-primary w-full"
              >
                Try Again
              </button>
              <button
                onClick={this.handleGoHome}
                className="btn-secondary w-full"
              >
                Go to Home
              </button>
            </div>

            {/* Show error details in development */}
            {import.meta.env.DEV && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="text-text-muted text-sm cursor-pointer hover:text-text-secondary">
                  Error details (dev only)
                </summary>
                <pre className="mt-2 p-3 bg-surface-secondary rounded-lg text-xs text-red-400 overflow-auto max-h-40">
                  {this.state.error.message}
                  {'\n\n'}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
