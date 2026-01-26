import { useState } from 'react'
import type { Screen } from '../../types'
import { supabase, getSessionId, getDisplayName, setDisplayName, getAvatar, setCurrentParty } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { ChevronLeftIcon, LoaderIcon } from '../icons'

interface JoinPartyScreenProps {
  onNavigate: (screen: Screen) => void
  onPartyJoined: (partyId: string, partyCode: string) => void
  initialCode?: string
}

export function JoinPartyScreen({ onNavigate, onPartyJoined, initialCode = '' }: JoinPartyScreenProps) {
  const { user } = useAuth()
  const [code, setCode] = useState(initialCode)
  const [displayName, setDisplayNameInput] = useState(getDisplayName() || '')
  const [isJoining, setIsJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleJoin = async () => {
    if (!displayName.trim()) {
      setError('Please enter a display name')
      return
    }

    if (code.length !== 6) {
      setError('Please enter a 6-character party code')
      return
    }

    setIsJoining(true)
    setError(null)

    try {
      const sessionId = getSessionId()
      const avatar = getAvatar()

      // Look up party by code
      const { data: party, error: partyError } = await supabase
        .from('parties')
        .select('*')
        .eq('code', code.toUpperCase())
        .single()

      if (partyError) {
        if (partyError.code === 'PGRST116') {
          setError('Party not found. Check the code and try again.')
        } else {
          throw partyError
        }
        return
      }

      // Upsert member (in case they've joined before)
      const memberData: Record<string, unknown> = {
        party_id: party.id,
        session_id: sessionId,
        display_name: displayName.trim(),
        avatar,
        is_host: false,
      }
      // Only include user_id if user is logged in
      if (user?.id) {
        memberData.user_id = user.id
      }
      const { error: memberError } = await supabase
        .from('party_members')
        .upsert(memberData, {
          onConflict: 'party_id,session_id',
        })

      if (memberError) throw memberError

      // Save display name for future use
      setDisplayName(displayName.trim())
      setCurrentParty(party.id, party.code)

      onPartyJoined(party.id, party.code)
    } catch (err) {
      console.error('Error joining party:', err)
      setError('Failed to join party. Please try again.')
    } finally {
      setIsJoining(false)
    }
  }

  return (
    <div className="container-mobile bg-gradient-party flex flex-col px-6 py-8">
      <button
        onClick={() => onNavigate('home')}
        className="btn-ghost p-2 -ml-2 w-fit rounded-full mb-8"
        disabled={isJoining}
      >
        <ChevronLeftIcon />
      </button>

      <div className="flex-1 flex flex-col">
        <h1 className="text-3xl font-bold mb-2 animate-fade-in-up opacity-0">
          Join a party
        </h1>
        <p className="text-text-secondary mb-8 animate-fade-in-up opacity-0 delay-100">
          Enter the code from your host
        </p>

        <div className="space-y-6 animate-fade-in-up opacity-0 delay-200">
          <div>
            <label className="block text-sm text-text-secondary mb-2">
              Your name
            </label>
            <input
              type="text"
              placeholder="Enter your display name"
              value={displayName}
              onChange={(e) => setDisplayNameInput(e.target.value)}
              className="input"
              disabled={isJoining}
            />
          </div>

          <div>
            <label className="block text-sm text-text-secondary mb-2">
              Party code
            </label>
            <input
              type="text"
              placeholder="ABC123"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={6}
              className="input text-center text-2xl font-mono tracking-[0.3em] uppercase"
              disabled={isJoining}
            />
          </div>

          {error && (
            <div className="text-red-400 text-sm text-center">{error}</div>
          )}

          <button
            onClick={handleJoin}
            className="btn btn-primary w-full text-lg disabled:opacity-50"
            disabled={code.length !== 6 || !displayName.trim() || isJoining}
          >
            {isJoining ? (
              <span className="flex items-center justify-center gap-2">
                <LoaderIcon />
                Joining...
              </span>
            ) : (
              'Join Party'
            )}
          </button>
        </div>

        <div className="mt-auto pt-12 text-center animate-fade-in-up opacity-0 delay-300">
          <p className="text-text-muted text-sm">
            Ask your host for the 6-character code
          </p>
        </div>
      </div>
    </div>
  )
}
