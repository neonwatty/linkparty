import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { HomeView } from '@/components/landing'

export default async function HomePage() {
  const cookieStore = await cookies()

  // Check E2E mock auth (only active when E2E_MOCK_AUTH env var is set)
  if (process.env.E2E_MOCK_AUTH) {
    const hasFakeAuth = cookieStore.getAll().some((c) => c.name.includes('mock-auth-token'))
    if (hasFakeAuth) return <HomeView isAuthenticated={true} />
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const isMockMode = !supabaseUrl || supabaseUrl.includes('placeholder') || !supabaseAnonKey

  // In mock mode, check for auth-token cookie (same as middleware)
  if (isMockMode) {
    const hasAuthCookie = cookieStore.getAll().some((c) => c.name.includes('auth-token'))
    return <HomeView isAuthenticated={hasAuthCookie} />
  }

  // Check real Supabase auth
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  return <HomeView isAuthenticated={!!user} />
}
