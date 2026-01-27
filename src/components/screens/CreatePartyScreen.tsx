import { useState } from 'react'
import type { Screen } from '../../types'
import { supabase, generatePartyCode, getSessionId, getDisplayName, setDisplayName, getAvatar, setCurrentParty } from '../../lib/supabase'
import { logger } from '../../lib/logger'
import { tryAction } from '../../lib/rateLimit'
import { useAuth } from '../../contexts/AuthContext'
import { ChevronLeftIcon, LoaderIcon } from '../icons'

const log = logger.createLogger('CreateParty')

interface CreatePartyScreenProps {
  onNavigate: (screen: Screen) => void
  onPartyCreated: (partyId: string, partyCode: string) => void
}

export function CreatePartyScreen({ onNavigate, onPartyCreated }: CreatePartyScreenProps) {
  const { user } = useAuth()
  const [partyName, setPartyName] = useState('')
  const [displayName, setDisplayNameInput] = useState(getDisplayName() || '')
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isCreating) {
      e.preventDefault()
      handleCreate()
    }
  }

  const handleCreate = async () => {
    if (!displayName.trim()) {
      setError('Please enter a display name')
      return
    }

    // Check rate limit for party creation
    const rateLimitError = tryAction('partyCreation')
    if (rateLimitError) {
      setError(rateLimitError)
      return
    }

    setIsCreating(true)
    setError(null)

    try {
      const sessionId = getSessionId()
      const code = generatePartyCode()
      const avatar = getAvatar()

      // Check if we're in mock mode (no Supabase)
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const isMockMode = !supabaseUrl || supabaseUrl.includes('placeholder') || supabaseUrl.includes('your-project-id')

      if (isMockMode) {
        // Mock party creation
        const mockPartyId = `mock-party-${Date.now()}`
        setDisplayName(displayName.trim())
        setCurrentParty(mockPartyId, code)
        onPartyCreated(mockPartyId, code)
        return
      }

      // Create the party
      const { data: party, error: partyError } = await supabase
        .from('parties')
        .insert({
          code,
          name: partyName.trim() || null,
          host_session_id: sessionId,
        })
        .select()
        .single()

      if (partyError) throw partyError

      // Add host as a member
      const memberData: Record<string, unknown> = {
        party_id: party.id,
        session_id: sessionId,
        display_name: displayName.trim(),
        avatar,
        is_host: true,
      }
      // Only include user_id if user is logged in
      if (user?.id) {
        memberData.user_id = user.id
      }
      const { error: memberError } = await supabase
        .from('party_members')
        .insert(memberData)

      if (memberError) throw memberError

      // Save display name for future use
      setDisplayName(displayName.trim())
      setCurrentParty(party.id, code)

      onPartyCreated(party.id, code)
    } catch (err) {
      log.error('Failed to create party', err)
      setError('Failed to create party. Please try again.')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="container-mobile bg-gradient-party flex flex-col px-6 py-8">
      <button
        onClick={() => onNavigate('home')}
        className="btn-ghost p-2 -ml-2 w-fit rounded-full mb-8"
        disabled={isCreating}
        aria-label="Go back to home"
      >
        <ChevronLeftIcon />
      </button>

      <div className="flex-1 flex flex-col">
        <h1 className="text-3xl font-bold mb-2 animate-fade-in-up opacity-0">
          Start a party
        </h1>
        <p className="text-text-secondary mb-8 animate-fade-in-up opacity-0 delay-100">
          Create a room and invite your friends
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
              onKeyDown={handleKeyDown}
              className="input"
              disabled={isCreating}
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
              Party name (optional)
            </label>
            <input
              type="text"
              placeholder="Saturday Night Hangout"
              value={partyName}
              onChange={(e) => setPartyName(e.target.value)}
              onKeyDown={handleKeyDown}
              className="input"
              disabled={isCreating}
              maxLength={100}
            />
            {partyName.length > 0 && (
              <div className="flex justify-end mt-1">
                <span className={`text-xs ${partyName.length >= 90 ? 'text-yellow-400' : 'text-text-muted'}`}>
                  {partyName.length}/100
                </span>
              </div>
            )}
          </div>

          {/* Settings preview */}
          <div className="card p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Queue limit</div>
                <div className="text-xs text-text-muted">Max items in queue</div>
              </div>
              <div className="bg-surface-700 px-3 py-1.5 rounded-lg font-mono text-sm">
                100
              </div>
            </div>
            <div className="h-px bg-surface-700"></div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Rate limit</div>
                <div className="text-xs text-text-muted">Items per person/minute</div>
              </div>
              <div className="bg-surface-700 px-3 py-1.5 rounded-lg font-mono text-sm">
                5
              </div>
            </div>
          </div>

          {error && (
            <div className="text-red-400 text-sm text-center">{error}</div>
          )}

          <button
            onClick={handleCreate}
            disabled={isCreating}
            className="btn btn-primary w-full text-lg mt-4 disabled:opacity-50"
          >
            {isCreating ? (
              <span className="flex items-center justify-center gap-2">
                <LoaderIcon />
                Creating...
              </span>
            ) : (
              'Create Party'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
