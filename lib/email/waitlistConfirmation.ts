import { sendEmail } from '@/lib/email'

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const getBaseUrl = () => {
  if (process.env.APP_URL) return process.env.APP_URL
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  if (process.env.NEXT_PUBLIC_VERCEL_URL) return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
  return 'http://localhost:3000'
}

function generateHtml(name?: string): string {
  const greeting = name ? escapeHtml(name) : 'Hey there'
  const baseUrl = getBaseUrl()

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're on the Link Party waitlist!</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0a0a0a;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" style="max-width: 500px; background-color: #171717; border-radius: 16px; overflow: hidden;">
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%);">
              <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #ffffff;">Link Party</h1>
              <p style="margin: 8px 0 0; font-size: 14px; color: rgba(255,255,255,0.8);">Share content together in real-time</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 600; color: #ffffff;">
                ${greeting}, you're on the list!
              </h2>
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #a3a3a3;">
                Thanks for joining the Link Party waitlist. We're building a better way to share and watch content with your crew — no more links lost in group chats.
              </p>
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #a3a3a3;">
                We'll keep you posted as we ship new features.
              </p>
              <a href="${escapeHtml(baseUrl)}" style="display: block; width: 100%; padding: 16px 24px; background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%); color: #ffffff; text-decoration: none; text-align: center; font-size: 16px; font-weight: 600; border-radius: 8px; box-sizing: border-box;">
                Check out Link Party
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 32px; border-top: 1px solid #262626; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #525252;">
                You received this email because you joined the Link Party waitlist. If this wasn't you, you can safely ignore it.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function generateText(name?: string): string {
  const greeting = name || 'Hey there'
  const baseUrl = getBaseUrl()

  return `${greeting}, you're on the list!

Thanks for joining the Link Party waitlist. We're building a better way to share and watch content with your crew — no more links lost in group chats.

We'll keep you posted as we ship new features.

Check out Link Party: ${baseUrl}

---
You received this email because you joined the Link Party waitlist. If this wasn't you, you can safely ignore it.`
}

export async function sendWaitlistConfirmation(email: string, name?: string) {
  return sendEmail({
    to: email,
    subject: "You're on the Link Party waitlist!",
    html: generateHtml(name),
    text: generateText(name),
    tags: [{ name: 'type', value: 'waitlist-confirmation' }],
  })
}
