import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useRef, type RefObject } from 'react'
import { useFocusTrap } from './useFocusTrap'

// --- Helpers -----------------------------------------------------------------

/**
 * Create a container div with a set of focusable elements and mount it to the DOM.
 * Returns the container and a cleanup function.
 */
function createFocusableContainer(): { container: HTMLDivElement; cleanup: () => void } {
  const container = document.createElement('div')
  container.innerHTML = `
    <button id="btn1">First</button>
    <input id="input1" type="text" />
    <a id="link1" href="#">Link</a>
    <button id="btn2">Last</button>
  `
  document.body.appendChild(container)
  return { container, cleanup: () => document.body.removeChild(container) }
}

/**
 * Dispatch a keydown event on the container.
 */
function pressTab(container: HTMLElement, shiftKey = false) {
  const event = new KeyboardEvent('keydown', {
    key: 'Tab',
    shiftKey,
    bubbles: true,
    cancelable: true,
  })
  container.dispatchEvent(event)
  return event
}

/**
 * Wrapper hook that creates a ref and passes it to useFocusTrap,
 * so the containerRef is managed inside the hook lifecycle.
 */
function useFocusTrapWithRef(container: HTMLElement | null, isOpen: boolean) {
  const ref = useRef<HTMLElement | null>(container)
  // eslint-disable-next-line react-hooks/refs -- test helper: sync ref with latest container
  ref.current = container
  useFocusTrap(ref as RefObject<HTMLElement | null>, isOpen)
  return ref
}

// --- Tests -------------------------------------------------------------------

describe('useFocusTrap', () => {
  let container: HTMLDivElement
  let cleanup: () => void

  beforeEach(() => {
    const result = createFocusableContainer()
    container = result.container
    cleanup = result.cleanup
  })

  afterEach(() => {
    cleanup()
  })

  // ---------- Focus first element when opened --------------------------------

  it('focuses first focusable element when isOpen=true', () => {
    renderHook(() => useFocusTrapWithRef(container, true))

    const firstButton = container.querySelector('#btn1') as HTMLElement
    expect(document.activeElement).toBe(firstButton)
  })

  // ---------- Does nothing when closed ---------------------------------------

  it('does nothing when isOpen=false', () => {
    const prevFocused = document.activeElement

    renderHook(() => useFocusTrapWithRef(container, false))

    // Focus should not have moved to the container's elements
    expect(document.activeElement).toBe(prevFocused)
  })

  // ---------- Tab wraps from last to first -----------------------------------

  it('wraps focus from last to first element on Tab', () => {
    renderHook(() => useFocusTrapWithRef(container, true))

    const firstButton = container.querySelector('#btn1') as HTMLElement
    const lastButton = container.querySelector('#btn2') as HTMLElement

    // Move focus to the last element
    lastButton.focus()
    expect(document.activeElement).toBe(lastButton)

    // Press Tab — should wrap to first
    pressTab(container)

    expect(document.activeElement).toBe(firstButton)
  })

  // ---------- Shift+Tab wraps from first to last -----------------------------

  it('wraps focus from first to last element on Shift+Tab', () => {
    renderHook(() => useFocusTrapWithRef(container, true))

    const firstButton = container.querySelector('#btn1') as HTMLElement
    const lastButton = container.querySelector('#btn2') as HTMLElement

    // Focus should already be on first
    expect(document.activeElement).toBe(firstButton)

    // Press Shift+Tab — should wrap to last
    pressTab(container, true)

    expect(document.activeElement).toBe(lastButton)
  })

  // ---------- Restores previous focus on close -------------------------------

  it('restores previous focus when isOpen goes true→false', () => {
    // Create an element outside the trap to hold initial focus
    const outsideButton = document.createElement('button')
    outsideButton.id = 'outside'
    document.body.appendChild(outsideButton)
    outsideButton.focus()
    expect(document.activeElement).toBe(outsideButton)

    const { rerender } = renderHook(({ isOpen }) => useFocusTrapWithRef(container, isOpen), {
      initialProps: { isOpen: true },
    })

    // Focus should have moved to the first focusable element in the container
    const firstButton = container.querySelector('#btn1') as HTMLElement
    expect(document.activeElement).toBe(firstButton)

    // Close the trap
    rerender({ isOpen: false })

    // Focus should return to the outside button
    expect(document.activeElement).toBe(outsideButton)

    document.body.removeChild(outsideButton)
  })

  // ---------- No focusable elements ------------------------------------------

  it('does not throw when container has no focusable elements', () => {
    const emptyContainer = document.createElement('div')
    emptyContainer.innerHTML = '<span>No focusable here</span>'
    document.body.appendChild(emptyContainer)

    expect(() => {
      renderHook(() => useFocusTrapWithRef(emptyContainer, true))
    }).not.toThrow()

    document.body.removeChild(emptyContainer)
  })

  // ---------- Tab with no focusable elements does not throw ------------------

  it('handles Tab keydown gracefully when no focusable elements', () => {
    const emptyContainer = document.createElement('div')
    document.body.appendChild(emptyContainer)

    renderHook(() => useFocusTrapWithRef(emptyContainer, true))

    expect(() => {
      pressTab(emptyContainer)
    }).not.toThrow()

    document.body.removeChild(emptyContainer)
  })

  // ---------- Non-Tab keys are ignored ---------------------------------------

  it('ignores non-Tab key presses', () => {
    renderHook(() => useFocusTrapWithRef(container, true))

    const firstButton = container.querySelector('#btn1') as HTMLElement
    expect(document.activeElement).toBe(firstButton)

    // Press Enter — focus should not change
    const event = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    })
    container.dispatchEvent(event)

    expect(document.activeElement).toBe(firstButton)
  })

  // ---------- Null container ref ---------------------------------------------

  it('does nothing when container ref is null', () => {
    expect(() => {
      renderHook(() => useFocusTrapWithRef(null, true))
    }).not.toThrow()
  })
})
