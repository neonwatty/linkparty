'use client'

import { useState } from 'react'
import Link from 'next/link'
import { updatePassword } from '@/lib/auth'
import { validatePassword } from '@/lib/validation'
import { ChevronLeftIcon, LoaderIcon } from '@/components/icons'

export default function ResetPasswordPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [confirmError, setConfirmError] = useState<string | null>(null)
  const [resetSuccess, setResetSuccess] = useState(false)

  const handleUpdatePassword = async () => {
    setPasswordError(null)
    setConfirmError(null)
    setError(null)

    const passwordValidation = validatePassword(newPassword)
    if (!passwordValidation.isValid) {
      setPasswordError(passwordValidation.error || null)
      return
    }

    if (newPassword !== confirmPassword) {
      setConfirmError('Passwords do not match')
      return
    }

    setIsLoading(true)
    const result = await updatePassword(newPassword)
    setIsLoading(false)

    if (result.success) {
      setResetSuccess(true)
    } else {
      setError(result.error || 'Failed to update password')
    }
  }

  if (resetSuccess) {
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
            <h1 className="text-3xl font-bold mb-4">Password updated</h1>
            <p className="text-text-secondary mb-8">
              Your password has been successfully updated. You can now sign in with your new password.
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
        href="/login"
        className="btn-ghost p-2 -ml-2 w-fit rounded-full mb-8"
      >
        <ChevronLeftIcon />
      </Link>

      <div className="flex-1 flex flex-col">
        <h1 className="text-3xl font-bold mb-2 animate-fade-in-up opacity-0">
          Set new password
        </h1>
        <p className="text-text-secondary mb-8 animate-fade-in-up opacity-0 delay-100">
          Enter your new password below
        </p>

        {error && (
          <div className="text-red-400 text-sm text-center mb-4">{error}</div>
        )}

        <div className="space-y-4 animate-fade-in-up opacity-0 delay-200">
          <div>
            <input
              type="password"
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={`input ${passwordError ? 'input-error' : ''}`}
              disabled={isLoading}
            />
            {passwordError && (
              <p className="text-red-400 text-sm mt-1">{passwordError}</p>
            )}
          </div>
          <div>
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`input ${confirmError ? 'input-error' : ''}`}
              disabled={isLoading}
            />
            {confirmError && (
              <p className="text-red-400 text-sm mt-1">{confirmError}</p>
            )}
          </div>
          <button
            onClick={handleUpdatePassword}
            className="btn btn-primary w-full"
            disabled={isLoading}
          >
            {isLoading ? <LoaderIcon /> : 'Update Password'}
          </button>
        </div>
      </div>
    </div>
  )
}
