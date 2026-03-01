import type { CapacitorConfig } from '@capacitor/cli'

const serverUrl = process.env.CAPACITOR_ENV === 'staging' ? 'https://staging.linkparty.app' : 'https://linkparty.app'

const config: CapacitorConfig = {
  appId: 'com.linkparty.app',
  appName: 'Link Party',
  webDir: 'out',
  server: {
    url: serverUrl,
    androidScheme: 'https',
  },
  ios: {
    contentInset: 'automatic',
  },
}

export default config
