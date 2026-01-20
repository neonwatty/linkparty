import { useState } from 'react'
import './App.css'
import {
  supabase,
  getSessionId,
  generatePartyCode,
  getDisplayName,
  setDisplayName,
  getAvatar,
  getCurrentParty,
  setCurrentParty,
  clearCurrentParty,
} from './lib/supabase'
import { useParty } from './hooks/useParty'
import type { QueueItem } from './hooks/useParty'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { signInWithGoogle } from './lib/auth'

// Icons as simple SVG components
const PlayIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M8 5v14l11-7z"/>
  </svg>
)

const SkipIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
  </svg>
)

const PlusIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
)

const UsersIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
)

const TvIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="7" width="20" height="15" rx="2" ry="2"/>
    <polyline points="17 2 12 7 7 2"/>
  </svg>
)

const HistoryIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
)

const ChevronLeftIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
)

const ShareIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="18" cy="5" r="3"/>
    <circle cx="6" cy="12" r="3"/>
    <circle cx="18" cy="19" r="3"/>
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
  </svg>
)

const DragIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" opacity="0.4">
    <circle cx="9" cy="6" r="2"/>
    <circle cx="15" cy="6" r="2"/>
    <circle cx="9" cy="12" r="2"/>
    <circle cx="15" cy="12" r="2"/>
    <circle cx="9" cy="18" r="2"/>
    <circle cx="15" cy="18" r="2"/>
  </svg>
)

const TrashIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
  </svg>
)

const ArrowUpIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="19" x2="12" y2="5"/>
    <polyline points="5 12 12 5 19 12"/>
  </svg>
)

const ArrowDownIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <polyline points="19 12 12 19 5 12"/>
  </svg>
)

const PlayNextIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="5 3 19 12 5 21 5 3"/>
    <line x1="19" y1="5" x2="19" y2="19"/>
  </svg>
)

const CloseIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
)

const CheckIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)

const LoaderIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
    <circle cx="12" cy="12" r="10" strokeOpacity="0.25"/>
    <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/>
  </svg>
)

const EditIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
)

// Content type icons
const YoutubeIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
)

const TwitterIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
)

const RedditIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
  </svg>
)

const NoteIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
    <polyline points="10 9 9 9 8 9"/>
  </svg>
)

const LinkIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
  </svg>
)

const CalendarIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
)

const CheckCircleIcon = ({ size = 16, filled = false }: { size?: number; filled?: boolean }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    {filled && <polyline points="9 12 12 15 16 10" stroke="white" strokeWidth="2" fill="none"/>}
  </svg>
)

const AlertIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
)

// Types
type Screen = 'home' | 'login' | 'signup' | 'create' | 'join' | 'party' | 'tv' | 'history'
type ContentType = 'youtube' | 'tweet' | 'reddit' | 'note'

// Mock data for history screen (keeping as mock for MVP)
const mockPastParties = [
  { id: '1', name: 'Game Night', date: 'Jan 10, 2025', members: 6, items: 24 },
  { id: '2', name: 'New Years Eve', date: 'Dec 31, 2024', members: 12, items: 45 },
  { id: '3', name: 'Movie Club', date: 'Dec 28, 2024', members: 4, items: 8 },
  { id: '4', name: 'Thanksgiving', date: 'Nov 28, 2024', members: 8, items: 31 },
]

// Components

function HomeScreen({ onNavigate }: { onNavigate: (screen: Screen) => void }) {
  return (
    <div className="container-mobile bg-gradient-party flex flex-col px-6 py-8">
      {/* Header */}
      <div className="flex justify-end mb-8">
        <button
          onClick={() => onNavigate('history')}
          className="btn-ghost p-2 rounded-full"
        >
          <HistoryIcon />
        </button>
      </div>

      {/* Hero */}
      <div className="flex-1 flex flex-col justify-center">
        <div className="animate-fade-in-up opacity-0">
          <div className="text-accent-500 font-mono text-sm tracking-wider mb-4">
            SHARE TOGETHER
          </div>
          <h1 className="text-5xl font-bold leading-tight mb-4">
            Remember<br />Party
          </h1>
          <p className="text-text-secondary text-lg mb-12 max-w-xs">
            Share content together. Queue videos, tweets, posts, and notes in real-time.
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="space-y-4 animate-fade-in-up opacity-0 delay-200">
          <button
            onClick={() => onNavigate('create')}
            className="btn btn-primary w-full text-lg"
          >
            Start a Party
          </button>
          <button
            onClick={() => onNavigate('join')}
            className="btn btn-secondary w-full text-lg"
          >
            Join with Code
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto pt-8 animate-fade-in-up opacity-0 delay-300">
        <button
          onClick={() => onNavigate('login')}
          className="text-text-muted text-sm hover:text-text-secondary transition-colors"
        >
          Already have an account? <span className="text-accent-400">Sign in</span>
        </button>
      </div>
    </div>
  )
}

function LoginScreen({ onNavigate }: { onNavigate: (screen: Screen) => void }) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    setError(null)
    try {
      await signInWithGoogle()
    } catch {
      setError('Failed to sign in with Google')
      setIsLoading(false)
    }
  }

  return (
    <div className="container-mobile bg-gradient-party flex flex-col px-6 py-8">
      {/* Back button */}
      <button
        onClick={() => onNavigate('home')}
        className="btn-ghost p-2 -ml-2 w-fit rounded-full mb-8"
        disabled={isLoading}
      >
        <ChevronLeftIcon />
      </button>

      <div className="flex-1 flex flex-col">
        <h1 className="text-3xl font-bold mb-2 animate-fade-in-up opacity-0">
          Welcome back
        </h1>
        <p className="text-text-secondary mb-8 animate-fade-in-up opacity-0 delay-100">
          Sign in to access your party history
        </p>

        {error && (
          <div className="text-red-400 text-sm text-center mb-4">{error}</div>
        )}

        {/* OAuth buttons */}
        <div className="space-y-3 mb-8 animate-fade-in-up opacity-0 delay-200">
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="btn btn-secondary w-full flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {isLoading ? (
              <LoaderIcon />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"/>
              </svg>
            )}
            Continue with Google
          </button>
        </div>

        <div className="flex items-center gap-4 mb-8 animate-fade-in-up opacity-0 delay-300">
          <div className="flex-1 h-px bg-surface-700"></div>
          <span className="text-text-muted text-sm">or</span>
          <div className="flex-1 h-px bg-surface-700"></div>
        </div>

        {/* Email form - placeholder for future */}
        <div className="space-y-4 animate-fade-in-up opacity-0 delay-400">
          <input
            type="email"
            placeholder="Email address"
            className="input"
            disabled={isLoading}
          />
          <input
            type="password"
            placeholder="Password"
            className="input"
            disabled={isLoading}
          />
          <button
            onClick={() => onNavigate('home')}
            className="btn btn-primary w-full"
            disabled={isLoading}
          >
            Sign In
          </button>
        </div>

        <div className="mt-6 text-center animate-fade-in-up opacity-0 delay-500">
          <button
            onClick={() => onNavigate('signup')}
            className="text-text-muted text-sm hover:text-text-secondary transition-colors"
          >
            Don't have an account? <span className="text-accent-400">Sign up</span>
          </button>
        </div>
      </div>
    </div>
  )
}

