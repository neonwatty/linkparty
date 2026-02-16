import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Resend webhook event types
type ResendEventType =
  | 'email.sent'
  | 'email.delivered'
  | 'email.delivery_delayed'
  | 'email.complained'
  | 'email.bounced'
  | 'email.opened'
  | 'email.clicked'

interface ResendWebhookPayload {
  type: ResendEventType
  created_at: string
  data: {
    email_id: string
    from: string
    to: string[]
    subject: string
    created_at: string
    bounce?: {
      message: string
      type: string
    }
    click?: {
      link: string
      timestamp: string
      user_agent: string
    }
  }
}

// Verify Resend webhook signature using Svix
async function verifyWebhookSignature(payload: string, headers: Headers): Promise<boolean> {
  const signingSecret = process.env.RESEND_WEBHOOK_SECRET

  if (!signingSecret) {
    console.warn('RESEND_WEBHOOK_SECRET not configured - rejecting webhook')
    return false
  }

  const svixId = headers.get('svix-id')
  const svixTimestamp = headers.get('svix-timestamp')
  const svixSignature = headers.get('svix-signature')

  if (!svixId || !svixTimestamp || !svixSignature) {
    console.error('Missing Svix headers')
    return false
  }

  // Check timestamp is within 5 minutes to prevent replay attacks
  const timestamp = parseInt(svixTimestamp, 10)
  const now = Math.floor(Date.now() / 1000)
  if (Math.abs(now - timestamp) > 300) {
    console.error('Webhook timestamp too old')
    return false
  }

  // Compute expected signature
  const signedContent = `${svixId}.${svixTimestamp}.${payload}`
  const secretBytes = base64ToUint8Array(signingSecret.replace('whsec_', ''))

  const key = await crypto.subtle.importKey(
    'raw',
    new Uint8Array(secretBytes).buffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )

  const signatureBytes = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedContent))

  const expectedSignature = `v1,${uint8ArrayToBase64(new Uint8Array(signatureBytes))}`

  // Compare signatures (svix-signature may contain multiple signatures)
  const signatures = svixSignature.split(' ')
  return signatures.some((sig) => sig === expectedSignature)
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

// Process webhook event
async function processWebhookEvent(event: ResendWebhookPayload): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Supabase credentials not configured')
    return
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  console.log(`Processing ${event.type} event for ${event.data.to.join(', ')}`)

  switch (event.type) {
    case 'email.sent':
      console.log(`Email sent: ${event.data.subject}`)
      break

    case 'email.delivered':
      console.log(`Email delivered to ${event.data.to.join(', ')}`)
      break

    case 'email.delivery_delayed':
      console.log(`Email delivery delayed for ${event.data.to.join(', ')}`)
      break

    case 'email.bounced':
      console.error(`Email bounced for ${event.data.to.join(', ')}: ${event.data.bounce?.message}`)
      break

    case 'email.complained':
      console.error(`Spam complaint from ${event.data.to.join(', ')}`)
      break

    case 'email.opened':
      console.log(`Email opened by ${event.data.to.join(', ')}`)
      break

    case 'email.clicked':
      console.log(`Link clicked: ${event.data.click?.link}`)
      break

    default:
      console.log(`Unhandled event type: ${event.type}`)
  }

  // Log event to database for analytics
  const { error } = await supabase.from('email_events').insert({
    event_type: event.type,
    email_id: event.data.email_id,
    recipient: event.data.to[0],
    subject: event.data.subject,
    metadata: event.data,
    created_at: event.created_at,
  })

  if (error) {
    if (!error.message.includes('does not exist')) {
      console.error('Failed to log email event:', error)
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.text()

    // Verify webhook signature
    const isValid = await verifyWebhookSignature(payload, request.headers)
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const event: ResendWebhookPayload = JSON.parse(payload)

    // Process the event
    await processWebhookEvent(event)

    return NextResponse.json({ received: true }, { status: 200 })
  } catch (err) {
    console.error('Webhook processing error:', err)
    return NextResponse.json({ error: `Server error: ${err}` }, { status: 500 })
  }
}
