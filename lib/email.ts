/**
 * Email service for sending transactional emails via Resend
 * Server-side only - do not import in client components
 */

/**
 * Escape user-provided strings before interpolating into HTML templates
 * to prevent XSS / HTML injection.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Base URL for the app
const getBaseUrl = () => {
  if (process.env.VERCEL_URL) {
    // Vercel deployment
    return `https://${process.env.VERCEL_URL}`
  }
  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
  }
  // Local development
  return 'http://localhost:3000'
}

// Email configuration
const RESEND_API_URL = 'https://api.resend.com/emails'
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Link Party <noreply@linkparty.app>'

interface SendEmailOptions {
  to: string | string[]
  subject: string
  html: string
  text?: string
  replyTo?: string
  tags?: Array<{ name: string; value: string }>
}

interface SendEmailResult {
  success: boolean
  id?: string
  error?: string
}

/**
 * Send an email via Resend API
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY

  if (!apiKey) {
    console.error('RESEND_API_KEY not configured')
    return { success: false, error: 'Email service not configured' }
  }

  try {
    const response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text,
        reply_to: options.replyTo,
        tags: options.tags,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Resend API error:', data)
      return { success: false, error: data.message || 'Failed to send email' }
    }

    return { success: true, id: data.id }
  } catch (error) {
    console.error('Email send error:', error)
    return { success: false, error: 'Failed to send email' }
  }
}

/**
 * Send a party invitation email
 */
export async function sendPartyInvitation(options: {
  to: string
  partyCode: string
  partyName: string
  inviterName: string
  inviterId?: string
  personalMessage?: string
}): Promise<SendEmailResult> {
  const { to, partyCode, partyName, inviterName, inviterId, personalMessage } = options
  const baseUrl = getBaseUrl()
  const joinUrl = inviterId ? `${baseUrl}/join/${partyCode}?inviter=${inviterId}` : `${baseUrl}/join?code=${partyCode}`

  const subject = `${inviterName} invited you to join "${partyName}" on Link Party`

  const html = generatePartyInviteHtml({
    partyName,
    partyCode,
    inviterName,
    joinUrl,
    personalMessage,
  })

  const text = generatePartyInviteText({
    partyName,
    partyCode,
    inviterName,
    joinUrl,
    personalMessage,
  })

  return sendEmail({
    to,
    subject,
    html,
    text,
    tags: [
      { name: 'type', value: 'party-invitation' },
      { name: 'party-code', value: partyCode },
    ],
  })
}

/**
 * Generate HTML email template for party invitation
 */
function generatePartyInviteHtml(options: {
  partyName: string
  partyCode: string
  inviterName: string
  joinUrl: string
  personalMessage?: string
}): string {
  const { partyName, partyCode, inviterName, joinUrl, personalMessage } = options

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're Invited to ${escapeHtml(partyName)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0a0a0a;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" style="max-width: 500px; background-color: #171717; border-radius: 16px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%);">
              <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #ffffff;">
                Link Party
              </h1>
              <p style="margin: 8px 0 0; font-size: 14px; color: rgba(255,255,255,0.8);">
                Share content together in real-time
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 600; color: #ffffff;">
                You're invited!
              </h2>
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #a3a3a3;">
                <strong style="color: #ffffff;">${escapeHtml(inviterName)}</strong> has invited you to join their party:
              </p>

              <!-- Party Card -->
              <div style="background-color: #262626; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                <p style="margin: 0 0 8px; font-size: 18px; font-weight: 600; color: #ffffff;">
                  ${escapeHtml(partyName)}
                </p>
                <p style="margin: 0; font-size: 14px; color: #a3a3a3;">
                  Party Code: <span style="font-family: monospace; font-size: 16px; font-weight: 600; color: #a78bfa; letter-spacing: 2px;">${escapeHtml(partyCode)}</span>
                </p>
              </div>

              ${
                personalMessage
                  ? `
              <!-- Personal Message -->
              <div style="background-color: #1f1f1f; border-left: 3px solid #7c3aed; border-radius: 0 8px 8px 0; padding: 16px; margin-bottom: 24px;">
                <p style="margin: 0; font-size: 14px; font-style: italic; color: #d4d4d4;">
                  "${escapeHtml(personalMessage)}"
                </p>
              </div>
              `
                  : ''
              }

              <!-- CTA Button -->
              <a href="${joinUrl}" style="display: block; width: 100%; padding: 16px 24px; background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%); color: #ffffff; text-decoration: none; text-align: center; font-size: 16px; font-weight: 600; border-radius: 8px; box-sizing: border-box;">
                Join the Party
              </a>

              <p style="margin: 24px 0 0; font-size: 13px; color: #737373; text-align: center;">
                Or enter the code manually at <a href="${joinUrl}" style="color: #a78bfa; text-decoration: none;">linkparty.app</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; border-top: 1px solid #262626; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #525252;">
                This email was sent by Link Party. If you didn't expect this invitation, you can safely ignore it.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`
}

/**
 * Generate plain text email for party invitation
 */
function generatePartyInviteText(options: {
  partyName: string
  partyCode: string
  inviterName: string
  joinUrl: string
  personalMessage?: string
}): string {
  const { partyName, partyCode, inviterName, joinUrl, personalMessage } = options

  let text = `You're invited to Link Party!

${inviterName} has invited you to join their party: "${partyName}"

Party Code: ${partyCode}
`

  if (personalMessage) {
    text += `
Message from ${inviterName}:
"${personalMessage}"
`
  }

  text += `
Join the party here: ${joinUrl}

Or enter the code manually at linkparty.app

---
This email was sent by Link Party. If you didn't expect this invitation, you can safely ignore it.
`

  return text
}
