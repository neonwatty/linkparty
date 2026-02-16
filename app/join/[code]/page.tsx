import { Suspense } from 'react'
import JoinWithCodeClient from './JoinWithCodeClient'

// Required for static export with dynamic routes
// Return a placeholder to generate a fallback page
export function generateStaticParams() {
  return [{ code: '_placeholder' }]
}

export default function JoinWithCodePage() {
  return (
    <Suspense>
      <JoinWithCodeClient />
    </Suspense>
  )
}
