'use client'

import { useRef } from 'react'

function generateStars(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    bright: Math.random() > 0.7,
    duration: `${2 + Math.random() * 4}s`,
    delay: `${Math.random() * 5}s`,
  }))
}

interface TwinklingStarsProps {
  count?: number
}

export function TwinklingStars({ count = 35 }: TwinklingStarsProps) {
  const starsRef = useRef<ReturnType<typeof generateStars> | null>(null)
  if (!starsRef.current) {
    starsRef.current = generateStars(count)
  }
  const stars = starsRef.current

  return (
    <div className="stars-container">
      {stars.map((star) => (
        <div
          key={star.id}
          className={`star ${star.bright ? 'bright' : ''}`}
          style={
            {
              left: star.left,
              top: star.top,
              '--duration': star.duration,
              '--delay': star.delay,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  )
}
