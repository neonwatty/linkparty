import { useState, useEffect } from 'react'
import type { Screen } from '../../types'
import { supabase, getSessionId } from '../../lib/supabase'
import { ChevronLeftIcon } from '../icons'

interface PartyHistoryItem {
  id: string
  name: string
  date: string
  members: number
  items: number
}

export function HistoryScreen({ onNavigate }: { onNavigate: (screen: Screen) => void }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [parties, setParties] = useState<PartyHistoryItem[]>([])

  useEffect(() => {
    async function fetchPartyHistory() {
      try {
        setLoading(true)
        setError(null)
        const sessionId = getSessionId()

        // Fetch parties the user has joined
        const { data: memberData, error: memberError } = await supabase
          .from('party_members')
          .select(`
            party_id,
            joined_at,
            parties (id, code, name, created_at)
          `)
          .eq('session_id', sessionId)
          .order('joined_at', { ascending: false })
          .limit(10)

        if (memberError) {
          throw memberError
        }

        if (!memberData || memberData.length === 0) {
          setParties([])
          return
        }

        // Get unique party IDs
        const partyIds = memberData.map(m => m.party_id)

        // Get member counts for each party
        const { data: memberCounts, error: countError } = await supabase
          .from('party_members')
          .select('party_id')
          .in('party_id', partyIds)

        if (countError) {
          throw countError
        }

        // Get item counts for each party
        const { data: itemCounts, error: itemError } = await supabase
          .from('queue_items')
          .select('party_id')
          .in('party_id', partyIds)

        if (itemError) {
          throw itemError
        }

        // Count members per party
        const memberCountMap: Record<string, number> = {}
        memberCounts?.forEach(m => {
          memberCountMap[m.party_id] = (memberCountMap[m.party_id] || 0) + 1
        })

        // Count items per party
        const itemCountMap: Record<string, number> = {}
        itemCounts?.forEach(i => {
          itemCountMap[i.party_id] = (itemCountMap[i.party_id] || 0) + 1
        })

        // Format the data
        const formattedParties: PartyHistoryItem[] = memberData
          .filter(m => m.parties)
          .map(m => {
            const party = m.parties as unknown as { id: string; code: string; name: string | null; created_at: string }
            const createdAt = new Date(party.created_at)
            const dateStr = createdAt.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })
            return {
              id: party.id,
              name: party.name || `Party ${party.code}`,
              date: dateStr,
              members: memberCountMap[party.id] || 1,
              items: itemCountMap[party.id] || 0
            }
          })

        setParties(formattedParties)
      } catch (err) {
        console.error('Error fetching party history:', err)
        setError('Failed to load party history')
      } finally {
        setLoading(false)
      }
    }

    fetchPartyHistory()
  }, [])

  return (
    <div className="container-mobile bg-gradient-party flex flex-col px-6 py-8">
      <button
        onClick={() => onNavigate('home')}
        className="btn-ghost p-2 -ml-2 w-fit rounded-full mb-8"
      >
        <ChevronLeftIcon />
      </button>

      <h1 className="text-3xl font-bold mb-2 animate-fade-in-up opacity-0">
        Party History
      </h1>
      <p className="text-text-secondary mb-8 animate-fade-in-up opacity-0 delay-100">
        Your past watch sessions
      </p>

      {loading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full"></div>
        </div>
      )}

      {error && (
        <div className="card p-4 text-center text-red-400 animate-fade-in-up opacity-0 delay-150">
          {error}
        </div>
      )}

      {!loading && !error && parties.length === 0 && (
        <div className="card p-8 text-center animate-fade-in-up opacity-0 delay-150">
          <div className="text-4xl mb-4">🎉</div>
          <div className="text-text-secondary">No party history yet</div>
          <div className="text-text-muted text-sm mt-2">Join or create a party to get started!</div>
        </div>
      )}

      {!loading && !error && parties.length > 0 && (
        <div className="space-y-3">
          {parties.map((party, index) => (
            <div
              key={party.id}
              className="card p-4 cursor-pointer hover:border-surface-600 transition-colors animate-fade-in-up opacity-0"
              style={{ animationDelay: `${150 + index * 50}ms` }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold">{party.name}</div>
                  <div className="text-text-muted text-sm mt-1">{party.date}</div>
                </div>
                <div className="text-right text-sm">
                  <div className="text-text-secondary">{party.items} items</div>
                  <div className="text-text-muted">{party.members} people</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

