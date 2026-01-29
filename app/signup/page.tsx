'use client'

import { useState } from 'react'
import Link from 'next/link'
import { signInWithGoogle, signUpWithEmail } from '@/lib/auth'
import { validateEmail, validatePassword, validateDisplayName } from '@/lib/validation'
import { ChevronLeftIcon, LoaderIcon } from '@/components/icons'

export default function SignupPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [displayName, setDisplayNameInput] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nameError, setNameError] = useState<string | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [signupSuccess, setSignupSuccess] = useState(false)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      e.preventDefault()
      handleEmailSignUp()
    }
  }

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    setError(null)
    try {
      await signInWithGoogle()
    } catch {
      setError('Failed to sign in with Google')
      setIsLoading(false)
    }
  }

  const handleEmailSignUp = async () => {
    setNameError(null)
    setEmailError(null)
    setPasswordError(null)
    setError(null)

    const nameValidation = validateDisplayName(displayName)
    const emailValidation = validateEmail(email)
    const passwordValidation = validatePassword(password)

    if (!nameValidation.isValid) {
      setNameError(nameValidation.error || null)
    }
    if (!emailValidation.isValid) {
      setEmailError(emailValidation.error || null)
    }
    if (!passwordValidation.isValid) {
      setPasswordError(passwordValidation.error || null)
    }

    if (!nameValidation.isValid || !emailValidation.isValid || !passwordValidation.isValid) {
      return
    }

    setIsLoading(true)
    const result = await signUpWithEmail(email, password, displayName.trim())
    setIsLoading(false)

    if (result.success && result.needsConfirmation) {
      setSignupSuccess(true)
    } else if (!result.success) {
      setError(result.error || 'Failed to create account')
    }
  }

  if (signupSuccess) {
    return (
      <div className="container-mobile bg-gradient-party flex flex-col px-6 py-8">
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="animate-fade-in-up opacity-0">
            <div className="w-16 h-16 rounded-full bg-teal-500/20 flex items-center justify-center mx-auto mb-6">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-teal-400">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
            <h1 className="text-3xl font-bold mb-4">Check your email</h1>
            <p className="text-text-secondary mb-8">
              We've sent a confirmation link to <span className="text-text-primary">{email}</span>. Click the link to activate your account.
            </p>
            <Link
              href="/login"
              className="btn btn-primary"
            >
              Go to Sign In
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container-mobile bg-gradient-party flex flex-col px-6 py-8">
      <Link
        href="/"
        className="btn-ghost p-2 -ml-2 w-fit rounded-full mb-8"
        aria-label="Go back to home"
      >
        <ChevronLeftIcon />
      </Link>

      <div className="flex-1 flex flex-col">
        <h1 className="text-3xl font-bold mb-2 animate-fade-in-up opacity-0">
          Create account
        </h1>
        <p className="text-text-secondary mb-8 animate-fade-in-up opacity-0 delay-100">
          Join parties and share content with friends
        </p>

        {error && (
          <div className="text-red-400 text-sm text-center mb-4">{error}</div>
        )}

        <div className="space-y-3 mb-8 animate-fade-in-up opacity-0 delay-200">
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="btn btn-secondary w-full flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {isLoading ? (
              <LoaderIcon />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"/>
              </svg>
            )}
            Continue with Google
          </button>
        </div>

        <div className="flex items-center gap-4 mb-8 animate-fade-in-up opacity-0 delay-300">
          <div className="flex-1 h-px bg-surface-700"></div>
          <span className="text-text-muted text-sm">or</span>
          <div className="flex-1 h-px bg-surface-700"></div>
        </div>

        {/* Email form */}
        <div className="space-y-4 animate-fade-in-up opacity-0 delay-400">
          <div>
            <input
              type="text"
              placeholder="Display name"
              value={displayName}
              onChange={(e) => setDisplayNameInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className={`input ${nameError ? 'input-error' : ''}`}
              disabled={isLoading}
              maxLength={50}
            />
            <div className="flex justify-between mt-1">
              {nameError ? (
                <span className="text-red-400 text-xs">{nameError}</span>
              ) : (
                <span className={`text-xs ${displayName.trim().length > 0 && displayName.trim().length < 2 ? 'text-red-400' : 'text-text-muted'}`}>
                  {displayName.trim().length > 0 && displayName.trim().length < 2 ? 'Min 2 characters' : ''}
                </span>
              )}
              <span className={`text-xs ${displayName.length >= 45 ? 'text-yellow-400' : 'text-text-muted'}`}>
                {displayName.length}/50
              </span>
            </div>
          </div>
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
            {emailError && (
              <p className="text-red-400 text-sm mt-1">{emailError}</p>
            )}
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
            {passwordError && (
              <p className="text-red-400 text-sm mt-1">{passwordError}</p>
            )}
          </div>
          <button
            onClick={handleEmailSignUp}
            className="btn btn-primary w-full"
            disabled={isLoading}
          >
            {isLoading ? <LoaderIcon /> : 'Create Account'}
          </button>
        </div>

        <div className="mt-6 text-center animate-fade-in-up opacity-0 delay-500">
          <Link
            href="/login"
            className="text-text-muted text-sm hover:text-text-secondary transition-colors"
          >
            Already have an account? <span className="text-accent-400">Sign in</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
