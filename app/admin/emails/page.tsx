'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { ChevronLeftIcon } from '@/components/icons'

interface EmailEvent {
  id: string
  event_type: string
  email_id: string
  recipient: string
  subject: string | null
  metadata: Record<string, unknown>
  created_at: string
}

interface EmailStats {
  total: number
  sent: number
  delivered: number
  bounced: number
  opened: number
  clicked: number
  deliveryRate: number
  openRate: number
}

const EVENT_TYPE_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  'email.sent': { label: 'Sent', color: 'bg-blue-500/20 text-blue-400', icon: '📤' },
  'email.delivered': { label: 'Delivered', color: 'bg-green-500/20 text-green-400', icon: '✅' },
  'email.bounced': { label: 'Bounced', color: 'bg-red-500/20 text-red-400', icon: '❌' },
  'email.opened': { label: 'Opened', color: 'bg-purple-500/20 text-purple-400', icon: '👀' },
  'email.clicked': { label: 'Clicked', color: 'bg-yellow-500/20 text-yellow-400', icon: '🔗' },
  'email.complained': { label: 'Spam', color: 'bg-orange-500/20 text-orange-400', icon: '⚠️' },
  'email.delivery_delayed': { label: 'Delayed', color: 'bg-gray-500/20 text-gray-400', icon: '⏳' },
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function StatCard({ label, value, subtext, color }: {
  label: string
  value: string | number
  subtext?: string
  color?: string
}) {
  return (
    <div className="card p-4">
      <div className="text-text-muted text-sm mb-1">{label}</div>
      <div className={`text-2xl font-bold ${color || ''}`}>{value}</div>
      {subtext && <div className="text-text-muted text-xs mt-1">{subtext}</div>}
    </div>
  )
}

export default function EmailEventsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [events, setEvents] = useState<EmailEvent[]>([])
  const [stats, setStats] = useState<EmailStats | null>(null)
  const [total, setTotal] = useState(0)
  const [filter, setFilter] = useState<string>('')
  const [search, setSearch] = useState<string>('')
  const [page, setPage] = useState(0)
  const limit = 20

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: (page * limit).toString(),
      })

      if (filter) {
        params.set('type', filter)
      }
      if (search) {
        params.set('recipient', search)
      }

      const response = await fetch(`/api/emails/events?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch events')
      }

      setEvents(data.events)
      setStats(data.stats)
      setTotal(data.total)
    } catch (err) {
      console.error('Failed to fetch email events:', err)
      setError(err instanceof Error ? err.message : 'Failed to load email events')
    } finally {
      setLoading(false)
    }
  }, [filter, search, page])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="container-mobile bg-gradient-party flex flex-col px-6 py-8 min-h-screen">
      <Link
        href="/"
        className="btn-ghost p-2 -ml-2 w-fit rounded-full mb-8"
        aria-label="Go back to home"
      >
        <ChevronLeftIcon />
      </Link>

      <h1 className="text-3xl font-bold mb-2 animate-fade-in-up opacity-0">
        Email Events
      </h1>
      <p className="text-text-secondary mb-8 animate-fade-in-up opacity-0 delay-100">
        Monitor email delivery and engagement
      </p>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 mb-6 animate-fade-in-up opacity-0 delay-150">
          <StatCard
            label="Delivery Rate"
            value={`${stats.deliveryRate}%`}
            subtext={`${stats.delivered} of ${stats.sent} delivered`}
            color={stats.deliveryRate >= 95 ? 'text-green-400' : stats.deliveryRate >= 80 ? 'text-yellow-400' : 'text-red-400'}
          />
          <StatCard
            label="Open Rate"
            value={`${stats.openRate}%`}
            subtext={`${stats.opened} opens`}
            color={stats.openRate >= 30 ? 'text-green-400' : stats.openRate >= 15 ? 'text-yellow-400' : 'text-text-secondary'}
          />
          <StatCard
            label="Total Sent"
            value={stats.sent}
          />
          <StatCard
            label="Bounced"
            value={stats.bounced}
            color={stats.bounced > 0 ? 'text-red-400' : ''}
          />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6 animate-fade-in-up opacity-0 delay-200">
        <input
          type="text"
          placeholder="Search by email..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(0)
          }}
          className="input flex-1"
        />
        <select
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value)
            setPage(0)
          }}
          className="input w-full sm:w-auto"
        >
          <option value="">All Events</option>
          <option value="email.sent">Sent</option>
          <option value="email.delivered">Delivered</option>
          <option value="email.bounced">Bounced</option>
          <option value="email.opened">Opened</option>
          <option value="email.clicked">Clicked</option>
        </select>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full"></div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="card p-4 text-center text-red-400 animate-fade-in-up opacity-0 delay-250">
          {error}
          <button
            onClick={fetchEvents}
            className="block mx-auto mt-2 text-sm text-primary hover:underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && events.length === 0 && (
        <div className="card p-8 text-center animate-fade-in-up opacity-0 delay-250">
          <div className="text-4xl mb-4">📧</div>
          <div className="text-text-secondary">No email events found</div>
          <div className="text-text-muted text-sm mt-2">
            {filter || search ? 'Try adjusting your filters' : 'Events will appear here when emails are sent'}
          </div>
        </div>
      )}

      {/* Events List */}
      {!loading && !error && events.length > 0 && (
        <>
          <div className="space-y-2">
            {events.map((event, index) => {
              const typeInfo = EVENT_TYPE_LABELS[event.event_type] || {
                label: event.event_type,
                color: 'bg-gray-500/20 text-gray-400',
                icon: '📩',
              }

              return (
                <div
                  key={event.id}
                  className="card p-4 animate-fade-in-up opacity-0"
                  style={{ animationDelay: `${250 + index * 30}ms` }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeInfo.color}`}>
                          {typeInfo.icon} {typeInfo.label}
                        </span>
                      </div>
                      <div className="text-sm truncate" title={event.recipient}>
                        {event.recipient}
                      </div>
                      {event.subject && (
                        <div className="text-text-muted text-xs truncate mt-1" title={event.subject}>
                          {event.subject}
                        </div>
                      )}
                    </div>
                    <div className="text-text-muted text-xs whitespace-nowrap">
                      {formatDate(event.created_at)}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-6">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="btn-ghost px-4 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-text-muted text-sm">
                Page {page + 1} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="btn-ghost px-4 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Refresh Button */}
      <button
        onClick={fetchEvents}
        disabled={loading}
        className="btn-ghost mx-auto mt-8 px-6 py-2 rounded-full text-sm disabled:opacity-50"
      >
        {loading ? 'Refreshing...' : 'Refresh'}
      </button>
    </div>
  )
}
