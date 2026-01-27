import { useState } from 'react'
import './App.css'
import { getCurrentParty } from './lib/supabase'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import type { Screen } from './types'
import { LoaderIcon } from './components/icons'
import {
  HomeScreen,
  LoginScreen,
  SignupScreen,
  ResetPasswordScreen,
  CreatePartyScreen,
  JoinPartyScreen,
  PartyRoomScreen,
  TVModeScreen,
  HistoryScreen,
} from './components/screens'

// Main App Content
function AppContent() {
  // Check for join code in URL parameters
  const [joinCodeFromUrl] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search)
    const joinCode = params.get('join') || ''
    // Clean up the URL parameter after extracting
    if (joinCode) {
      window.history.replaceState(null, '', window.location.pathname)
    }
    return joinCode
  })

  // Use lazy initialization to restore state from localStorage
  const [currentScreen, setCurrentScreen] = useState<Screen>(() => {
    // Check for password reset URL parameter (Supabase sends type=recovery)
    const hash = window.location.hash
    if (hash.includes('type=recovery')) {
      // Clean up the URL hash after detecting recovery
      window.history.replaceState(null, '', window.location.pathname)
      return 'reset-password'
    }
    // Check for join code in URL - navigate to join screen
    const params = new URLSearchParams(window.location.search)
    if (params.get('join')) {
      return 'join'
    }
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
    join: <JoinPartyScreen onNavigate={setCurrentScreen} onPartyJoined={handlePartyJoined} initialCode={joinCodeFromUrl} />,
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
    'reset-password': <ResetPasswordScreen onNavigate={setCurrentScreen} />,
  }

  return screens[currentScreen]
}

// Main App with AuthProvider wrapper and ErrorBoundary
function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App
