'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getSessionId, getDisplayName, setDisplayName, getAvatar, setCurrentParty } from '@/lib/supabase'
import { trackPartyCreated } from '@/lib/analytics'
import { logger } from '@/lib/logger'
import { useAuth } from '@/contexts/AuthContext'
import { ChevronLeftIcon, LoaderIcon, LockIcon, UsersIcon } from '@/components/icons'
import { FriendsPicker } from '@/components/party/FriendsPicker'
import { supabase } from '@/lib/supabase'
import { TwinklingStars } from '@/components/ui/TwinklingStars'

const log = logger.createLogger('CreateParty')

export default function CreatePartyPage() {
  const router = useRouter()
  const { user } = useAuth()
  const displayName = user?.user_metadata?.display_name || getDisplayName() || ''
  const [partyName, setPartyName] = useState('')
  const [passwordEnabled, setPasswordEnabled] = useState(false)
  const [password, setPassword] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([])
  const [visibleToFriends, setVisibleToFriends] = useState(false)
  const [showFriendsPicker, setShowFriendsPicker] = useState(false)
  const [createdCode, setCreatedCode] = useState<string | null>(null)
  const [createdPartyId, setCreatedPartyId] = useState<string | null>(null)

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
    // Client-side validation: password required when enabled
    if (passwordEnabled && !password.trim()) {
      setError('Please enter a party password')
      return
    }

    setIsCreating(true)
    setError(null)

    try {
      const sessionId = getSessionId()
      const avatar = getAvatar()

      // Check if we're in mock mode (no Supabase)
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const isMockMode = !supabaseUrl || supabaseUrl.includes('placeholder') || supabaseUrl.includes('your-project-id')

      if (isMockMode) {
        // Mock party creation
        const mockPartyId = `mock-party-${Date.now()}`
        const mockCode = 'MOCK01'
        setDisplayName(displayName.trim())
        setCurrentParty(mockPartyId, mockCode)
        router.push(`/party/${mockPartyId}`)
        return
      }

      // Get auth token for userId verification (S8)
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (user?.id) {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`
        }
      }

      const res = await fetch('/api/parties/create', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          sessionId,
          displayName: displayName.trim(),
          avatar,
          partyName: partyName.trim() || undefined,
          password: passwordEnabled && password ? password : undefined,
          userId: user?.id || undefined,
          visibleToFriends,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to create party. Please try again.')
        return
      }

      // Save display name for future use
      setDisplayName(displayName.trim())
      setCurrentParty(data.party.id, data.party.code)
      trackPartyCreated(data.party.id)

      // Fire-and-forget: invite selected friends
      if (selectedFriendIds.length > 0 && data.party?.code) {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (session?.access_token) {
          fetch('/api/parties/invite-friends', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              partyId: data.party.id,
              partyCode: data.party.code,
              partyName: partyName.trim() || 'Party',
              friendIds: selectedFriendIds,
            }),
          }).catch((err) => log.error('Failed to invite friends', err))
        }
      }

      setCreatedCode(data.party.code)
      setCreatedPartyId(data.party.id)
      setTimeout(() => router.push(`/party/${data.party.id}`), 2000)
    } catch (err) {
      log.error('Failed to create party', err)
      setError('Failed to create party. Please try again.')
    } finally {
      setIsCreating(false)
    }
  }

  if (createdCode) {
    return (
      <div className="container-mobile bg-gradient-party flex flex-col items-center justify-center px-6 py-8 relative">
        <TwinklingStars count={40} />
        <div className="animate-fade-in-up text-center relative z-10">
          <div className="w-16 h-16 rounded-full bg-teal-500/20 flex items-center justify-center mx-auto mb-6">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-teal-400"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold mb-2">Party created!</h1>
          <p className="text-text-secondary mb-4">Share this code with your friends</p>
          <p className="text-4xl font-mono tracking-[0.3em] text-accent-400 mb-8">{createdCode}</p>
          <button onClick={() => router.push(`/party/${createdPartyId}`)} className="btn btn-primary">
            Go to Party
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="container-mobile bg-gradient-party flex flex-col px-6 py-8 relative">
      <TwinklingStars count={25} />

      <Link href="/" className="btn-ghost p-2 -ml-2 w-fit rounded-full mb-8" aria-label="Go back to home">
        <ChevronLeftIcon />
      </Link>

      <div className="flex-1 flex flex-col">
        <h1 className="text-3xl font-bold mb-2 animate-fade-in-up">Start a party</h1>
        <p className="text-text-secondary mb-8 animate-fade-in-up delay-100">Create a room and invite your friends</p>

        <div className="space-y-6 animate-fade-in-up delay-200">
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
                aria-label="Password protect this party"
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

          {/* Invite Friends (optional) */}
          <div>
            <button
              type="button"
              onClick={() => setShowFriendsPicker(!showFriendsPicker)}
              className="flex items-center gap-2 text-sm text-text-secondary hover:text-white transition-colors"
            >
              <UsersIcon />
              <span>Invite friends {selectedFriendIds.length > 0 && `(${selectedFriendIds.length})`}</span>
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={`transition-transform ${showFriendsPicker ? 'rotate-180' : ''}`}
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
            {showFriendsPicker && (
              <div className="mt-3 space-y-3">
                <FriendsPicker selectedIds={selectedFriendIds} onSelectionChange={setSelectedFriendIds} />
                <div className="card p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">Visible to friends</div>
                      <div className="text-xs text-text-muted">Friends can see this party on their home page</div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={visibleToFriends}
                      aria-label="Visible to friends"
                      onClick={() => setVisibleToFriends(!visibleToFriends)}
                      className={`relative w-11 h-6 rounded-full transition-colors ${visibleToFriends ? 'bg-primary' : 'bg-surface-600'}`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${visibleToFriends ? 'translate-x-5' : ''}`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            )}
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
