'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { signInWithGoogle, signInWithEmail, resetPassword } from '@/lib/auth'
import { validateEmail, validatePassword } from '@/lib/validation'
import { ChevronLeftIcon, LoaderIcon } from '@/components/icons'
import { TwinklingStars } from '@/components/ui/TwinklingStars'

function SignupLinkInner() {
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect')
  const href = redirect ? `/signup?redirect=${encodeURIComponent(redirect)}` : '/signup'
  return (
    <Link href={href} className="text-text-muted text-sm hover:text-text-secondary transition-colors">
      Don&apos;t have an account? <span className="text-accent-400">Sign up</span>
    </Link>
  )
}

function SignupLink() {
  return (
    <Suspense
      fallback={
        <Link href="/signup" className="text-text-muted text-sm hover:text-text-secondary transition-colors">
          Don&apos;t have an account? <span className="text-accent-400">Sign up</span>
        </Link>
      }
    >
      <SignupLinkInner />
    </Suspense>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [resetEmailSent, setResetEmailSent] = useState(false)

  useEffect(() => {
    document.title = 'Sign In | Link Party'
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      e.preventDefault()
      if (showForgotPassword) {
        handleForgotPassword()
      } else {
        handleEmailSignIn()
      }
    }
  }

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    setError(null)
    try {
      // Preserve redirect target through OAuth flow
      const params = new URLSearchParams(window.location.search)
      const redirect = params.get('redirect')
      if (redirect && redirect.startsWith('/') && !redirect.startsWith('//')) {
        sessionStorage.setItem('auth-redirect', redirect)
      }
      await signInWithGoogle()
    } catch {
      setError('Failed to sign in with Google')
      setIsLoading(false)
    }
  }

  const handleEmailSignIn = async () => {
    setEmailError(null)
    setPasswordError(null)
    setError(null)

    const emailValidation = validateEmail(email)
    const passwordValidation = validatePassword(password)

    if (!emailValidation.isValid) {
      setEmailError(emailValidation.error || null)
    }
    if (!passwordValidation.isValid) {
      setPasswordError(passwordValidation.error || null)
    }

    if (!emailValidation.isValid || !passwordValidation.isValid) {
      return
    }

    setIsLoading(true)
    const result = await signInWithEmail(email, password)
    setIsLoading(false)

    if (!result.success) {
      setError(result.error || 'Failed to sign in')
    } else {
      const params = new URLSearchParams(window.location.search)
      const rawRedirect = params.get('redirect') || '/'
      const redirect = rawRedirect.startsWith('/') && !rawRedirect.startsWith('//') ? rawRedirect : '/'
      router.push(redirect)
    }
  }

  const handleForgotPassword = async () => {
    setEmailError(null)
    setError(null)

    const emailValidation = validateEmail(email)
    if (!emailValidation.isValid) {
      setEmailError(emailValidation.error || null)
      return
    }

    setIsLoading(true)
    const result = await resetPassword(email)
    setIsLoading(false)

    if (result.success) {
      setResetEmailSent(true)
    } else {
      setError(result.error || 'Failed to send reset email')
    }
  }

  if (showForgotPassword) {
    return (
      <div className="container-mobile bg-gradient-party flex flex-col px-6 py-8 relative">
        <TwinklingStars count={25} />

        <button
          onClick={() => {
            setShowForgotPassword(false)
            setResetEmailSent(false)
          }}
          className="btn-ghost p-2 -ml-2 w-fit rounded-full mb-8"
          disabled={isLoading}
          aria-label="Go back to sign in"
        >
          <ChevronLeftIcon />
        </button>

        <div className="flex-1 flex flex-col">
          <h1 className="text-3xl font-bold mb-2 animate-fade-in-up">Reset password</h1>
          <p className="text-text-secondary mb-8 animate-fade-in-up delay-100">
            Enter your email to receive a reset link
          </p>

          {resetEmailSent ? (
            <div className="animate-fade-in-up delay-200">
              <div className="bg-teal-500/10 border border-teal-500/30 rounded-xl p-4 text-center">
                <p className="text-teal-400 font-medium mb-2">Check your email</p>
                <p className="text-text-secondary text-sm">We've sent a password reset link to {email}</p>
              </div>
              <button
                onClick={() => {
                  setShowForgotPassword(false)
                  setResetEmailSent(false)
                }}
                className="btn btn-secondary w-full mt-6"
              >
                Back to Sign In
              </button>
            </div>
          ) : (
            <>
              {error && <div className="text-red-400 text-sm text-center mb-4">{error}</div>}

              <div className="space-y-4 animate-fade-in-up delay-200">
                <div>
                  <input
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className={`input ${emailError ? 'input-error' : ''}`}
                    disabled={isLoading}
                  />
                  {emailError && <p className="text-red-400 text-sm mt-1">{emailError}</p>}
                </div>
                <button onClick={handleForgotPassword} className="btn btn-primary w-full" disabled={isLoading}>
                  {isLoading ? <LoaderIcon /> : 'Send Reset Link'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="container-mobile bg-gradient-party flex flex-col px-6 py-8 relative">
      <TwinklingStars count={25} />

      {/* Back button */}
      <Link href="/" className="btn-ghost p-2 -ml-2 w-fit rounded-full mb-8" aria-label="Go back to home">
        <ChevronLeftIcon />
      </Link>

      <div className="flex-1 flex flex-col">
        <h1 className="text-3xl font-bold mb-2 animate-fade-in-up">Welcome back</h1>
        <p className="text-text-secondary mb-8 animate-fade-in-up delay-100">Sign in to access your party history</p>

        {error && <div className="text-red-400 text-sm text-center mb-4">{error}</div>}

        {/* OAuth buttons */}
        <div className="space-y-3 mb-8 animate-fade-in-up delay-200">
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="btn btn-secondary w-full flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {isLoading ? (
              <LoaderIcon />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z" />
              </svg>
            )}
            Continue with Google
          </button>
        </div>

        <div className="flex items-center gap-4 mb-8 animate-fade-in-up delay-300">
          <div className="flex-1 h-px bg-surface-700"></div>
          <span className="text-text-muted text-sm">or</span>
          <div className="flex-1 h-px bg-surface-700"></div>
        </div>

        {/* Email form */}
        <div className="space-y-4 animate-fade-in-up delay-400">
          <div>
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={handleKeyDown}
              className={`input ${emailError ? 'input-error' : ''}`}
              disabled={isLoading}
            />
            {emailError && <p className="text-red-400 text-sm mt-1">{emailError}</p>}
          </div>
          <div>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              className={`input ${passwordError ? 'input-error' : ''}`}
              disabled={isLoading}
            />
            {passwordError && <p className="text-red-400 text-sm mt-1">{passwordError}</p>}
          </div>
          <button onClick={handleEmailSignIn} className="btn btn-primary w-full" disabled={isLoading}>
            {isLoading ? <LoaderIcon /> : 'Sign In'}
          </button>
        </div>

        <div className="mt-4 text-center animate-fade-in-up delay-500">
          <button
            onClick={() => setShowForgotPassword(true)}
            className="text-text-muted text-sm hover:text-text-secondary transition-colors"
          >
            Forgot password?
          </button>
        </div>

        <div className="mt-4 text-center animate-fade-in-up delay-500">
          <SignupLink />
        </div>
      </div>
    </div>
  )
}