function SignupScreen({ onNavigate }: { onNavigate: (screen: Screen) => void }) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    setError(null)
    try {
      await signInWithGoogle()
    } catch {
      setError('Failed to sign in with Google')
      setIsLoading(false)
    }
  }

  return (
    <div className="container-mobile bg-gradient-party flex flex-col px-6 py-8">
      <button
        onClick={() => onNavigate('home')}
        className="btn-ghost p-2 -ml-2 w-fit rounded-full mb-8"
        disabled={isLoading}
      >
        <ChevronLeftIcon />
      </button>

      <div className="flex-1 flex flex-col">
        <h1 className="text-3xl font-bold mb-2 animate-fade-in-up opacity-0">
          Create account
        </h1>
        <p className="text-text-secondary mb-8 animate-fade-in-up opacity-0 delay-100">
          Join parties and share content with friends
        </p>

        {error && (
          <div className="text-red-400 text-sm text-center mb-4">{error}</div>
        )}

        <div className="space-y-3 mb-8 animate-fade-in-up opacity-0 delay-200">
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="btn btn-secondary w-full flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {isLoading ? (
              <LoaderIcon />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"/>
              </svg>
            )}
            Continue with Google
          </button>
        </div>

        <div className="flex items-center gap-4 mb-8 animate-fade-in-up opacity-0 delay-300">
          <div className="flex-1 h-px bg-surface-700"></div>
          <span className="text-text-muted text-sm">or</span>
          <div className="flex-1 h-px bg-surface-700"></div>
        </div>

        {/* Email form - placeholder for future */}
        <div className="space-y-4 animate-fade-in-up opacity-0 delay-400">
          <input type="text" placeholder="Display name" className="input" disabled={isLoading} />
          <input type="email" placeholder="Email address" className="input" disabled={isLoading} />
          <input type="password" placeholder="Password" className="input" disabled={isLoading} />
          <button
            onClick={() => onNavigate('home')}
            className="btn btn-primary w-full"
            disabled={isLoading}
          >
            Create Account
          </button>
        </div>

        <div className="mt-6 text-center animate-fade-in-up opacity-0 delay-500">
          <button
            onClick={() => onNavigate('login')}
            className="text-text-muted text-sm"
          >
            Already have an account? <span className="text-accent-400">Sign in</span>
          </button>
        </div>
      </div>
    </div>
  )
}

interface CreatePartyScreenProps {
  onNavigate: (screen: Screen) => void
  onPartyCreated: (partyId: string, partyCode: string) => void
}

