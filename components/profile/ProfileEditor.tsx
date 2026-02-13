'use client'

import { useState, useEffect, useRef } from 'react'
import { getMyProfile, updateProfile, checkUsernameAvailable } from '@/lib/profile'
import { LoaderIcon } from '@/components/icons'

const EMOJI_OPTIONS = ['🎉', '🎸', '🎭', '🎪', '🎵', '🌟', '🔥', '🎯', '🦊', '🐻', '🦁', '🐱', '🐶', '🦄', '🌈', '🍕']

function AvatarPicker({ value, onChange }: { value: string; onChange: (emoji: string) => void }) {
  return (
    <div>
      <label className="text-text-secondary text-sm mb-2 block">Avatar</label>
      <div className="flex flex-col items-center gap-4">
        <div className="text-6xl">{value}</div>
        <div className="grid grid-cols-8 gap-2">
          {EMOJI_OPTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => onChange(emoji)}
              className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all ${
                value === emoji
                  ? 'bg-accent-500/20 ring-2 ring-accent-500 scale-110'
                  : 'bg-surface-800 hover:bg-surface-700'
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function UsernameField({
  username,
  onUsernameChange,
  usernameChecking,
  usernameAvailable,
}: {
  username: string
  onUsernameChange: (value: string) => void
  usernameChecking: boolean
  usernameAvailable: boolean | null
}) {
  return (
    <div>
      <label className="text-text-secondary text-sm mb-2 block">Username</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">@</span>
        <input
          type="text"
          value={username}
          onChange={(e) => onUsernameChange(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
          placeholder="username"
          className="input pl-8"
          maxLength={20}
        />
      </div>
      {username.length >= 3 && (
        <div className="mt-1">
          {usernameChecking ? (
            <p className="text-text-muted text-sm">Checking availability...</p>
          ) : usernameAvailable === true ? (
            <p className="text-teal-400 text-sm">Username available</p>
          ) : usernameAvailable === false ? (
            <p className="text-red-400 text-sm">Username already taken</p>
          ) : null}
        </div>
      )}
      {username.length > 0 && username.length < 3 && (
        <p className="text-text-muted text-sm mt-1">Username must be at least 3 characters</p>
      )}
    </div>
  )
}

export default function ProfileEditor() {
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [avatarValue, setAvatarValue] = useState('🎉')
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null)
  const [usernameChecking, setUsernameChecking] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const profileUsernameRef = useRef<string | null>(null)

  // Load profile on mount
  useEffect(() => {
    async function loadProfile() {
      const data = await getMyProfile()
      if (data) {
        setDisplayName(data.display_name)
        setUsername(data.username || '')
        setAvatarValue(data.avatar_value || '🎉')
        profileUsernameRef.current = data.username
      }
      setLoading(false)
    }
    loadProfile()
  }, [])

  // Debounced username availability check
  useEffect(() => {
    if (!username || username.length < 3) {
      return
    }

    const timer = setTimeout(() => {
      // If username hasn't changed from profile, skip check
      if (profileUsernameRef.current && username.toLowerCase() === profileUsernameRef.current.toLowerCase()) {
        setUsernameAvailable(true)
        setUsernameChecking(false)
        return
      }
      setUsernameChecking(true)
      checkUsernameAvailable(username).then((available) => {
        setUsernameAvailable(available)
        setUsernameChecking(false)
      })
    }, 500)

    return () => clearTimeout(timer)
  }, [username])

  const handleUsernameChange = (value: string) => {
    setUsername(value)
    setUsernameAvailable(null)
    setUsernameChecking(false)
  }

  const handleSave = async () => {
    setError(null)
    setSuccess(null)
    setSaving(true)

    const updates: Parameters<typeof updateProfile>[0] = {
      display_name: displayName.trim(),
      avatar_type: 'emoji' as const,
      avatar_value: avatarValue,
    }

    if (username.trim()) {
      updates.username = username.trim().toLowerCase()
    } else {
      updates.username = null
    }

    const result = await updateProfile(updates)
    setSaving(false)

    if (result.error) {
      setError(result.error)
    } else {
      profileUsernameRef.current = result.data?.username ?? null
      setSuccess('Profile saved!')
      setTimeout(() => setSuccess(null), 3000)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoaderIcon />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <AvatarPicker value={avatarValue} onChange={setAvatarValue} />

      {/* Display Name */}
      <div>
        <label className="text-text-secondary text-sm mb-2 block">Display name</label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Your display name"
          className="input"
          maxLength={50}
        />
      </div>

      <UsernameField
        username={username}
        onUsernameChange={handleUsernameChange}
        usernameChecking={usernameChecking}
        usernameAvailable={usernameAvailable}
      />

      {/* Error / Success messages */}
      {error && <p className="text-red-400 text-sm">{error}</p>}
      {success && <p className="text-teal-400 text-sm">{success}</p>}

      {/* Save Button */}
      <button onClick={handleSave} className="btn btn-primary w-full" disabled={saving || !displayName.trim()}>
        {saving ? <LoaderIcon /> : 'Save Profile'}
      </button>
    </div>
  )
}
