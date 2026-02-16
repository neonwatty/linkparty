'use client'

import { AuthProvider } from '@/contexts/AuthContext'
import { ErrorProvider } from '@/contexts/ErrorContext'
import { ServiceWorkerRegistration } from '@/components/ServiceWorkerRegistration'
import { OfflineIndicator } from '@/components/ui/OfflineIndicator'
import { InstallPrompt } from '@/components/ui/InstallPrompt'

interface ProvidersProps {
  children: React.ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ErrorProvider>
      <AuthProvider>
        <ServiceWorkerRegistration />
        <OfflineIndicator />
        <InstallPrompt />
        {children}
      </AuthProvider>
    </ErrorProvider>
  )
}
