import { ImageResponse } from 'next/og'

export const alt = 'Link Party — Stop losing links in chat'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1A1D2E',
        backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(255, 138, 92, 0.15) 0%, transparent 60%)',
      }}
    >
      {/* Logo */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 80,
          height: 80,
          borderRadius: 20,
          background: 'linear-gradient(135deg, #ff8a5c 0%, #e86b3a 100%)',
          marginBottom: 28,
          boxShadow: '0 4px 24px rgba(255, 138, 92, 0.3)',
        }}
      >
        <div style={{ fontSize: 40, display: 'flex' }}>&#x1F525;</div>
      </div>

      {/* Title */}
      <div
        style={{
          fontSize: 72,
          fontWeight: 700,
          color: '#f5f0e8',
          marginBottom: 16,
          letterSpacing: '-1px',
        }}
      >
        Link Party
      </div>

      {/* Tagline */}
      <div
        style={{
          fontSize: 36,
          fontWeight: 600,
          color: '#ff8a5c',
          marginBottom: 16,
        }}
      >
        Stop losing links in chat
      </div>

      {/* Subtitle */}
      <div
        style={{
          fontSize: 22,
          color: '#948e84',
        }}
      >
        One shared queue for your crew
      </div>

      {/* Domain */}
      <div
        style={{
          position: 'absolute',
          bottom: 32,
          right: 40,
          fontSize: 18,
          color: '#948e84',
        }}
      >
        linkparty.app
      </div>
    </div>,
    { ...size },
  )
}
