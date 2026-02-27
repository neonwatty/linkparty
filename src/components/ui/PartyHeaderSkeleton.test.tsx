import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { PartyHeaderSkeleton } from './PartyHeaderSkeleton'

describe('PartyHeaderSkeleton', () => {
  it('renders title and subtitle skeletons', () => {
    const { container } = render(<PartyHeaderSkeleton />)
    const titleSkeleton = container.querySelector('.h-6.w-40')
    const subtitleSkeleton = container.querySelector('.h-4.w-24')

    expect(titleSkeleton).toBeTruthy()
    expect(subtitleSkeleton).toBeTruthy()
  })

  it('renders 3 circular button skeletons', () => {
    const { container } = render(<PartyHeaderSkeleton />)
    const circularButtons = container.querySelectorAll('.rounded-full')

    expect(circularButtons).toHaveLength(3)
  })

  it('all skeleton elements have animate-pulse class', () => {
    const { container } = render(<PartyHeaderSkeleton />)
    const pulseElements = container.querySelectorAll('.animate-pulse')

    // 2 text skeletons (title + subtitle) + 3 circular buttons = 5
    expect(pulseElements).toHaveLength(5)
  })
})
