import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ErrorToast } from './ErrorToast'

// Mock the AlertIcon component
vi.mock('../icons', () => ({
  AlertIcon: () => <span data-testid="alert-icon">alert</span>,
}))

describe('ErrorToast', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders error message', () => {
    render(
      <ErrorToast
        message="Something went wrong"
        onDismiss={vi.fn()}
      />
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('renders with alert role and assertive aria-live', () => {
    render(
      <ErrorToast
        message="Error message"
        onDismiss={vi.fn()}
      />
    )

    const alertElement = screen.getByRole('alert')
    expect(alertElement).toHaveAttribute('aria-live', 'assertive')
  })

  it('calls onDismiss when dismiss button clicked', () => {
    const onDismiss = vi.fn()

    render(
      <ErrorToast
        message="Error message"
        onDismiss={onDismiss}
      />
    )

    const dismissButton = screen.getByLabelText('Dismiss error')
    fireEvent.click(dismissButton)

    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('shows retry button only when onRetry provided', () => {
    const { rerender } = render(
      <ErrorToast
        message="Error message"
        onDismiss={vi.fn()}
      />
    )

    expect(screen.queryByText('Tap to retry')).not.toBeInTheDocument()

    rerender(
      <ErrorToast
        message="Error message"
        onDismiss={vi.fn()}
        onRetry={vi.fn()}
      />
    )

    expect(screen.getByText('Tap to retry')).toBeInTheDocument()
  })

  it('calls onRetry when retry button clicked', () => {
    const onRetry = vi.fn()

    render(
      <ErrorToast
        message="Error message"
        onDismiss={vi.fn()}
        onRetry={onRetry}
      />
    )

    const retryButton = screen.getByText('Tap to retry')
    fireEvent.click(retryButton)

    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('auto-dismisses after default timeout', () => {
    const onDismiss = vi.fn()

    render(
      <ErrorToast
        message="Error message"
        onDismiss={onDismiss}
      />
    )

    expect(onDismiss).not.toHaveBeenCalled()

    vi.advanceTimersByTime(8000)

    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('auto-dismisses after custom timeout', () => {
    const onDismiss = vi.fn()

    render(
      <ErrorToast
        message="Error message"
        onDismiss={onDismiss}
        autoDismissMs={3000}
      />
    )

    vi.advanceTimersByTime(2999)
    expect(onDismiss).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('does not auto-dismiss when autoDismissMs is 0', () => {
    const onDismiss = vi.fn()

    render(
      <ErrorToast
        message="Error message"
        onDismiss={onDismiss}
        autoDismissMs={0}
      />
    )

    vi.advanceTimersByTime(10000)

    expect(onDismiss).not.toHaveBeenCalled()
  })

  it('clears timeout on unmount', () => {
    const onDismiss = vi.fn()

    const { unmount } = render(
      <ErrorToast
        message="Error message"
        onDismiss={onDismiss}
      />
    )

    unmount()

    vi.advanceTimersByTime(8000)

    expect(onDismiss).not.toHaveBeenCalled()
  })

  it('renders alert icon', () => {
    render(
      <ErrorToast
        message="Error message"
        onDismiss={vi.fn()}
      />
    )

    expect(screen.getByTestId('alert-icon')).toBeInTheDocument()
  })
})
