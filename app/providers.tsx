'use client'

import { AuthProvider } from '@/contexts/AuthContext'
import { ErrorProvider } from '@/contexts/ErrorContext'
import { ServiceWorkerRegistration } from '@/components/ServiceWorkerRegistration'

interface ProvidersProps {
  children: React.ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ErrorProvider>
      <AuthProvider>
        <ServiceWorkerRegistration />
        {children}
      </AuthProvider>
    </ErrorProvider>
  )
}
