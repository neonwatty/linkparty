import { useState } from 'react'
import './App.css'

// Icons as simple SVG components
const PlayIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M8 5v14l11-7z"/>
  </svg>
)

const PauseIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
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

// Types
type Screen = 'home' | 'login' | 'signup' | 'create' | 'join' | 'party' | 'tv' | 'history'

interface QueueItem {
  id: string
  title: string
  channel: string
  duration: string
  thumbnail: string
  addedBy: string
  status: 'pending' | 'playing' | 'played'
}

interface PartyMember {
  id: string
  name: string
  avatar: string
  isHost: boolean
}

// Mock data
const mockQueue: QueueItem[] = [
  {
    id: '1',
    title: 'The Most Satisfying Video in the World',
    channel: 'SatisfyingClips',
    duration: '10:24',
    thumbnail: 'https://picsum.photos/seed/vid1/160/90',
    addedBy: 'Alex',
    status: 'playing'
  },
  {
    id: '2',
    title: 'Cooking the Perfect Steak - Gordon Ramsay',
    channel: 'Gordon Ramsay',
    duration: '8:15',
    thumbnail: 'https://picsum.photos/seed/vid2/160/90',
    addedBy: 'Sam',
    status: 'pending'
  },
  {
    id: '3',
    title: 'Why This Japanese Knife Costs $10,000',
    channel: 'Veritasium',
    duration: '15:42',
    thumbnail: 'https://picsum.photos/seed/vid3/160/90',
    addedBy: 'Jordan',
    status: 'pending'
  },
  {
    id: '4',
    title: 'The Strangest Things Found in the Ocean',
    channel: 'Kurzgesagt',
    duration: '12:08',
    thumbnail: 'https://picsum.photos/seed/vid4/160/90',
    addedBy: 'You',
    status: 'pending'
  },
]

