'use client'

import { useState, useEffect } from 'react'

interface ExpirationBadgeProps {
  expiresAt: string
}

function getTimeRemaining(expiresAt: string) {
  const diff = new Date(expiresAt).getTime() - Date.now()
  if (diff <= 0) return { expired: true, hours: 0, minutes: 0, label: 'Expired', color: 'text-red-400' }

  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  let label: string
  let color: string

  if (hours >= 6) {
    label = `${hours}h left`
    color = 'text-text-muted'
  } else if (hours >= 1) {
    label = `${hours}h ${minutes}m left`
    color = 'text-yellow-400'
  } else if (minutes > 0) {
    label = `${minutes}m left`
    color = 'text-red-400'
  } else {
    label = '<1m left'
    color = 'text-red-400'
  }

  return { expired: false, hours, minutes, label, color }
}

export function ExpirationBadge({ expiresAt }: ExpirationBadgeProps) {
  const [time, setTime] = useState(() => getTimeRemaining(expiresAt))

  useEffect(() => {
    setTime(getTimeRemaining(expiresAt))
    const interval = setInterval(() => {
      setTime(getTimeRemaining(expiresAt))
    }, 60_000)
    return () => clearInterval(interval)
  }, [expiresAt])

  return (
    <span
      className={`text-xs ${time.color}`}
      aria-label={`Party ${time.expired ? 'has expired' : 'expires in ' + time.label}`}
    >
      {time.label}
    </span>
  )
}
