'use client'

import { useAuth } from '@/contexts/AuthContext'
import { AppHome, LandingPage } from '@/components/landing'
import { LoaderIcon } from '@/components/icons'

export default function HomePage() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="container-mobile bg-gradient-party flex items-center justify-center">
        <LoaderIcon />
      </div>
    )
  }

  return isAuthenticated ? <AppHome /> : <LandingPage />
}