function CreatePartyScreen({ onNavigate, onPartyCreated }: CreatePartyScreenProps) {
  const [partyName, setPartyName] = useState('')
  const [displayName, setDisplayNameInput] = useState(getDisplayName() || '')
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreate = async () => {
    if (!displayName.trim()) {
      setError('Please enter a display name')
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
      const { error: memberError } = await supabase
        .from('party_members')
        .insert({
          party_id: party.id,
          session_id: sessionId,
          display_name: displayName.trim(),
          avatar,
          is_host: true,
        })

      if (memberError) throw memberError

      // Save display name for future use
      setDisplayName(displayName.trim())
      setCurrentParty(party.id, code)

      onPartyCreated(party.id, code)
    } catch (err) {
      console.error('Error creating party:', err)
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
              className="input"
              disabled={isCreating}
            />
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
              className="input"
              disabled={isCreating}
            />
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

interface JoinPartyScreenProps {
  onNavigate: (screen: Screen) => void
  onPartyJoined: (partyId: string, partyCode: string) => void
}

function JoinPartyScreen({ onNavigate, onPartyJoined }: JoinPartyScreenProps) {
  const [code, setCode] = useState('')
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
      const { error: memberError } = await supabase
        .from('party_members')
        .upsert(
          {
            party_id: party.id,
            session_id: sessionId,
            display_name: displayName.trim(),
            avatar,
            is_host: false,
          },
          {
            onConflict: 'party_id,session_id',
          }
        )

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

// Add Content Modal States
type AddContentStep = 'input' | 'loading' | 'preview' | 'success' | 'note'

// Helper to detect content type from URL
function detectContentType(url: string): ContentType | null {
  const lowerUrl = url.toLowerCase()
  if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) return 'youtube'
  if (lowerUrl.includes('twitter.com') || lowerUrl.includes('x.com')) return 'tweet'
  if (lowerUrl.includes('reddit.com')) return 'reddit'
  return null
}

// Helper to get content type badge info
function getContentTypeBadge(type: ContentType) {
  switch (type) {
    case 'youtube':
      return { icon: YoutubeIcon, color: 'text-red-500', bg: 'bg-red-500/20' }
    case 'tweet':
      return { icon: TwitterIcon, color: 'text-blue-400', bg: 'bg-blue-400/20' }
    case 'reddit':
      return { icon: RedditIcon, color: 'text-orange-500', bg: 'bg-orange-500/20' }
    case 'note':
      return { icon: NoteIcon, color: 'text-gray-400', bg: 'bg-gray-400/20' }
  }
}

// Helper to get display title for queue item
function getQueueItemTitle(item: QueueItem): string {
  switch (item.type) {
    case 'youtube':
      return item.title || 'Untitled Video'
    case 'tweet':
      return item.tweetContent?.slice(0, 60) + (item.tweetContent && item.tweetContent.length > 60 ? '...' : '') || 'Tweet'
    case 'reddit':
      return item.redditTitle || 'Reddit Post'
    case 'note':
      return item.noteContent?.slice(0, 60) + (item.noteContent && item.noteContent.length > 60 ? '...' : '') || 'Note'
  }
}

// Helper to check if an item is overdue
function isItemOverdue(item: QueueItem): boolean {
  if (!item.dueDate || item.isCompleted) return false
  return new Date(item.dueDate) < new Date()
}

// Helper to format due date
function formatDueDate(dueDate: string): string {
  const date = new Date(dueDate)
  const now = new Date()
  const diffMs = date.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    return `${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''} overdue`
  } else if (diffDays === 0) {
    return 'Due today'
  } else if (diffDays === 1) {
    return 'Due tomorrow'
  } else if (diffDays <= 7) {
    return `Due in ${diffDays} days`
  } else {
    return `Due ${date.toLocaleDateString()}`
  }
}

// Helper to get subtitle for queue item
function getQueueItemSubtitle(item: QueueItem): string {
  const baseSubtitle = (() => {
    switch (item.type) {
      case 'youtube':
        return `${item.duration || ''} · Added by ${item.addedBy}`
      case 'tweet':
        return `${item.tweetAuthor} · Added by ${item.addedBy}`
      case 'reddit':
        return `${item.subreddit} · Added by ${item.addedBy}`
      case 'note':
        if (item.isCompleted) {
          return `Completed · Added by ${item.addedBy}`
        }
        if (item.dueDate) {
          return `${formatDueDate(item.dueDate)} · Added by ${item.addedBy}`
        }
        return `Added by ${item.addedBy}`
    }
  })()
  return baseSubtitle
}

interface PartyRoomScreenProps {
  onNavigate: (screen: Screen) => void
  partyId: string
  partyCode: string
  onLeaveParty: () => void
}

function PartyRoomScreen({ onNavigate, partyId, partyCode, onLeaveParty }: PartyRoomScreenProps) {
  const {
    queue,
    members,
    partyInfo,
    isLoading,
    addToQueue,
    moveItem,
    deleteItem,
    advanceQueue,
    showNext,
    updateNoteContent,
    toggleComplete,
  } = useParty(partyId)

  const [showAddContent, setShowAddContent] = useState(false)
  const [addContentStep, setAddContentStep] = useState<AddContentStep>('input')
  const [contentUrl, setContentUrl] = useState('')
  const [noteText, setNoteText] = useState('')
  const [noteDueDate, setNoteDueDate] = useState<string>('')
  const [detectedType, setDetectedType] = useState<ContentType | null>(null)
  const [selectedItem, setSelectedItem] = useState<QueueItem | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  // Note editing state
  const [showEditNote, setShowEditNote] = useState(false)
  const [editNoteText, setEditNoteText] = useState('')
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  // Note viewing state
  const [showViewNote, setShowViewNote] = useState(false)
  const [viewingNote, setViewingNote] = useState<QueueItem | null>(null)

  const sessionId = getSessionId()
  const currentUserDisplayName = getDisplayName() || 'You'
  const isHost = partyInfo?.hostSessionId === sessionId

  const currentItem = queue.find(v => v.status === 'showing')
  const pendingItems = queue.filter(v => v.status === 'pending')

  // Simulated preview data for different content types
  const previewData: Record<ContentType, Partial<QueueItem>> = {
    youtube: {
      type: 'youtube',
      title: 'How to Make Perfect Homemade Pizza',
      channel: 'Joshua Weissman',
      duration: '18:42',
      thumbnail: 'https://picsum.photos/seed/pizza/320/180',
    },
    tweet: {
      type: 'tweet',
      tweetAuthor: 'Tech News',
      tweetHandle: '@technews',
      tweetContent: 'Breaking: New AI model achieves human-level performance on complex reasoning tasks.',
      tweetTimestamp: 'Just now',
    },
    reddit: {
      type: 'reddit',
      subreddit: 'r/programming',
      redditTitle: 'TIL about a programming technique that changed how I write code',
      redditBody: 'I recently discovered functional composition and it has completely transformed my approach to software development...',
      upvotes: 5420,
      commentCount: 342,
    },
    note: {
      type: 'note',
      noteContent: noteText,
    },
  }

  const handleUrlSubmit = () => {
    const type = detectContentType(contentUrl)
    if (type) {
      setDetectedType(type)
      setAddContentStep('loading')
      // Simulate API call
      setTimeout(() => setAddContentStep('preview'), 1500)
    }
  }

  const handleAddToQueue = () => {
    if (!detectedType) return

    // Immediately show success state (sync) to ensure iOS touch event completes
    setAddContentStep('success')

    // Then do async work
    const doAddToQueue = async () => {
      try {
        const preview = detectedType === 'note'
          ? { noteContent: noteText }
          : previewData[detectedType]

        await addToQueue({
          type: detectedType,
          status: queue.length === 0 ? 'showing' : 'pending',
          addedBy: currentUserDisplayName,
          isCompleted: false,
          ...preview,
        })
      } catch (err) {
        console.error('Failed to add to queue:', err)
      }
    }

    doAddToQueue()

    setTimeout(() => {
      setShowAddContent(false)
      setAddContentStep('input')
      setContentUrl('')
      setNoteText('')
      setNoteDueDate('')
      setDetectedType(null)
    }, 1500)
  }

  const handleNoteSubmit = () => {
    console.log('handleNoteSubmit called, noteText:', noteText.trim())
    if (noteText.trim()) {
      console.log('Setting detectedType to note')
      setDetectedType('note')
      setAddContentStep('preview')
    }
  }

  // Note editing handlers
  const handleOpenEditNote = (item: QueueItem) => {
    if (item.type === 'note') {
      setEditNoteText(item.noteContent || '')
      setEditingNoteId(item.id)
      setShowEditNote(true)
      setSelectedItem(null)
    }
  }

  const handleSaveNote = async () => {
    if (editingNoteId && editNoteText.trim()) {
      try {
        await updateNoteContent(editingNoteId, editNoteText.trim())
        setShowEditNote(false)
        setEditNoteText('')
        setEditingNoteId(null)
      } catch (err) {
        console.error('Failed to update note:', err)
      }
    }
  }

  const handleCancelEditNote = () => {
    setShowEditNote(false)
    setEditNoteText('')
    setEditingNoteId(null)
  }

  // Note viewing handlers
  const handleViewNote = (item: QueueItem) => {
    if (item.type === 'note') {
      setViewingNote(item)
      setShowViewNote(true)
      setSelectedItem(null)
    }
  }

  const handleMoveUp = async (itemId: string) => {
    await moveItem(itemId, 'up')
    setSelectedItem(null)
  }

  const handleMoveDown = async (itemId: string) => {
    await moveItem(itemId, 'down')
    setSelectedItem(null)
  }

  const handleDelete = async () => {
    if (selectedItem) {
      try {
        await deleteItem(selectedItem.id)
        setShowDeleteConfirm(false)
        setSelectedItem(null)
      } catch (err) {
        console.error('Failed to delete item:', err)
      }
    }
  }

  const handleShowNext = async (itemId: string) => {
    await showNext(itemId)
    setSelectedItem(null)
  }

  const handleNext = async () => {
    await advanceQueue()
  }

  const handleLeave = () => {
    clearCurrentParty()
    onLeaveParty()
  }

  if (isLoading) {
    return (
      <div className="container-mobile bg-surface-950 flex flex-col items-center justify-center">
        <LoaderIcon />
        <p className="text-text-muted mt-4">Loading party...</p>
      </div>
    )
  }

  return (
    <div className="container-mobile bg-surface-950 flex flex-col min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-surface-800 safe-area-top">
        <button
          onClick={handleLeave}
          className="btn-ghost icon-btn -ml-2 rounded-full"
        >
          <ChevronLeftIcon />
        </button>
        <div className="text-center">
          <div className="font-semibold">{partyInfo?.name || 'Party'}</div>
          <div className="text-xs text-text-muted font-mono">{partyCode}</div>
        </div>
        <div className="flex gap-0">
          <button
            onClick={() => onNavigate('tv')}
            className="btn-ghost icon-btn rounded-full"
            title="TV Mode"
          >
            <TvIcon />
          </button>
          <button className="btn-ghost icon-btn rounded-full">
            <ShareIcon />
          </button>
        </div>
      </div>

      {/* Now Showing */}
      {currentItem && (
        <div className="p-4 bg-gradient-to-b from-surface-900 to-surface-950">
          <div className="text-xs text-accent-500 font-mono mb-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent-500 animate-pulse"></span>
            NOW SHOWING
          </div>

          {/* Content Display - Different for each type */}
          {currentItem.type === 'youtube' && (
            <>
              <div className="relative aspect-video bg-surface-800 rounded-xl overflow-hidden mb-4 glow-accent">
                <img
                  src={currentItem.thumbnail}
                  alt={currentItem.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                    <PlayIcon />
                  </div>
                </div>
              </div>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-lg truncate">{currentItem.title}</h2>
                  <p className="text-text-muted text-sm">{currentItem.channel}</p>
                </div>
              </div>
            </>
          )}

          {currentItem.type === 'tweet' && (
            <div className="bg-surface-800 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                  <TwitterIcon size={24} />
                </div>
                <div>
                  <div className="font-semibold">{currentItem.tweetAuthor}</div>
                  <div className="text-text-muted text-sm">{currentItem.tweetHandle}</div>
                </div>
              </div>
              <p className="text-lg leading-relaxed mb-3">{currentItem.tweetContent}</p>
              <div className="text-text-muted text-sm">{currentItem.tweetTimestamp}</div>
            </div>
          )}

          {currentItem.type === 'reddit' && (
            <div className="bg-surface-800 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-500">
                  <RedditIcon size={14} />
                </div>
                <span className="text-orange-500 text-sm font-medium">{currentItem.subreddit}</span>
              </div>
              <h2 className="font-semibold text-lg mb-2">{currentItem.redditTitle}</h2>
              <p className="text-text-secondary text-sm mb-3 line-clamp-3">{currentItem.redditBody}</p>
              <div className="flex items-center gap-4 text-text-muted text-sm">
                <span>{currentItem.upvotes?.toLocaleString()} upvotes</span>
                <span>{currentItem.commentCount?.toLocaleString()} comments</span>
              </div>
            </div>
          )}

          {currentItem.type === 'note' && (
            <div className="bg-surface-800 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-gray-500/20 flex items-center justify-center text-gray-400">
                  <NoteIcon size={16} />
                </div>
                <span className="text-text-muted text-sm">Note from {currentItem.addedBy}</span>
              </div>
              <p className="text-lg leading-relaxed">{currentItem.noteContent}</p>
            </div>
          )}

          {/* Host Controls - Just Next button */}
          {isHost && (
            <div className="flex items-center justify-center mt-4">
              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-6 py-3 rounded-full bg-accent-500 hover:bg-accent-400 transition-colors font-medium"
              >
                <SkipIcon />
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* Members */}
      <div className="px-4 py-3 border-b border-surface-800">
        <div className="flex items-center gap-2 text-text-secondary text-sm">
          <UsersIcon />
          <span>{members.length} watching</span>
        </div>
        <div className="flex gap-2 mt-2 flex-wrap">
          {members.map(member => (
            <div
              key={member.id}
              className="flex items-center gap-1.5 bg-surface-800 px-2 py-1 rounded-full text-sm"
            >
              <span>{member.avatar}</span>
              <span>{member.sessionId === sessionId ? 'You' : member.name}</span>
              {member.isHost && (
                <span className="text-[10px] bg-accent-500/20 text-accent-400 px-1.5 py-0.5 rounded-full">
                  HOST
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Queue */}
      <div className="flex-1 overflow-auto">
        <div className="px-4 py-3 flex items-center justify-between sticky top-0 bg-surface-950/95 backdrop-blur z-10">
          <div className="text-sm text-text-secondary">
            Up next · {pendingItems.length} items
          </div>
          <div className="text-xs text-text-muted">Tap to edit</div>
        </div>

        <div className="px-4 pb-24">
          {pendingItems.map((item, index) => {
            const badge = getContentTypeBadge(item.type)
            const BadgeIcon = badge.icon
            const isOwnItem = item.addedBySessionId === sessionId
            const overdue = isItemOverdue(item)
            return (
              <div
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className={`queue-item cursor-pointer active:bg-surface-700 ${item.isCompleted ? 'opacity-60' : ''}`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Completion checkbox for notes */}
                {item.type === 'note' ? (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleComplete(item.id)
                    }}
                    onTouchEnd={(e) => {
                      e.stopPropagation()
                      e.preventDefault()
                      toggleComplete(item.id)
                    }}
                    className={`flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center -ml-2 cursor-pointer ${item.isCompleted ? 'text-green-500' : overdue ? 'text-red-500' : 'text-text-muted'}`}
                  >
                    <CheckCircleIcon size={24} filled={item.isCompleted} />
                  </div>
                ) : (
                  <DragIcon />
                )}
                {/* Content type badge/preview */}
                <div className={`relative w-20 h-12 rounded-lg overflow-hidden flex-shrink-0 ${badge.bg} flex items-center justify-center`}>
                  {item.type === 'youtube' && item.thumbnail ? (
                    <img
                      src={item.thumbnail}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className={badge.color}>
                      <BadgeIcon size={24} />
                    </span>
                  )}
                  {isOwnItem && (
                    <div className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-teal-500"></div>
                  )}
                  {/* Overdue indicator */}
                  {overdue && (
                    <div className="absolute bottom-0.5 right-0.5 text-red-500">
                      <AlertIcon size={12} />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`${badge.color}`}>
                      <BadgeIcon size={12} />
                    </span>
                    <span className={`font-medium text-sm truncate ${item.isCompleted ? 'line-through' : ''}`}>
                      {getQueueItemTitle(item)}
                    </span>
                  </div>
                  <div className={`text-xs ${overdue ? 'text-red-400' : 'text-text-muted'}`}>
                    {getQueueItemSubtitle(item)}
                  </div>
                </div>
                <div className="text-text-muted">
                  <EditIcon />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Add Content FAB */}
      <button
        onClick={() => setShowAddContent(true)}
        className="fab bg-accent-500 hover:bg-accent-400 transition-all hover:scale-105 animate-pulse-glow"
      >
        <PlusIcon />
      </button>

      {/* Add Content Modal - Enhanced */}
      {showAddContent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end justify-center z-50">
          <div className="bg-surface-900 w-full max-w-md rounded-t-3xl p-6 bottom-sheet animate-fade-in-up">
            <div className="w-12 h-1 bg-surface-600 rounded-full mx-auto mb-6"></div>

            {/* Step: Input - URL or Note */}
            {addContentStep === 'input' && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold">Add to queue</h3>
                  <button onClick={() => setShowAddContent(false)} className="text-text-muted">
                    <CloseIcon />
                  </button>
                </div>

                {/* URL Input */}
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <LinkIcon />
                    <span className="text-sm text-text-secondary">Paste a URL</span>
                  </div>
                  <input
                    type="text"
                    placeholder="YouTube, Twitter/X, or Reddit URL..."
                    value={contentUrl}
                    onChange={(e) => setContentUrl(e.target.value)}
                    className="input"
                    autoFocus
                  />
                  <div className="flex items-center gap-4 mt-2 text-xs text-text-muted">
                    <span className="flex items-center gap-1"><YoutubeIcon size={12} /> YouTube</span>
                    <span className="flex items-center gap-1"><TwitterIcon size={12} /> Twitter/X</span>
                    <span className="flex items-center gap-1"><RedditIcon size={12} /> Reddit</span>
                  </div>
                </div>

                <button
                  onClick={handleUrlSubmit}
                  disabled={!contentUrl || !detectContentType(contentUrl)}
                  className="btn btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed mb-4"
                >
                  Continue
                </button>

                <div className="flex items-center gap-4 mb-4">
                  <div className="flex-1 h-px bg-surface-700"></div>
                  <span className="text-text-muted text-sm">or</span>
                  <div className="flex-1 h-px bg-surface-700"></div>
                </div>

                {/* Write a Note Button */}
                <button
                  onClick={() => setAddContentStep('note')}
                  className="btn btn-secondary w-full flex items-center justify-center gap-2"
                >
                  <NoteIcon size={20} />
                  Write a note
                </button>
              </>
            )}

            {/* Step: Write Note */}
            {addContentStep === 'note' && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold">Write a note</h3>
                  <button
                    onClick={() => { setAddContentStep('input'); setNoteText(''); }}
                    className="text-text-muted"
                  >
                    <CloseIcon />
                  </button>
                </div>

                <textarea
                  placeholder="Share a thought, reminder, or message..."
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  className="input min-h-[120px] resize-none mb-4"
                  autoFocus
                />

                {/* Optional Due Date */}
                <div className="mb-4">
                  <label className="flex items-center gap-2 text-sm text-text-secondary mb-2">
                    <CalendarIcon size={16} />
                    Due date (optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={noteDueDate}
                    onChange={(e) => setNoteDueDate(e.target.value)}
                    className="input"
                    min={new Date().toISOString().slice(0, 16)}
                  />
                  {noteDueDate && (
                    <button
                      onClick={() => setNoteDueDate('')}
                      className="text-xs text-text-muted hover:text-text-secondary mt-1"
                    >
                      Clear due date
                    </button>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => { setAddContentStep('input'); setNoteText(''); setNoteDueDate(''); }}
                    className="btn btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleNoteSubmit}
                    disabled={!noteText.trim()}
                    className="btn btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Preview
                  </button>
                </div>
              </>
            )}

            {/* Step: Loading */}
            {addContentStep === 'loading' && (
              <div className="py-8 flex flex-col items-center">
                <LoaderIcon />
                <p className="text-text-secondary mt-4">Fetching content details...</p>
              </div>
            )}

            {/* Step: Preview */}
            {addContentStep === 'preview' && detectedType && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold">Add to queue?</h3>
                  <button
                    onClick={() => { setAddContentStep('input'); setContentUrl(''); setNoteText(''); setDetectedType(null); }}
                    className="text-text-muted"
                  >
                    <CloseIcon />
                  </button>
                </div>

                {/* Preview Card - Different for each type */}
                <div className="card p-3 mb-4">
                  {detectedType === 'youtube' && (
                    <div className="flex gap-3">
                      <div className="w-32 h-18 rounded-lg overflow-hidden bg-surface-800 flex-shrink-0">
                        <img
                          src={previewData.youtube.thumbnail}
                          alt={previewData.youtube.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 mb-1">
                          <YoutubeIcon size={12} />
                          <span className="text-red-500 text-xs">YouTube</span>
                        </div>
                        <div className="font-medium text-sm line-clamp-2">{previewData.youtube.title}</div>
                        <div className="text-text-muted text-xs mt-1">{previewData.youtube.channel}</div>
                        <div className="text-text-muted text-xs mt-1 font-mono">{previewData.youtube.duration}</div>
                      </div>
                    </div>
                  )}

                  {detectedType === 'tweet' && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-blue-400/20 flex items-center justify-center text-blue-400">
                          <TwitterIcon size={16} />
                        </div>
                        <div>
                          <div className="font-medium text-sm">{previewData.tweet.tweetAuthor}</div>
                          <div className="text-text-muted text-xs">{previewData.tweet.tweetHandle}</div>
                        </div>
                      </div>
                      <p className="text-sm">{previewData.tweet.tweetContent}</p>
                    </div>
                  )}

                  {detectedType === 'reddit' && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-orange-500"><RedditIcon size={16} /></span>
                        <span className="text-orange-500 text-sm">{previewData.reddit.subreddit}</span>
                      </div>
                      <div className="font-medium text-sm mb-1">{previewData.reddit.redditTitle}</div>
                      <p className="text-text-muted text-xs line-clamp-2">{previewData.reddit.redditBody}</p>
                    </div>
                  )}

                  {detectedType === 'note' && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-gray-400"><NoteIcon size={16} /></span>
                        <span className="text-gray-400 text-sm">Your note</span>
                      </div>
                      <p className="text-sm">{noteText}</p>
                    </div>
                  )}
                </div>

                <div className="text-text-muted text-xs mb-4">
                  This will be added to the end of the queue
                </div>

                <div className="flex gap-3 pb-2">
                  <button
                    onClick={() => { setAddContentStep('input'); setContentUrl(''); setNoteText(''); setDetectedType(null); }}
                    onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); setAddContentStep('input'); setContentUrl(''); setNoteText(''); setDetectedType(null); }}
                    className="btn btn-secondary flex-1 min-h-[52px]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddToQueue}
                    onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); handleAddToQueue(); }}
                    className="btn btn-primary flex-1 min-h-[52px]"
                  >
                    Add to Queue
                  </button>
                </div>
              </>
            )}

            {/* Step: Success */}
            {addContentStep === 'success' && (
              <div className="py-8 flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-teal-500/20 flex items-center justify-center mb-4">
                  <CheckIcon />
                </div>
                <p className="text-text-primary font-semibold">Added to queue!</p>
                <p className="text-text-muted text-sm mt-1">Position #{pendingItems.length + 1}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Queue Item Actions Sheet */}
      {selectedItem && !showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end justify-center z-50">
          <div className="bg-surface-900 w-full max-w-md rounded-t-3xl p-6 bottom-sheet animate-fade-in-up">
            <div className="w-12 h-1 bg-surface-600 rounded-full mx-auto mb-6"></div>

            {/* Item Info */}
            <div className="flex gap-3 mb-6">
              {(() => {
                const badge = getContentTypeBadge(selectedItem.type)
                const BadgeIcon = badge.icon
                return (
                  <>
                    <div className={`w-20 h-12 rounded-lg overflow-hidden flex-shrink-0 ${badge.bg} flex items-center justify-center`}>
                      {selectedItem.type === 'youtube' && selectedItem.thumbnail ? (
                        <img
                          src={selectedItem.thumbnail}
                          alt={selectedItem.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className={badge.color}>
                          <BadgeIcon size={24} />
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{getQueueItemTitle(selectedItem)}</div>
                      <div className="text-text-muted text-xs">Added by {selectedItem.addedBy}</div>
                    </div>
                  </>
                )
              })()}
            </div>

            {/* Actions */}
            <div className="space-y-2 max-h-[50vh] overflow-y-auto">
              {/* Note-specific actions */}
              {selectedItem.type === 'note' && (
                <>
                  <button
                    onClick={() => {
                      toggleComplete(selectedItem.id)
                      setSelectedItem(null)
                    }}
                    onTouchEnd={(e) => {
                      e.stopPropagation()
                      e.preventDefault()
                      toggleComplete(selectedItem.id)
                      setSelectedItem(null)
                    }}
                    className="w-full flex items-center gap-4 p-3 rounded-xl bg-green-900/30 hover:bg-surface-800 transition-colors text-left min-h-[64px]"
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${selectedItem.isCompleted ? 'bg-gray-500/20 text-gray-400' : 'bg-green-500/20 text-green-400'}`}>
                      <CheckCircleIcon size={20} filled={selectedItem.isCompleted} />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{selectedItem.isCompleted ? 'Mark Incomplete' : 'Mark Complete'}</div>
                      <div className="text-text-muted text-xs">{selectedItem.isCompleted ? 'Remove completion status' : 'Mark this note as done'}</div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleViewNote(selectedItem)}
                    className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-surface-800 transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-gray-500/20 flex items-center justify-center text-gray-400">
                      <NoteIcon size={20} />
                    </div>
                    <div>
                      <div className="font-medium">View Note</div>
                      <div className="text-text-muted text-xs">Read the full note</div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleOpenEditNote(selectedItem)}
                    className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-surface-800 transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                      <EditIcon />
                    </div>
                    <div>
                      <div className="font-medium">Edit Note</div>
                      <div className="text-text-muted text-xs">Modify note content</div>
                    </div>
                  </button>

                  <div className="h-px bg-surface-700 my-2"></div>
                </>
              )}

              <button
                onClick={() => handleShowNext(selectedItem.id)}
                className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-surface-800 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-full bg-accent-500/20 flex items-center justify-center text-accent-500">
                  <PlayNextIcon />
                </div>
                <div>
                  <div className="font-medium">Show Next</div>
                  <div className="text-text-muted text-xs">Move to top of queue</div>
                </div>
              </button>

              <button
                onClick={() => handleMoveUp(selectedItem.id)}
                className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-surface-800 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-full bg-surface-700 flex items-center justify-center text-text-secondary">
                  <ArrowUpIcon />
                </div>
                <div>
                  <div className="font-medium">Move Up</div>
                  <div className="text-text-muted text-xs">Move one position earlier</div>
                </div>
              </button>

              <button
                onClick={() => handleMoveDown(selectedItem.id)}
                className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-surface-800 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-full bg-surface-700 flex items-center justify-center text-text-secondary">
                  <ArrowDownIcon />
                </div>
                <div>
                  <div className="font-medium">Move Down</div>
                  <div className="text-text-muted text-xs">Move one position later</div>
                </div>
              </button>

              <div className="h-px bg-surface-700 my-2"></div>

              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-red-500/10 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center text-red-400">
                  <TrashIcon />
                </div>
                <div>
                  <div className="font-medium text-red-400">Remove from Queue</div>
                  <div className="text-text-muted text-xs">Delete this item</div>
                </div>
              </button>
            </div>

            <button
              onClick={() => setSelectedItem(null)}
              className="btn btn-secondary w-full mt-4"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && selectedItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="bg-surface-900 w-full max-w-sm rounded-2xl p-6 animate-fade-in-up">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                <TrashIcon />
              </div>
              <h3 className="text-xl font-bold mb-2">Remove item?</h3>
              <p className="text-text-muted text-sm">
                This item will be removed from the queue.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setShowDeleteConfirm(false); setSelectedItem(null); }}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="btn flex-1 bg-red-500 text-white hover:bg-red-600"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Note Modal */}
      {showViewNote && viewingNote && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end justify-center z-50">
          <div className="bg-surface-900 w-full max-w-md rounded-t-3xl p-6 bottom-sheet animate-fade-in-up max-h-[80vh] flex flex-col">
            <div className="w-12 h-1 bg-surface-600 rounded-full mx-auto mb-6"></div>

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-500/20 flex items-center justify-center text-gray-400">
                  <NoteIcon size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Note</h3>
                  <p className="text-text-muted text-xs">Added by {viewingNote.addedBy}</p>
                </div>
              </div>
              <button
                onClick={() => { setShowViewNote(false); setViewingNote(null); }}
                className="text-text-muted"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="flex-1 overflow-auto">
              <div className="bg-surface-800 rounded-xl p-4">
                <p className="text-lg leading-relaxed whitespace-pre-wrap">{viewingNote.noteContent}</p>
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => {
                  setShowViewNote(false)
                  setViewingNote(null)
                  handleOpenEditNote(viewingNote)
                }}
                className="btn btn-secondary flex-1 flex items-center justify-center gap-2"
              >
                <EditIcon />
                Edit
              </button>
              <button
                onClick={() => { setShowViewNote(false); setViewingNote(null); }}
                className="btn btn-primary flex-1"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Note Modal */}
      {showEditNote && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end justify-center z-50">
          <div className="bg-surface-900 w-full max-w-md rounded-t-3xl p-6 bottom-sheet animate-fade-in-up">
            <div className="w-12 h-1 bg-surface-600 rounded-full mx-auto mb-6"></div>

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                  <EditIcon />
                </div>
                <h3 className="text-xl font-bold">Edit Note</h3>
              </div>
              <button onClick={handleCancelEditNote} className="text-text-muted">
                <CloseIcon />
              </button>
            </div>

            <textarea
              placeholder="Write your note..."
              value={editNoteText}
              onChange={(e) => setEditNoteText(e.target.value)}
              className="input min-h-[150px] resize-none mb-4"
              autoFocus
            />

            <p className="text-text-muted text-xs mb-4">
              {editNoteText.length} characters
            </p>

            <div className="flex gap-3">
              <button
                onClick={handleCancelEditNote}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNote}
                disabled={!editNoteText.trim()}
                className="btn btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface TVModeScreenProps {
  onNavigate: (screen: Screen) => void
  partyId: string
  partyCode: string
}

function TVModeScreen({ onNavigate, partyId, partyCode }: TVModeScreenProps) {
  const { queue, members, partyInfo } = useParty(partyId)

  const currentItem = queue.find(v => v.status === 'showing')
  const upNext = queue.filter(v => v.status === 'pending').slice(0, 3)

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Minimal header - tap to exit */}
      <div
        onClick={() => onNavigate('party')}
        className="absolute top-4 left-4 z-10 bg-black/50 backdrop-blur px-3 py-1.5 rounded-full text-xs text-text-muted cursor-pointer hover:bg-black/70 transition-colors"
      >
        ← Exit TV Mode
      </div>

      {/* Content area - Different display for each type */}
      <div className="flex-1 flex items-center justify-center relative">
        {currentItem?.type === 'youtube' && (
          <>
            <img
              src={currentItem.thumbnail}
              alt={currentItem.title}
              className="w-full h-full object-cover absolute inset-0"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-white/50 text-6xl">▶</div>
            </div>
          </>
        )}

        {currentItem?.type === 'tweet' && (
          <div className="max-w-3xl mx-auto p-8">
            <div className="bg-surface-900/90 backdrop-blur rounded-2xl p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                  <TwitterIcon size={32} />
                </div>
                <div>
                  <div className="text-2xl font-bold">{currentItem.tweetAuthor}</div>
                  <div className="text-text-muted text-lg">{currentItem.tweetHandle}</div>
                </div>
              </div>
              <p className="text-3xl leading-relaxed mb-6">{currentItem.tweetContent}</p>
              <div className="text-text-muted text-lg">{currentItem.tweetTimestamp}</div>
            </div>
          </div>
        )}

        {currentItem?.type === 'reddit' && (
          <div className="max-w-4xl mx-auto p-8">
            <div className="bg-surface-900/90 backdrop-blur rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-500">
                  <RedditIcon size={20} />
                </div>
                <span className="text-orange-500 text-xl font-medium">{currentItem.subreddit}</span>
              </div>
              <h2 className="text-3xl font-bold mb-4">{currentItem.redditTitle}</h2>
              <p className="text-xl text-text-secondary leading-relaxed mb-6">{currentItem.redditBody}</p>
              <div className="flex items-center gap-6 text-text-muted text-lg">
                <span>{currentItem.upvotes?.toLocaleString()} upvotes</span>
                <span>{currentItem.commentCount?.toLocaleString()} comments</span>
              </div>
            </div>
          </div>
        )}

        {currentItem?.type === 'note' && (
          <div className="max-w-3xl mx-auto p-8">
            <div className="bg-surface-900/90 backdrop-blur rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-gray-500/20 flex items-center justify-center text-gray-400">
                  <NoteIcon size={24} />
                </div>
                <span className="text-text-muted text-lg">Note from {currentItem.addedBy}</span>
              </div>
              <p className="text-3xl leading-relaxed">{currentItem.noteContent}</p>
            </div>
          </div>
        )}

        {!currentItem && (
          <div className="text-center text-text-muted">
            <p className="text-2xl">No content showing</p>
            <p className="text-lg mt-2">Add items to the queue to get started</p>
          </div>
        )}
      </div>

      {/* Bottom bar - Now showing + Up next */}
      <div className="bg-gradient-to-t from-black via-black/95 to-transparent p-6 pt-12">
        <div className="flex items-end justify-between gap-8">
          {/* Now showing */}
          <div className="flex-1">
            <div className="text-accent-500 text-xs font-mono mb-1 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-500 animate-pulse"></span>
              NOW SHOWING
            </div>
            <h2 className="text-2xl font-bold">{currentItem ? getQueueItemTitle(currentItem) : 'Nothing playing'}</h2>
            <p className="text-text-muted mt-1">
              {currentItem?.type === 'youtube' && currentItem.channel}
              {currentItem?.type === 'tweet' && currentItem.tweetAuthor}
              {currentItem?.type === 'reddit' && currentItem.subreddit}
              {currentItem?.type === 'note' && `Added by ${currentItem.addedBy}`}
            </p>
          </div>

          {/* Up next */}
          {upNext.length > 0 && (
            <div className="flex-shrink-0">
              <div className="text-text-muted text-xs mb-2">UP NEXT</div>
              <div className="flex gap-2">
                {upNext.map((item) => {
                  const badge = getContentTypeBadge(item.type)
                  const BadgeIcon = badge.icon
                  return (
                    <div key={item.id} className={`w-24 h-14 rounded-lg overflow-hidden ${badge.bg} flex items-center justify-center`}>
                      {item.type === 'youtube' && item.thumbnail ? (
                        <img
                          src={item.thumbnail}
                          alt={item.title}
                          className="w-full h-full object-cover opacity-70"
                        />
                      ) : (
                        <span className={`${badge.color} opacity-70`}>
                          <BadgeIcon size={24} />
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Party info */}
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/10">
          <div className="font-mono text-sm text-text-muted">{partyCode}</div>
          <div className="flex items-center gap-1 text-text-muted text-sm">
            <UsersIcon />
            <span>{members.length}</span>
          </div>
          {partyInfo?.name && (
            <div className="text-text-muted text-sm">{partyInfo.name}</div>
          )}
        </div>
      </div>
    </div>
  )
}

function HistoryScreen({ onNavigate }: { onNavigate: (screen: Screen) => void }) {
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

      <div className="space-y-3">
        {mockPastParties.map((party, index) => (
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
    </div>
  )
}

// Main App Content
function AppContent() {
  // Use lazy initialization to restore state from localStorage
  const [currentScreen, setCurrentScreen] = useState<Screen>(() => {
    const savedParty = getCurrentParty()
    return savedParty ? 'party' : 'home'
  })
  const [currentPartyId, setCurrentPartyId] = useState<string | null>(() => {
    const savedParty = getCurrentParty()
    return savedParty?.partyId ?? null
  })
  const [currentPartyCode, setCurrentPartyCode] = useState<string | null>(() => {
    const savedParty = getCurrentParty()
    return savedParty?.partyCode ?? null
  })
  const { isLoading: authLoading } = useAuth()

  const handlePartyCreated = (partyId: string, partyCode: string) => {
    setCurrentPartyId(partyId)
    setCurrentPartyCode(partyCode)
    setCurrentScreen('party')
  }

  const handlePartyJoined = (partyId: string, partyCode: string) => {
    setCurrentPartyId(partyId)
    setCurrentPartyCode(partyCode)
    setCurrentScreen('party')
  }

  const handleLeaveParty = () => {
    setCurrentPartyId(null)
    setCurrentPartyCode(null)
    setCurrentScreen('home')
  }

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="container-mobile bg-gradient-party flex flex-col items-center justify-center">
        <LoaderIcon />
        <p className="text-text-muted mt-4">Loading...</p>
      </div>
    )
  }

  const screens: Record<Screen, React.ReactNode> = {
    home: <HomeScreen onNavigate={setCurrentScreen} />,
    login: <LoginScreen onNavigate={setCurrentScreen} />,
    signup: <SignupScreen onNavigate={setCurrentScreen} />,
    create: <CreatePartyScreen onNavigate={setCurrentScreen} onPartyCreated={handlePartyCreated} />,
    join: <JoinPartyScreen onNavigate={setCurrentScreen} onPartyJoined={handlePartyJoined} />,
    party: currentPartyId && currentPartyCode ? (
      <PartyRoomScreen
        onNavigate={setCurrentScreen}
        partyId={currentPartyId}
        partyCode={currentPartyCode}
        onLeaveParty={handleLeaveParty}
      />
    ) : (
      <HomeScreen onNavigate={setCurrentScreen} />
    ),
    tv: currentPartyId && currentPartyCode ? (
      <TVModeScreen
        onNavigate={setCurrentScreen}
        partyId={currentPartyId}
        partyCode={currentPartyCode}
      />
    ) : (
      <HomeScreen onNavigate={setCurrentScreen} />
    ),
    history: <HistoryScreen onNavigate={setCurrentScreen} />,
  }

  return screens[currentScreen]
}

// Main App with AuthProvider wrapper
function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
