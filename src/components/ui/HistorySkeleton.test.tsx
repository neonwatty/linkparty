import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { HistorySkeleton } from './HistorySkeleton'

describe('HistorySkeleton', () => {
  it('renders default 4 card skeletons', () => {
    const { container } = render(<HistorySkeleton />)
    const cards = container.querySelectorAll('.rounded-2xl')

    expect(cards).toHaveLength(4)
  })

  it('renders custom count of card skeletons', () => {
    const { container } = render(<HistorySkeleton count={2} />)
    const cards = container.querySelectorAll('.rounded-2xl')

    expect(cards).toHaveLength(2)
  })

  it('each card has title and metadata skeletons', () => {
    const { container } = render(<HistorySkeleton count={1} />)
    const titleSkeleton = container.querySelector('.h-5.w-2\\/3')
    const metadataSkeletons = container.querySelectorAll('.h-3')

    expect(titleSkeleton).toBeTruthy()
    // 2 metadata items per card (w-20 and w-16)
    expect(metadataSkeletons).toHaveLength(2)
  })

  it('renders zero cards when count is 0', () => {
    const { container } = render(<HistorySkeleton count={0} />)
    const cards = container.querySelectorAll('.rounded-2xl')

    expect(cards).toHaveLength(0)
  })
})
