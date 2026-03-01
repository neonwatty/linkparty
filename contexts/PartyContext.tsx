'use client'

import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { useParty } from '@/hooks/useParty'

type PartyContextType = ReturnType<typeof useParty>

const PartyContext = createContext<PartyContextType | undefined>(undefined)

export function PartyProvider({ partyId, children }: { partyId: string; children: ReactNode }) {
  const party = useParty(partyId)
  const memoizedValue = useMemo(
    () => party,
    [
      party.queue,
      party.members,
      party.partyInfo,
      party.isLoading,
      party.error,
      party.syncingItemIds,
      party.lastConflict,
    ],
  )
  return <PartyContext.Provider value={memoizedValue}>{children}</PartyContext.Provider>
}

export function usePartyContext() {
  const context = useContext(PartyContext)
  if (context === undefined) {
    throw new Error('usePartyContext must be used within a PartyProvider')
  }
  return context
}
