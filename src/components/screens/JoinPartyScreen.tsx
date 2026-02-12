import { useState } from 'react'
import type { Screen } from '../../types'
import { supabase, getSessionId, getDisplayName, setDisplayName, getAvatar, setCurrentParty } from '../../lib/supabase'
import { logger } from '../../lib/logger'
import { useAuth } from '../../contexts/AuthContext'
import { ChevronLeftIcon, LoaderIcon } from '../icons'

const log = logger.createLogger('JoinParty')

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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isJoining && code.length === 6 && displayName.trim()) {
      e.preventDefault()
      handleJoin()
    }
  }

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
      log.error('Failed to join party', err)
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
        aria-label="Go back to home"
      >
        <ChevronLeftIcon />
      </button>

      <div className="flex-1 flex flex-col">
        <h1 className="text-3xl font-bold mb-2 animate-fade-in-up">
          Join a party
        </h1>
        <p className="text-text-secondary mb-8 animate-fade-in-up delay-100">
          Enter the code from your host
        </p>

        <div className="space-y-6 animate-fade-in-up delay-200">
          <div>
            <label className="block text-sm text-text-secondary mb-2">
              Your name
            </label>
            <input
              type="text"
              placeholder="Enter your display name"
              value={displayName}
              onChange={(e) => setDisplayNameInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="input"
              disabled={isJoining}
              maxLength={50}
            />
            <div className="flex justify-between mt-1">
              <span className={`text-xs ${displayName.trim().length > 0 && displayName.trim().length < 2 ? 'text-red-400' : 'text-text-muted'}`}>
                {displayName.trim().length > 0 && displayName.trim().length < 2 ? 'Min 2 characters' : ''}
              </span>
              <span className={`text-xs ${displayName.length >= 45 ? 'text-yellow-400' : 'text-text-muted'}`}>
                {displayName.length}/50
              </span>
            </div>
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
              onKeyDown={handleKeyDown}
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

        <div className="mt-auto pt-12 text-center animate-fade-in-up delay-300">
          <p className="text-text-muted text-sm">
            Ask your host for the 6-character code
          </p>
        </div>
      </div>
    </div>
  )
}
