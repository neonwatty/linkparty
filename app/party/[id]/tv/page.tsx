import TVModeClient from './TVModeClient'

// Required for static export with dynamic routes
// Return a placeholder to generate a fallback page
export function generateStaticParams() {
  return [{ id: '_placeholder' }]
}

export default function TVModePage() {
  return <TVModeClient />
}
