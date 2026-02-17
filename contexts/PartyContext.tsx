'use client'

import { createContext, useContext, type ReactNode } from 'react'
import { useParty } from '@/hooks/useParty'

type PartyContextType = ReturnType<typeof useParty>

const PartyContext = createContext<PartyContextType | undefined>(undefined)

export function PartyProvider({ partyId, children }: { partyId: string; children: ReactNode }) {
  const party = useParty(partyId)
  return <PartyContext.Provider value={party}>{children}</PartyContext.Provider>
}

export function usePartyContext() {
  const context = useContext(PartyContext)
  if (context === undefined) {
    throw new Error('usePartyContext must be used within a PartyProvider')
  }
  return context
}
