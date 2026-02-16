'use client'

import { useState } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { getSessionId, getDisplayName, setDisplayName, getAvatar, setCurrentParty, IS_MOCK_MODE } from '@/lib/supabase'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { useAuth } from '@/contexts/AuthContext'
import { ChevronLeftIcon, LoaderIcon, LockIcon } from '@/components/icons'

const log = logger.createLogger('JoinParty')

export default function JoinWithCodeClient() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const initialCode = ((params.code as string) || '').toUpperCase()
  const inviterId = searchParams.get('inviter')
  const { user } = useAuth()
  const displayName = user?.user_metadata?.display_name || getDisplayName() || ''
  const [code, setCode] = useState(initialCode)
  const [password, setPassword] = useState('')
  const [needsPassword, setNeedsPassword] = useState(false)
  const [isJoining, setIsJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isJoining && code.length === 6) {
      e.preventDefault()
      handleJoin()
    }
  }

  const handleJoin = async () => {
    if (code.length !== 6) {
      setError('Please enter a 6-character party code')
      return
    }

    setIsJoining(true)
    setError(null)

    try {
      const sessionId = getSessionId()
      const avatar = getAvatar()

      // In mock mode, simulate joining any party
      if (IS_MOCK_MODE) {
        log.info('Mock mode: simulating party join via deep link', { code: code.toUpperCase() })

        // Save display name for future use
        setDisplayName(displayName.trim())

        // Create mock party ID based on code
        const mockPartyId = `mock-party-${code.toUpperCase()}-${Date.now()}`
        setCurrentParty(mockPartyId, code.toUpperCase())

        router.push(`/party/${mockPartyId}`)
        return
      }

      const res = await fetch('/api/parties/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code.toUpperCase(),
          sessionId,
          displayName: displayName.trim(),
          avatar,
          password: needsPassword ? password : undefined,
          userId: user?.id || undefined,
        }),
      })

      const data = await res.json()

      // Server says password is required — show password field
      if (data.needsPassword && !needsPassword) {
        setNeedsPassword(true)
        setIsJoining(false)
        return
      }

      if (!res.ok) {
        setError(data.error || 'Failed to join party. Please try again.')
        setIsJoining(false)
        return
      }

      // Save display name for future use
      setDisplayName(displayName.trim())
      setCurrentParty(data.party.id, data.party.code)

      // Fire-and-forget: claim invite tokens for auto-friendship
      if (inviterId) {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session?.access_token) {
            fetch('/api/invites/claim', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
              body: JSON.stringify({ partyCode: code.toUpperCase() }),
            }).catch((err) => log.error('Failed to claim invite', err))
          }
        })
      }

      router.push(`/party/${data.party.id}`)
    } catch (err) {
      log.error('Failed to join party', err)
      setError('Failed to join party. Please try again.')
    } finally {
      setIsJoining(false)
    }
  }

  return (
    <div className="container-mobile bg-gradient-party flex flex-col px-6 py-8">
      <Link href="/" className="btn-ghost p-2 -ml-2 w-fit rounded-full mb-8" aria-label="Go back to home">
        <ChevronLeftIcon />
      </Link>

      <div className="flex-1 flex flex-col">
        <h1 className="text-3xl font-bold mb-2 animate-fade-in-up">Join a party</h1>
        <p className="text-text-secondary mb-8 animate-fade-in-up delay-100">Confirm the code and join</p>

        <div className="space-y-6 animate-fade-in-up delay-200">
          <div>
            <label className="block text-sm text-text-secondary mb-2">Party code</label>
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

          {needsPassword && (
            <div>
              <label className="flex items-center gap-2 text-sm text-text-secondary mb-2">
                <LockIcon size={14} />
                Party password
              </label>
              <input
                type="password"
                placeholder="Enter party password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                className="input"
                disabled={isJoining}
                maxLength={50}
                autoComplete="off"
                autoFocus
              />
            </div>
          )}

          {error && <div className="text-red-400 text-sm text-center">{error}</div>}

          <button
            onClick={handleJoin}
            className="btn btn-primary w-full text-lg disabled:opacity-50"
            disabled={code.length !== 6 || isJoining || (needsPassword && !password)}
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
          <p className="text-text-muted text-sm">Ask your host for the 6-character code</p>
          {IS_MOCK_MODE && <p className="text-yellow-500 text-xs mt-2">Dev mode: Any code will work</p>}
        </div>
      </div>
    </div>
  )
}