const mockMembers: PartyMember[] = [
  { id: '1', name: 'You', avatar: '🎉', isHost: true },
  { id: '2', name: 'Alex', avatar: '🎸', isHost: false },
  { id: '3', name: 'Sam', avatar: '🎮', isHost: false },
  { id: '4', name: 'Jordan', avatar: '🎨', isHost: false },
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
            WATCH TOGETHER
          </div>
          <h1 className="text-5xl font-bold leading-tight mb-4">
            Party<br />Queue
          </h1>
          <p className="text-text-secondary text-lg mb-12 max-w-xs">
            Share videos at parties without the chaos. Everyone queues, host controls.
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
  return (
    <div className="container-mobile bg-gradient-party flex flex-col px-6 py-8">
      {/* Back button */}
      <button
        onClick={() => onNavigate('home')}
        className="btn-ghost p-2 -ml-2 w-fit rounded-full mb-8"
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

        {/* OAuth buttons */}
        <div className="space-y-3 mb-8 animate-fade-in-up opacity-0 delay-200">
          <button className="btn btn-secondary w-full flex items-center justify-center gap-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"/>
            </svg>
            Continue with Google
          </button>
          <button className="btn btn-secondary w-full flex items-center justify-center gap-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.71,19.5C17.88,20.74 17,21.95 15.66,21.97C14.32,22 13.89,21.18 12.37,21.18C10.84,21.18 10.37,21.95 9.1,22C7.79,22.05 6.8,20.68 5.96,19.47C4.25,17 2.94,12.45 4.7,9.39C5.57,7.87 7.13,6.91 8.82,6.88C10.1,6.86 11.32,7.75 12.11,7.75C12.89,7.75 14.37,6.68 15.92,6.84C16.57,6.87 18.39,7.1 19.56,8.82C19.47,8.88 17.39,10.1 17.41,12.63C17.44,15.65 20.06,16.66 20.09,16.67C20.06,16.74 19.67,18.11 18.71,19.5M13,3.5C13.73,2.67 14.94,2.04 15.94,2C16.07,3.17 15.6,4.35 14.9,5.19C14.21,6.04 13.07,6.7 11.95,6.61C11.8,5.46 12.36,4.26 13,3.5Z"/>
            </svg>
            Continue with Apple
          </button>
        </div>

        <div className="flex items-center gap-4 mb-8 animate-fade-in-up opacity-0 delay-300">
          <div className="flex-1 h-px bg-surface-700"></div>
          <span className="text-text-muted text-sm">or</span>
          <div className="flex-1 h-px bg-surface-700"></div>
        </div>

        {/* Email form */}
        <div className="space-y-4 animate-fade-in-up opacity-0 delay-400">
          <input
            type="email"
            placeholder="Email address"
            className="input"
          />
          <input
            type="password"
            placeholder="Password"
            className="input"
          />
          <button
            onClick={() => onNavigate('home')}
            className="btn btn-primary w-full"
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
  return (
    <div className="container-mobile bg-gradient-party flex flex-col px-6 py-8">
      <button
        onClick={() => onNavigate('home')}
        className="btn-ghost p-2 -ml-2 w-fit rounded-full mb-8"
      >
        <ChevronLeftIcon />
      </button>

      <div className="flex-1 flex flex-col">
        <h1 className="text-3xl font-bold mb-2 animate-fade-in-up opacity-0">
          Create account
        </h1>
        <p className="text-text-secondary mb-8 animate-fade-in-up opacity-0 delay-100">
          Join parties and share videos with friends
        </p>

        <div className="space-y-3 mb-8 animate-fade-in-up opacity-0 delay-200">
          <button className="btn btn-secondary w-full flex items-center justify-center gap-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"/>
            </svg>
            Continue with Google
          </button>
          <button className="btn btn-secondary w-full flex items-center justify-center gap-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.71,19.5C17.88,20.74 17,21.95 15.66,21.97C14.32,22 13.89,21.18 12.37,21.18C10.84,21.18 10.37,21.95 9.1,22C7.79,22.05 6.8,20.68 5.96,19.47C4.25,17 2.94,12.45 4.7,9.39C5.57,7.87 7.13,6.91 8.82,6.88C10.1,6.86 11.32,7.75 12.11,7.75C12.89,7.75 14.37,6.68 15.92,6.84C16.57,6.87 18.39,7.1 19.56,8.82C19.47,8.88 17.39,10.1 17.41,12.63C17.44,15.65 20.06,16.66 20.09,16.67C20.06,16.74 19.67,18.11 18.71,19.5M13,3.5C13.73,2.67 14.94,2.04 15.94,2C16.07,3.17 15.6,4.35 14.9,5.19C14.21,6.04 13.07,6.7 11.95,6.61C11.8,5.46 12.36,4.26 13,3.5Z"/>
            </svg>
            Continue with Apple
          </button>
        </div>

        <div className="flex items-center gap-4 mb-8 animate-fade-in-up opacity-0 delay-300">
          <div className="flex-1 h-px bg-surface-700"></div>
          <span className="text-text-muted text-sm">or</span>
          <div className="flex-1 h-px bg-surface-700"></div>
        </div>

        <div className="space-y-4 animate-fade-in-up opacity-0 delay-400">
          <input type="text" placeholder="Display name" className="input" />
          <input type="email" placeholder="Email address" className="input" />
          <input type="password" placeholder="Password" className="input" />
          <button
            onClick={() => onNavigate('home')}
            className="btn btn-primary w-full"
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

function CreatePartyScreen({ onNavigate }: { onNavigate: (screen: Screen) => void }) {
  const [partyName, setPartyName] = useState('')

  return (
    <div className="container-mobile bg-gradient-party flex flex-col px-6 py-8">
      <button
        onClick={() => onNavigate('home')}
        className="btn-ghost p-2 -ml-2 w-fit rounded-full mb-8"
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
              Party name (optional)
            </label>
            <input
              type="text"
              placeholder="Saturday Night Hangout"
              value={partyName}
              onChange={(e) => setPartyName(e.target.value)}
              className="input"
            />
          </div>

          {/* Settings preview */}
          <div className="card p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Queue limit</div>
                <div className="text-xs text-text-muted">Max videos in queue</div>
              </div>
              <div className="bg-surface-700 px-3 py-1.5 rounded-lg font-mono text-sm">
                100
              </div>
            </div>
            <div className="h-px bg-surface-700"></div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Rate limit</div>
                <div className="text-xs text-text-muted">Videos per person/minute</div>
              </div>
              <div className="bg-surface-700 px-3 py-1.5 rounded-lg font-mono text-sm">
                5
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigate('party')}
            className="btn btn-primary w-full text-lg mt-4"
          >
            Create Party
          </button>
        </div>
      </div>
    </div>
  )
}

function JoinPartyScreen({ onNavigate }: { onNavigate: (screen: Screen) => void }) {
  const [code, setCode] = useState('')

  return (
    <div className="container-mobile bg-gradient-party flex flex-col px-6 py-8">
      <button
        onClick={() => onNavigate('home')}
        className="btn-ghost p-2 -ml-2 w-fit rounded-full mb-8"
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
              Party code
            </label>
            <input
              type="text"
              placeholder="ABC123"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={6}
              className="input text-center text-2xl font-mono tracking-[0.3em] uppercase"
            />
          </div>

          <button
            onClick={() => onNavigate('party')}
            className="btn btn-primary w-full text-lg"
            disabled={code.length !== 6}
          >
            Join Party
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

// Add Video Modal States
type AddVideoStep = 'input' | 'loading' | 'preview' | 'success'

function PartyRoomScreen({ onNavigate }: { onNavigate: (screen: Screen) => void }) {
  const [isPlaying, setIsPlaying] = useState(true)
  const [showAddVideo, setShowAddVideo] = useState(false)
  const [addVideoStep, setAddVideoStep] = useState<AddVideoStep>('input')
  const [videoUrl, setVideoUrl] = useState('')
  const [selectedVideo, setSelectedVideo] = useState<QueueItem | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [queue, setQueue] = useState(mockQueue)

  const currentVideo = queue.find(v => v.status === 'playing')
  const pendingVideos = queue.filter(v => v.status === 'pending')

  // Simulated video preview data
  const previewVideo = {
    title: 'How to Make Perfect Homemade Pizza',
    channel: 'Joshua Weissman',
    duration: '18:42',
    thumbnail: 'https://picsum.photos/seed/pizza/320/180',
  }

  const handleUrlSubmit = () => {
    if (videoUrl.includes('youtube') || videoUrl.includes('youtu.be')) {
      setAddVideoStep('loading')
      // Simulate API call
      setTimeout(() => setAddVideoStep('preview'), 1500)
    }
  }

  const handleAddToQueue = () => {
    setAddVideoStep('success')
    setTimeout(() => {
      setShowAddVideo(false)
      setAddVideoStep('input')
      setVideoUrl('')
    }, 1500)
  }

  const handleMoveUp = (videoId: string) => {
    const index = queue.findIndex(v => v.id === videoId)
    if (index > 1) { // Can't move above currently playing
      const newQueue = [...queue]
      ;[newQueue[index], newQueue[index - 1]] = [newQueue[index - 1], newQueue[index]]
      setQueue(newQueue)
    }
    setSelectedVideo(null)
  }

  const handleMoveDown = (videoId: string) => {
    const index = queue.findIndex(v => v.id === videoId)
    if (index < queue.length - 1) {
      const newQueue = [...queue]
      ;[newQueue[index], newQueue[index + 1]] = [newQueue[index + 1], newQueue[index]]
      setQueue(newQueue)
    }
    setSelectedVideo(null)
  }

  const handleDelete = () => {
    if (selectedVideo) {
      setQueue(queue.filter(v => v.id !== selectedVideo.id))
      setShowDeleteConfirm(false)
      setSelectedVideo(null)
    }
  }

  const handlePlayNext = (videoId: string) => {
    const video = queue.find(v => v.id === videoId)
    if (video) {
      const newQueue = queue.filter(v => v.id !== videoId)
      const playingIndex = newQueue.findIndex(v => v.status === 'playing')
      newQueue.splice(playingIndex + 1, 0, video)
      setQueue(newQueue)
    }
    setSelectedVideo(null)
  }

  return (
    <div className="container-mobile bg-surface-950 flex flex-col min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-800">
        <button
          onClick={() => onNavigate('home')}
          className="btn-ghost p-2 -ml-2 rounded-full"
        >
          <ChevronLeftIcon />
        </button>
        <div className="text-center">
          <div className="font-semibold">Saturday Hangout</div>
          <div className="text-xs text-text-muted font-mono">PARTY-X7K</div>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => onNavigate('tv')}
            className="btn-ghost p-2 rounded-full"
            title="TV Mode"
          >
            <TvIcon />
          </button>
          <button className="btn-ghost p-2 rounded-full">
            <ShareIcon />
          </button>
        </div>
      </div>

      {/* Now Playing */}
      {currentVideo && (
        <div className="p-4 bg-gradient-to-b from-surface-900 to-surface-950">
          <div className="text-xs text-accent-500 font-mono mb-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent-500 animate-pulse"></span>
            NOW PLAYING
          </div>

          {/* Video Player Placeholder */}
          <div className="relative aspect-video bg-surface-800 rounded-xl overflow-hidden mb-4 glow-accent">
            <img
              src={currentVideo.thumbnail}
              alt={currentVideo.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                {isPlaying ? <PauseIcon /> : <PlayIcon />}
              </div>
            </div>
            {/* Progress bar */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-surface-700">
              <div className="h-full w-[35%] bg-accent-500"></div>
            </div>
          </div>

          {/* Video Info & Controls */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-lg truncate">{currentVideo.title}</h2>
              <p className="text-text-muted text-sm">{currentVideo.channel}</p>
            </div>
          </div>

          {/* Playback Controls */}
          <div className="flex items-center justify-center gap-6 mt-4">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-14 h-14 rounded-full bg-accent-500 flex items-center justify-center hover:bg-accent-400 transition-colors"
            >
              {isPlaying ? <PauseIcon /> : <PlayIcon />}
            </button>
            <button className="w-12 h-12 rounded-full bg-surface-700 flex items-center justify-center hover:bg-surface-600 transition-colors">
              <SkipIcon />
            </button>
          </div>
        </div>
      )}

      {/* Members */}
      <div className="px-4 py-3 border-b border-surface-800">
        <div className="flex items-center gap-2 text-text-secondary text-sm">
          <UsersIcon />
          <span>{mockMembers.length} watching</span>
        </div>
        <div className="flex gap-2 mt-2">
          {mockMembers.map(member => (
            <div
              key={member.id}
              className="flex items-center gap-1.5 bg-surface-800 px-2 py-1 rounded-full text-sm"
            >
              <span>{member.avatar}</span>
              <span>{member.name}</span>
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
            Up next · {pendingVideos.length} videos
          </div>
          <div className="text-xs text-text-muted">Tap to edit</div>
        </div>

        <div className="px-4 pb-24">
          {pendingVideos.map((video, index) => (
            <div
              key={video.id}
              onClick={() => setSelectedVideo(video)}
              className="queue-item cursor-pointer active:bg-surface-700"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <DragIcon />
              <div className="relative w-20 h-12 rounded-lg overflow-hidden bg-surface-800 flex-shrink-0">
                <img
                  src={video.thumbnail}
                  alt={video.title}
                  className="w-full h-full object-cover"
                />
                {video.addedBy === 'You' && (
                  <div className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-teal-500"></div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{video.title}</div>
                <div className="text-text-muted text-xs flex items-center gap-2">
                  <span>{video.duration}</span>
                  <span>·</span>
                  <span>Added by {video.addedBy}</span>
                </div>
              </div>
              <div className="text-text-muted">
                <EditIcon />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Video FAB */}
      <button
        onClick={() => setShowAddVideo(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-accent-500 flex items-center justify-center shadow-lg hover:bg-accent-400 transition-all hover:scale-105 animate-pulse-glow"
      >
        <PlusIcon />
      </button>

      {/* Add Video Modal - Enhanced */}
      {showAddVideo && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end justify-center z-50">
          <div className="bg-surface-900 w-full max-w-md rounded-t-3xl p-6 animate-fade-in-up">
            <div className="w-12 h-1 bg-surface-600 rounded-full mx-auto mb-6"></div>

            {/* Step: Input URL */}
            {addVideoStep === 'input' && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold">Add a video</h3>
                  <button onClick={() => setShowAddVideo(false)} className="text-text-muted">
                    <CloseIcon />
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Paste YouTube URL..."
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  className="input mb-4"
                  autoFocus
                />
                <p className="text-text-muted text-xs mb-4">
                  Paste a YouTube link to add it to the queue
                </p>
                <button
                  onClick={handleUrlSubmit}
                  disabled={!videoUrl}
                  className="btn btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
                </button>
              </>
            )}

            {/* Step: Loading */}
            {addVideoStep === 'loading' && (
              <div className="py-8 flex flex-col items-center">
                <LoaderIcon />
                <p className="text-text-secondary mt-4">Fetching video details...</p>
              </div>
            )}

            {/* Step: Preview */}
            {addVideoStep === 'preview' && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold">Add to queue?</h3>
                  <button
                    onClick={() => { setAddVideoStep('input'); setVideoUrl(''); }}
                    className="text-text-muted"
                  >
                    <CloseIcon />
                  </button>
                </div>

                {/* Video Preview Card */}
                <div className="card p-3 mb-4">
                  <div className="flex gap-3">
                    <div className="w-32 h-18 rounded-lg overflow-hidden bg-surface-800 flex-shrink-0">
                      <img
                        src={previewVideo.thumbnail}
                        alt={previewVideo.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm line-clamp-2">{previewVideo.title}</div>
                      <div className="text-text-muted text-xs mt-1">{previewVideo.channel}</div>
                      <div className="text-text-muted text-xs mt-1 font-mono">{previewVideo.duration}</div>
                    </div>
                  </div>
                </div>

                <div className="text-text-muted text-xs mb-4">
                  This video will be added to the end of the queue
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => { setAddVideoStep('input'); setVideoUrl(''); }}
                    className="btn btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddToQueue}
                    className="btn btn-primary flex-1"
                  >
                    Add to Queue
                  </button>
                </div>
              </>
            )}

            {/* Step: Success */}
            {addVideoStep === 'success' && (
              <div className="py-8 flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-teal-500/20 flex items-center justify-center mb-4">
                  <CheckIcon />
                </div>
                <p className="text-text-primary font-semibold">Added to queue!</p>
                <p className="text-text-muted text-sm mt-1">Position #{pendingVideos.length + 1}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Queue Item Actions Sheet */}
      {selectedVideo && !showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end justify-center z-50">
          <div className="bg-surface-900 w-full max-w-md rounded-t-3xl p-6 animate-fade-in-up">
            <div className="w-12 h-1 bg-surface-600 rounded-full mx-auto mb-6"></div>

            {/* Video Info */}
            <div className="flex gap-3 mb-6">
              <div className="w-20 h-12 rounded-lg overflow-hidden bg-surface-800 flex-shrink-0">
                <img
                  src={selectedVideo.thumbnail}
                  alt={selectedVideo.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{selectedVideo.title}</div>
                <div className="text-text-muted text-xs">Added by {selectedVideo.addedBy}</div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <button
                onClick={() => handlePlayNext(selectedVideo.id)}
                className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-surface-800 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-full bg-accent-500/20 flex items-center justify-center text-accent-500">
                  <PlayNextIcon />
                </div>
                <div>
                  <div className="font-medium">Play Next</div>
                  <div className="text-text-muted text-xs">Move to top of queue</div>
                </div>
              </button>

              <button
                onClick={() => handleMoveUp(selectedVideo.id)}
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
                onClick={() => handleMoveDown(selectedVideo.id)}
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
                  <div className="text-text-muted text-xs">Delete this video</div>
                </div>
              </button>
            </div>

            <button
              onClick={() => setSelectedVideo(null)}
              className="btn btn-secondary w-full mt-4"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && selectedVideo && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="bg-surface-900 w-full max-w-sm rounded-2xl p-6 animate-fade-in-up">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                <TrashIcon />
              </div>
              <h3 className="text-xl font-bold mb-2">Remove video?</h3>
              <p className="text-text-muted text-sm">
                "{selectedVideo.title}" will be removed from the queue.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setShowDeleteConfirm(false); setSelectedVideo(null); }}
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
    </div>
  )
}

function TVModeScreen({ onNavigate }: { onNavigate: (screen: Screen) => void }) {
  const currentVideo = mockQueue.find(v => v.status === 'playing')
  const upNext = mockQueue.filter(v => v.status === 'pending').slice(0, 3)

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Minimal header - tap to exit */}
      <div
        onClick={() => onNavigate('party')}
        className="absolute top-4 left-4 z-10 bg-black/50 backdrop-blur px-3 py-1.5 rounded-full text-xs text-text-muted cursor-pointer hover:bg-black/70 transition-colors"
      >
        ← Exit TV Mode
      </div>

      {/* Video area */}
      <div className="flex-1 flex items-center justify-center relative">
        {currentVideo && (
          <>
            <img
              src={currentVideo.thumbnail}
              alt={currentVideo.title}
              className="w-full h-full object-cover absolute inset-0"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-white/50 text-6xl">▶</div>
            </div>
          </>
        )}

        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
          <div className="h-full w-[35%] bg-accent-500"></div>
        </div>
      </div>

      {/* Bottom bar - Now playing + Up next */}
      <div className="bg-gradient-to-t from-black via-black/95 to-transparent p-6 pt-12">
        <div className="flex items-end justify-between gap-8">
          {/* Now playing */}
          <div className="flex-1">
            <div className="text-accent-500 text-xs font-mono mb-1 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-500 animate-pulse"></span>
              NOW PLAYING
            </div>
            <h2 className="text-2xl font-bold">{currentVideo?.title}</h2>
            <p className="text-text-muted mt-1">{currentVideo?.channel}</p>
          </div>

          {/* Up next */}
          <div className="flex-shrink-0">
            <div className="text-text-muted text-xs mb-2">UP NEXT</div>
            <div className="flex gap-2">
              {upNext.map((video) => (
                <div key={video.id} className="w-24 h-14 rounded-lg overflow-hidden bg-surface-800">
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-full h-full object-cover opacity-70"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Party info */}
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/10">
          <div className="font-mono text-sm text-text-muted">PARTY-X7K</div>
          <div className="flex items-center gap-1 text-text-muted text-sm">
            <UsersIcon />
            <span>{mockMembers.length}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function HistoryScreen({ onNavigate }: { onNavigate: (screen: Screen) => void }) {
  const pastParties = [
    { id: '1', name: 'Game Night', date: 'Jan 10, 2025', members: 6, videos: 24 },
    { id: '2', name: 'New Years Eve', date: 'Dec 31, 2024', members: 12, videos: 45 },
    { id: '3', name: 'Movie Club', date: 'Dec 28, 2024', members: 4, videos: 8 },
    { id: '4', name: 'Thanksgiving', date: 'Nov 28, 2024', members: 8, videos: 31 },
  ]

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
        {pastParties.map((party, index) => (
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
                <div className="text-text-secondary">{party.videos} videos</div>
                <div className="text-text-muted">{party.members} people</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Main App
function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home')

  const screens: Record<Screen, React.ReactNode> = {
    home: <HomeScreen onNavigate={setCurrentScreen} />,
    login: <LoginScreen onNavigate={setCurrentScreen} />,
    signup: <SignupScreen onNavigate={setCurrentScreen} />,
    create: <CreatePartyScreen onNavigate={setCurrentScreen} />,
    join: <JoinPartyScreen onNavigate={setCurrentScreen} />,
    party: <PartyRoomScreen onNavigate={setCurrentScreen} />,
    tv: <TVModeScreen onNavigate={setCurrentScreen} />,
    history: <HistoryScreen onNavigate={setCurrentScreen} />,
  }

  return screens[currentScreen]
}

export default App
