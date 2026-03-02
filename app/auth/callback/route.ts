import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const rawRedirect = searchParams.get('redirect') || '/'
  const isSafePath = rawRedirect.startsWith('/') && !rawRedirect.startsWith('//') && !rawRedirect.includes('\\')
  const redirect = isSafePath ? rawRedirect : '/'

  if (code) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Auth callback: Supabase not configured')
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('error', 'server_config_error')
      return NextResponse.redirect(loginUrl)
    }

    const cookieStore = await cookies()
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        },
      },
    })
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      console.error('Auth callback: failed to exchange code for session', error.message)
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('error', 'auth_callback_failed')
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.redirect(new URL(redirect, request.url))
}
