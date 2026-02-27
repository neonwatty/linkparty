import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Skeleton } from './Skeleton'

describe('Skeleton', () => {
  it('renders a div with animate-pulse class', () => {
    const { container } = render(<Skeleton />)
    const div = container.firstChild as HTMLElement

    expect(div.tagName).toBe('DIV')
    expect(div.className).toContain('animate-pulse')
  })

  it('includes rounded and bg-white/10 classes', () => {
    const { container } = render(<Skeleton />)
    const div = container.firstChild as HTMLElement

    expect(div.className).toContain('rounded')
    expect(div.className).toContain('bg-white/10')
  })

  it('applies custom className prop', () => {
    const { container } = render(<Skeleton className="h-6 w-40" />)
    const div = container.firstChild as HTMLElement

    expect(div.className).toContain('h-6')
    expect(div.className).toContain('w-40')
    expect(div.className).toContain('animate-pulse')
  })

  it('renders without crashing when no className provided', () => {
    const { container } = render(<Skeleton />)
    expect(container.firstChild).toBeTruthy()
  })
})
