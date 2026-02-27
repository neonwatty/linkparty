/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HistoryScreen } from './HistoryScreen'

// Hoisted mock for controlling Supabase responses per test
const { mockFromFn } = vi.hoisted(() => {
  const mockFromFn = vi.fn()
  return { mockFromFn }
})

vi.mock('../../lib/supabase', () => ({
  supabase: { from: (...args: unknown[]) => mockFromFn(...args) },
  getSessionId: vi.fn(() => 'test-session-123'),
}))

vi.mock('../../lib/logger', () => ({
  logger: {
    createLogger: () => ({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}))

vi.mock('../icons', () => ({
  ChevronLeftIcon: () => <span data-testid="chevron-left-icon" />,
}))

vi.mock('../ui/HistorySkeleton', () => ({
  HistorySkeleton: () => <div data-testid="history-skeleton">Loading skeleton</div>,
}))

// Helper: build a fake party_members row with joined parties
function makeMemberRow(partyId: string, joinedAt: string, partyName: string | null = null) {
  return {
    party_id: partyId,
    joined_at: joinedAt,
    parties: {
      id: partyId,
      code: partyId.slice(0, 6).toUpperCase(),
      name: partyName,
      created_at: joinedAt,
    },
  }
}

// Creates a thenable query builder object that resolves to `result`
// and also supports chaining `.lt()` (which returns the same thenable).
// This mimics Supabase's PostgREST builder: every method returns the builder,
// and awaiting it resolves the query.
function makeThenableQuery(result: { data: unknown; error: unknown }) {
  const obj = {
    then: (resolve: (v: unknown) => void, reject?: (e: unknown) => void) => Promise.resolve(result).then(resolve, reject),
    lt: vi.fn(() => obj),
  }
  return obj
}

// Helper: configure mockFromFn to handle the three query types HistoryScreen uses.
// callIndex tracks sequential .from() calls within a single fetchHistory invocation.
function setupSupabaseMock(opts: {
  memberData?: ReturnType<typeof makeMemberRow>[]
  memberError?: { message: string } | null
  memberCountData?: { party_id: string }[]
  memberCountError?: { message: string } | null
  itemCountData?: { party_id: string }[]
  itemCountError?: { message: string } | null
}) {
  const {
    memberData = [],
    memberError = null,
    memberCountData = [],
    memberCountError = null,
    itemCountData = [],
    itemCountError = null,
  } = opts

  let callIndex = 0

  mockFromFn.mockImplementation((table: string) => {
    if (table === 'party_members' && callIndex === 0) {
      // First call: main query with select/eq/order/limit (and optional lt for cursor)
      callIndex++
      const queryResult = makeThenableQuery({ data: memberData, error: memberError })
      const limitFn = vi.fn(() => queryResult)
      const orderFn = vi.fn(() => ({ limit: limitFn }))
      const eqFn = vi.fn(() => ({ order: orderFn }))
      const selectFn = vi.fn(() => ({ eq: eqFn }))
      return { select: selectFn }
    }
    if (table === 'party_members' && callIndex === 1) {
      // Second call: member count query
      callIndex++
      const inFn = vi.fn(() => Promise.resolve({ data: memberCountData, error: memberCountError }))
      const selectFn = vi.fn(() => ({ in: inFn }))
      return { select: selectFn }
    }
    if (table === 'queue_items') {
      // Third call: item count query
      callIndex++
      const inFn = vi.fn(() => Promise.resolve({ data: itemCountData, error: itemCountError }))
      const selectFn = vi.fn(() => ({ in: inFn }))
      return { select: selectFn }
    }
    // Fallback
    return {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({ limit: vi.fn(() => Promise.resolve({ data: [], error: null })) })),
        })),
        in: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
    }
  })
}

const twoParties = [
  makeMemberRow('party-1', '2026-01-15T10:00:00Z', 'Movie Night'),
  makeMemberRow('party-2', '2026-01-10T08:00:00Z', null),
]

