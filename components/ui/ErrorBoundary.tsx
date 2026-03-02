'use client'
import React from 'react'

interface Props {
  children: React.ReactNode
}
interface State {
  hasError: boolean
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError(): State {
    return { hasError: true }
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-4 bg-surface-900">
          <p className="text-red-400 text-lg">Something went wrong.</p>
          <button onClick={() => window.location.reload()} className="btn btn-primary">
            Reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
