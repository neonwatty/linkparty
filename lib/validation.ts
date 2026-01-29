export interface ValidationResult {
  isValid: boolean
  error?: string
}

export function validateEmail(email: string): ValidationResult {
  if (!email.trim()) {
    return { isValid: false, error: 'Email is required' }
  }

  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email.trim())) {
    return { isValid: false, error: 'Please enter a valid email' }
  }

  return { isValid: true }
}

export function validatePassword(password: string): ValidationResult {
  if (!password) {
    return { isValid: false, error: 'Password is required' }
  }

  if (password.length < 8) {
    return { isValid: false, error: 'Password must be at least 8 characters' }
  }

  return { isValid: true }
}

export function validateDisplayName(name: string): ValidationResult {
  if (!name.trim()) {
    return { isValid: false, error: 'Display name is required' }
  }

  const trimmedName = name.trim()
  if (trimmedName.length < 2 || trimmedName.length > 50) {
    return { isValid: false, error: 'Display name must be 2-50 characters' }
  }

  return { isValid: true }
}
