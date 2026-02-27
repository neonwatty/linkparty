import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { QueueListSkeleton } from './QueueListSkeleton'

describe('QueueListSkeleton', () => {
  it('renders default 4 skeleton items', () => {
    const { container } = render(<QueueListSkeleton />)
    const rows = container.querySelectorAll('.flex.items-center.gap-3')

    expect(rows).toHaveLength(4)
  })

  it('renders custom count of skeleton items', () => {
    const { container } = render(<QueueListSkeleton count={2} />)
    const rows = container.querySelectorAll('.flex.items-center.gap-3')

    expect(rows).toHaveLength(2)
  })

  it('each item has expected skeleton elements', () => {
    const { container } = render(<QueueListSkeleton count={1} />)
    const pulseElements = container.querySelectorAll('.animate-pulse')

    // Each row has: 1 thumbnail (h-12 w-12) + 2 text lines (h-4, h-3) + 1 action icon (h-5 w-5) = 4
    expect(pulseElements).toHaveLength(4)
  })

  it('renders zero items when count is 0', () => {
    const { container } = render(<QueueListSkeleton count={0} />)
    const rows = container.querySelectorAll('.flex.items-center.gap-3')

    expect(rows).toHaveLength(0)
  })
})
