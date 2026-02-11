'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  supabase,
  generatePartyCode,
  getSessionId,
  getDisplayName,
  setDisplayName,
  getAvatar,
  setCurrentParty,
} from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { tryAction } from '@/lib/rateLimit'
import { hashPassword } from '@/lib/passwordHash'
import { useAuth } from '@/contexts/AuthContext'
import { ChevronLeftIcon, LoaderIcon, LockIcon } from '@/components/icons'
import { TwinklingStars } from '@/components/ui/TwinklingStars'

const log = logger.createLogger('CreateParty')

export default function CreatePartyPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [partyName, setPartyName] = useState('')
  const [displayName, setDisplayNameInput] = useState(getDisplayName() || '')
  const [passwordEnabled, setPasswordEnabled] = useState(false)
  const [password, setPassword] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    document.title = 'Create Party | Link Party'
  }, [])

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
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const isMockMode = !supabaseUrl || supabaseUrl.includes('placeholder') || supabaseUrl.includes('your-project-id')

      if (isMockMode) {
        // Mock party creation
        const mockPartyId = `mock-party-${Date.now()}`
        setDisplayName(displayName.trim())
        setCurrentParty(mockPartyId, code)
        router.push(`/party/${mockPartyId}`)
        return
      }

      // Hash password if enabled
      const passwordHash = passwordEnabled && password ? await hashPassword(password) : null

      // Create the party
      const insertData: Record<string, unknown> = {
        code,
        name: partyName.trim() || null,
        host_session_id: sessionId,
      }
      if (passwordHash) insertData.password_hash = passwordHash

      const { data: party, error: partyError } = await supabase.from('parties').insert(insertData).select().single()

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
      const { error: memberError } = await supabase.from('party_members').insert(memberData)

      if (memberError) throw memberError

      // Save display name for future use
      setDisplayName(displayName.trim())
      setCurrentParty(party.id, code)

      router.push(`/party/${party.id}`)
    } catch (err) {
      log.error('Failed to create party', err)
      setError('Failed to create party. Please try again.')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="container-mobile bg-gradient-party flex flex-col px-6 py-8 relative">
      <TwinklingStars count={25} />

      <Link href="/" className="btn-ghost p-2 -ml-2 w-fit rounded-full mb-8" aria-label="Go back to home">
        <ChevronLeftIcon />
      </Link>

      <div className="flex-1 flex flex-col">
        <h1 className="text-3xl font-bold mb-2 animate-fade-in-up opacity-0">Start a party</h1>
        <p className="text-text-secondary mb-8 animate-fade-in-up opacity-0 delay-100">
          Create a room and invite your friends
        </p>

        <div className="space-y-6 animate-fade-in-up opacity-0 delay-200">
          <div>
            <label className="block text-sm text-text-secondary mb-2">Your name</label>
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
              <span
                className={`text-xs ${displayName.trim().length > 0 && displayName.trim().length < 2 ? 'text-red-400' : 'text-text-muted'}`}
              >
                {displayName.trim().length > 0 && displayName.trim().length < 2 ? 'Min 2 characters' : ''}
              </span>
              <span className={`text-xs ${displayName.length >= 45 ? 'text-yellow-400' : 'text-text-muted'}`}>
                {displayName.length}/50
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm text-text-secondary mb-2">Party name (optional)</label>
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

          {/* Settings */}
          <div className="card p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LockIcon size={16} />
                <div>
                  <div className="text-sm font-medium">Password protect</div>
                  <div className="text-xs text-text-muted">Require a password to join</div>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={passwordEnabled}
                onClick={() => {
                  setPasswordEnabled(!passwordEnabled)
                  if (passwordEnabled) setPassword('')
                }}
                className={`relative w-11 h-6 rounded-full transition-colors ${passwordEnabled ? 'bg-primary' : 'bg-surface-600'}`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${passwordEnabled ? 'translate-x-5' : ''}`}
                />
              </button>
            </div>
            {passwordEnabled && (
              <input
                type="password"
                placeholder="Enter party password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                className="input"
                disabled={isCreating}
                maxLength={50}
                autoComplete="off"
              />
            )}
            <div className="h-px bg-surface-700"></div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Queue limit</div>
                <div className="text-xs text-text-muted">Max items in queue</div>
              </div>
              <div className="bg-surface-700 px-3 py-1.5 rounded-lg font-mono text-sm">100</div>
            </div>
            <div className="h-px bg-surface-700"></div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Rate limit</div>
                <div className="text-xs text-text-muted">Items per person/minute</div>
              </div>
              <div className="bg-surface-700 px-3 py-1.5 rounded-lg font-mono text-sm">5</div>
            </div>
          </div>

          {error && <div className="text-red-400 text-sm text-center">{error}</div>}

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
