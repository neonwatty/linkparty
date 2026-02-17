'use client'

import { useMemo } from 'react'

interface TwinklingStarsProps {
  count?: number
}

export function TwinklingStars({ count = 35 }: TwinklingStarsProps) {
  const stars = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        bright: Math.random() > 0.7,
        duration: `${2 + Math.random() * 4}s`,
        delay: `${Math.random() * 5}s`,
      })),
    [count],
  )

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
