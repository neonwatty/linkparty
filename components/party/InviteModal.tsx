'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { MailIcon, CloseIcon, CheckCircleIcon, AlertIcon } from '@/components/icons'
import { FriendsPicker } from '@/components/party/FriendsPicker'
import { supabase } from '@/lib/supabase'

interface InviteModalProps {
  isOpen: boolean
  partyId: string
  partyCode: string
  partyName: string
  inviterName: string
  onClose: () => void
}

type InviteStatus = 'idle' | 'sending' | 'success' | 'error'
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function SuccessBanner({ message }: { message: string }) {
  return (
    <div className="text-center py-8">
      <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4 text-green-400">
        <CheckCircleIcon />
      </div>
      <p className="text-lg font-semibold">{message}</p>
    </div>
  )
}

export function InviteModal({ isOpen, partyId, partyCode, partyName, inviterName, onClose }: InviteModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  useFocusTrap(modalRef, isOpen)
  const [email, setEmail] = useState('')
  const [personalMessage, setPersonalMessage] = useState('')
  const [status, setStatus] = useState<InviteStatus>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [activeTab, setActiveTab] = useState<'email' | 'friends'>('email')
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([])
  const [friendInviteStatus, setFriendInviteStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')

  const handleClose = useCallback(() => {
    setEmail('')
    setPersonalMessage('')
    setStatus('idle')
    setErrorMessage('')
    setActiveTab('email')
    setSelectedFriendIds([])
    setFriendInviteStatus('idle')
    onClose()
  }, [onClose])

  useEffect(() => {
    if (!isOpen) return
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, handleClose])

  useEffect(() => {
    if (status === 'success') {
      const t = setTimeout(handleClose, 1500)
      return () => clearTimeout(t)
    }
  }, [status, handleClose])

  useEffect(() => {
    if (friendInviteStatus === 'success') {
      const t = setTimeout(handleClose, 1500)
      return () => clearTimeout(t)
    }
  }, [friendInviteStatus, handleClose])

  const handleSend = async () => {
    if (!EMAIL_REGEX.test(email)) {
      setErrorMessage('Please enter a valid email address.')
      setStatus('error')
      return
    }
    setStatus('sending')
    setErrorMessage('')
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }
      const res = await fetch('/api/emails/invite', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          email,
          partyCode,
          partyName,
          inviterName,
          personalMessage: personalMessage.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to send invite.')
        setStatus('error')
        return
      }
      setStatus('success')
    } catch {
      setErrorMessage('Network error. Please try again.')
      setStatus('error')
    }
  }

  const handleInviteFriends = async () => {
    if (selectedFriendIds.length === 0) return
    setFriendInviteStatus('sending')
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setFriendInviteStatus('error')
        return
      }
      const res = await fetch('/api/parties/invite-friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ partyId, partyCode, partyName, friendIds: selectedFriendIds }),
      })
      if (!res.ok) {
        setFriendInviteStatus('error')
        return
      }
      setFriendInviteStatus('success')
    } catch {
      setFriendInviteStatus('error')
    }
  }

  if (!isOpen) return null

  const tabCls = (active: boolean) =>
    `flex-1 text-sm py-2 px-3 rounded-lg transition-colors ${active ? 'bg-surface-700 font-semibold' : 'text-text-muted'}`

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end justify-center z-50">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="Invite a friend"
        className="bg-surface-900 w-full max-w-md rounded-t-3xl p-6 bottom-sheet animate-fade-in-up"
      >
        <div className="w-12 h-1 bg-surface-600 rounded-full mx-auto mb-6" />
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent-500/20 flex items-center justify-center text-accent-400">
              <MailIcon />
            </div>
            <h3 className="text-xl font-bold">Invite a Friend</h3>
          </div>
          <button onClick={handleClose} className="text-text-muted" aria-label="Close modal">
            <CloseIcon />
          </button>
        </div>

        <div className="flex gap-1 bg-surface-800 p-1 rounded-xl mb-4">
          <button onClick={() => setActiveTab('email')} className={tabCls(activeTab === 'email')}>
            Email
          </button>
          <button onClick={() => setActiveTab('friends')} className={tabCls(activeTab === 'friends')}>
            Friends
          </button>
        </div>

        {activeTab === 'email' ? (
          <>
            {status === 'success' ? (
              <SuccessBanner message="Invite sent!" />
            ) : (
              <>
                <input
                  type="email"
                  placeholder="friend@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (status === 'error') setStatus('idle')
                  }}
                  className="input mb-3"
                  autoFocus
                />
                <textarea
                  placeholder="Add a personal message (optional)"
                  value={personalMessage}
                  onChange={(e) => setPersonalMessage(e.target.value)}
                  className="input min-h-[80px] resize-none mb-3"
                  maxLength={500}
                />
                {status === 'error' && errorMessage && (
                  <div className="flex items-center gap-2 text-red-400 text-sm mb-3">
                    <AlertIcon />
                    <span>{errorMessage}</span>
                  </div>
                )}
                <div className="flex gap-3">
                  <button onClick={handleClose} className="btn btn-secondary flex-1">
                    Cancel
                  </button>
                  <button
                    onClick={handleSend}
                    disabled={!email.trim() || status === 'sending'}
                    className="btn btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {status === 'sending' ? 'Sending...' : 'Send Invite'}
                  </button>
                </div>
              </>
            )}
          </>
        ) : (
          <>
            {friendInviteStatus === 'success' ? (
              <SuccessBanner message="Invites sent!" />
            ) : (
              <>
                <FriendsPicker selectedIds={selectedFriendIds} onSelectionChange={setSelectedFriendIds} />
                <div className="flex gap-3 mt-4">
                  <button onClick={handleClose} className="btn btn-secondary flex-1">
                    Cancel
                  </button>
                  <button
                    onClick={handleInviteFriends}
                    disabled={selectedFriendIds.length === 0 || friendInviteStatus === 'sending'}
                    className="btn btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {friendInviteStatus === 'sending' ? 'Sending...' : `Send Invites (${selectedFriendIds.length})`}
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
