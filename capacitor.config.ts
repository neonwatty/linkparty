import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.linkparty.app',
  appName: 'Link Party',
  webDir: 'public',
  server: {
    url: process.env.CAPACITOR_SERVER_URL || 'https://linkparty.app',
    cleartext: false,
  },
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#1A1D2E',
    appendUserAgent: 'LinkPartyCapacitor',
  },
}

export default config
