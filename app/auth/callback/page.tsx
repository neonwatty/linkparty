'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const getRedirectPath = () => {
      // Check URL params first (set by emailRedirectTo in signUpWithEmail)
      const urlParams = new URLSearchParams(window.location.search)
      const urlRedirect = urlParams.get('redirect')
      if (urlRedirect && urlRedirect.startsWith('/') && !urlRedirect.startsWith('//')) {
        sessionStorage.removeItem('auth-redirect')
        return urlRedirect
      }

      // Fall back to sessionStorage (set by login/signup pages for OAuth flow)
      const savedRedirect = sessionStorage.getItem('auth-redirect')
      if (savedRedirect) {
        sessionStorage.removeItem('auth-redirect')
      }
      return savedRedirect && savedRedirect.startsWith('/') && !savedRedirect.startsWith('//') ? savedRedirect : '/'
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        router.replace(getRedirectPath())
      }
    })

    // Fallback: if the session is already set by the time this runs
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace(getRedirectPath())
      }
    })

    // Timeout fallback — if nothing happens after 5s, redirect to login
    const timeout = setTimeout(() => {
      router.replace('/login?error=auth')
    }, 5000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-lg text-white/60">Signing in...</p>
    </div>
  )
}
