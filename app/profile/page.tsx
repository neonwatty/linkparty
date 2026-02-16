'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { ChevronLeftIcon } from '@/components/icons'
import { TwinklingStars } from '@/components/ui/TwinklingStars'
import ProfileTabs from '@/components/profile/ProfileTabs'

export default function ProfilePage() {
  useEffect(() => {
    document.title = 'Profile | Link Party'
  }, [])

  return (
    <div className="container-mobile bg-gradient-party min-h-dvh px-6 py-8 relative">
      <TwinklingStars count={25} />

      {/* Back button */}
      <Link
        href="/"
        className="btn-ghost p-2 -ml-2 w-fit rounded-full mb-8 block relative z-10"
        aria-label="Go back to home"
      >
        <ChevronLeftIcon />
      </Link>

      <div className="relative z-10">
        <h1 className="text-3xl font-bold mb-6" style={{ fontFamily: 'var(--font-display)' }}>
          Profile
        </h1>

        <ProfileTabs />
      </div>
    </div>
  )
}
