/**
 * Playwright global setup: warm up Next.js server before tests run.
 *
 * On CI, the production server cold-starts slowly. Without warmup,
 * the first batch of tests timeout waiting for SSR pages to compile.
 */
async function globalSetup() {
  if (!process.env.CI) return

  const baseURL = 'http://localhost:3000'
  const routes = ['/', '/login', '/signup', '/create', '/join', '/reset-password']

  console.log('Warming up Next.js server...')

  for (const route of routes) {
    try {
      await fetch(`${baseURL}${route}`)
    } catch {
      // Server may not be ready yet for all routes — that's fine
    }
  }

  // Give the server a moment to finish any background compilation
  await new Promise((resolve) => setTimeout(resolve, 2000))
  console.log('Server warmup complete')
}

export default globalSetup