describe('HistoryScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // 1. Shows HistorySkeleton while loading
  it('shows HistorySkeleton while loading', () => {
    // Make the query never resolve so loading state persists
    const neverResolve = {
      then: () => new Promise(() => {}),
      lt: vi.fn(() => neverResolve),
    }
    mockFromFn.mockImplementation(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => neverResolve),
          })),
        })),
      })),
    }))

    render(<HistoryScreen onNavigate={vi.fn()} />)
    expect(screen.getByTestId('history-skeleton')).toBeInTheDocument()
  })

  // 2. Shows error card on fetch failure
  it('shows error card on fetch failure', async () => {
    setupSupabaseMock({
      memberError: { message: 'Database error' },
    })

    render(<HistoryScreen onNavigate={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Failed to load party history')).toBeInTheDocument()
    })
  })

  // 3. Shows empty state when no parties
  it('shows empty state when no parties', async () => {
    setupSupabaseMock({ memberData: [] })

    render(<HistoryScreen onNavigate={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('No party history yet')).toBeInTheDocument()
    })
    expect(screen.getByText('Join or create a party to get started!')).toBeInTheDocument()
  })

  // 4. Renders party cards with party details
  it('renders party cards with party details', async () => {
    setupSupabaseMock({
      memberData: twoParties,
      memberCountData: [{ party_id: 'party-1' }, { party_id: 'party-1' }, { party_id: 'party-2' }],
      itemCountData: [{ party_id: 'party-1' }, { party_id: 'party-1' }, { party_id: 'party-1' }],
    })

    render(<HistoryScreen onNavigate={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Movie Night')).toBeInTheDocument()
    })
    // party-2 has no name, should show "Party PARTY-"
    expect(screen.getByText(/Party PARTY-/)).toBeInTheDocument()
    // Check counts rendered
    expect(screen.getByText('3 items')).toBeInTheDocument()
    expect(screen.getByText('2 people')).toBeInTheDocument()
  })

  // 5. "Load more" button appears when hasMore is true
  it('"Load more" button appears when hasMore is true', async () => {
    // Return PAGE_SIZE + 1 (11 items) to trigger hasMore=true
    const elevenRows = Array.from({ length: 11 }, (_, i) =>
      makeMemberRow(`party-${i}`, `2026-01-${String(20 - i).padStart(2, '0')}T10:00:00Z`, `Party ${i}`),
    )

    setupSupabaseMock({
      memberData: elevenRows,
      memberCountData: elevenRows.map((r) => ({ party_id: r.party_id })),
      itemCountData: [],
    })

    render(<HistoryScreen onNavigate={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Load more')).toBeInTheDocument()
    })
  })

  // 6. Clicking "Load more" appends new items
  it('clicking "Load more" appends new items', async () => {
    // First page: 11 items (triggers hasMore)
    const firstPage = Array.from({ length: 11 }, (_, i) =>
      makeMemberRow(`party-${i}`, `2026-01-${String(20 - i).padStart(2, '0')}T10:00:00Z`, `Party ${i}`),
    )

    setupSupabaseMock({
      memberData: firstPage,
      memberCountData: firstPage.map((r) => ({ party_id: r.party_id })),
      itemCountData: [],
    })

    render(<HistoryScreen onNavigate={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Load more')).toBeInTheDocument()
    })

    // Now set up the second page (fewer than 11 → no more)
    const secondPage = [makeMemberRow('party-new', '2026-01-01T10:00:00Z', 'New Party')]

    setupSupabaseMock({
      memberData: secondPage,
      memberCountData: [{ party_id: 'party-new' }],
      itemCountData: [],
    })

    const user = userEvent.setup()
    await user.click(screen.getByText('Load more'))

    await waitFor(() => {
      expect(screen.getByText('New Party')).toBeInTheDocument()
    })
    // Original items still present
    expect(screen.getByText('Party 0')).toBeInTheDocument()
  })

  // 7. "Load more" shows loading state while fetching
  it('"Load more" shows loading state while fetching', async () => {
    // First page: 11 items
    const firstPage = Array.from({ length: 11 }, (_, i) =>
      makeMemberRow(`party-${i}`, `2026-01-${String(20 - i).padStart(2, '0')}T10:00:00Z`, `Party ${i}`),
    )

    setupSupabaseMock({
      memberData: firstPage,
      memberCountData: firstPage.map((r) => ({ party_id: r.party_id })),
      itemCountData: [],
    })

    render(<HistoryScreen onNavigate={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Load more')).toBeInTheDocument()
    })

    // Make the next fetch hang so we can see the loading state
    const neverResolve = {
      then: () => new Promise(() => {}),
      lt: vi.fn(() => neverResolve),
    }
    mockFromFn.mockImplementation(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => neverResolve),
          })),
        })),
      })),
    }))

    const user = userEvent.setup()
    await user.click(screen.getByText('Load more'))

    await waitFor(() => {
      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })
  })

  // 8. "Load more" disappears when no more pages
  it('"Load more" disappears when no more pages', async () => {
    // Return exactly 2 items (< PAGE_SIZE+1) → hasMore=false
    setupSupabaseMock({
      memberData: twoParties,
      memberCountData: [{ party_id: 'party-1' }, { party_id: 'party-2' }],
      itemCountData: [],
    })

    render(<HistoryScreen onNavigate={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Movie Night')).toBeInTheDocument()
    })
    expect(screen.queryByText('Load more')).not.toBeInTheDocument()
  })

  // 9. Back button calls onNavigate('home')
  it('back button calls onNavigate("home")', async () => {
    setupSupabaseMock({ memberData: [] })

    const onNavigate = vi.fn()
    render(<HistoryScreen onNavigate={onNavigate} />)

    const user = userEvent.setup()
    await user.click(screen.getByLabelText('Go back to home'))

    expect(onNavigate).toHaveBeenCalledWith('home')
  })
})
