'use client'

import { useParams } from 'next/navigation'
import { PartyProvider } from '@/contexts/PartyContext'

export default function PartyLayout({ children }: { children: React.ReactNode }) {
  const params = useParams()
  const partyId = params.id as string

  return <PartyProvider partyId={partyId}>{children}</PartyProvider>
}
