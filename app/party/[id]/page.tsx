import PartyRoomClient from './PartyRoomClient'

// Required for static export with dynamic routes
// Return a placeholder to generate a fallback page
export function generateStaticParams() {
  return [{ id: '_placeholder' }]
}

export default function PartyRoomPage() {
  return <PartyRoomClient />
}
