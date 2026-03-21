import Link from 'next/link'

export const metadata = {
  title: 'Privacy Policy | Link Party',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-party">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <Link href="/" className="text-accent-400 hover:text-accent-300 text-sm transition-colors">
          &larr; Back to Link Party
        </Link>

        <h1 className="text-3xl font-bold mt-6 mb-8">Privacy Policy</h1>

        <div className="prose prose-invert prose-sm max-w-none space-y-6 text-text-secondary">
          <p>
            <strong>Last updated:</strong> March 2026
          </p>

          <p>
            Link Party (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;) respects your privacy. This policy
            explains what data we collect, how we use it, and your rights.
          </p>

          <h2 className="text-xl font-semibold text-text-primary mt-8">1. Data We Collect</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              <strong>Account data:</strong> Email address, display name, and avatar when you create an account
            </li>
            <li>
              <strong>Party data:</strong> Content you share in parties (links, notes, images)
            </li>
            <li>
              <strong>Usage data:</strong> Page views and feature usage (via PostHog analytics, only with your consent)
            </li>
            <li>
              <strong>Device data:</strong> Browser type, device type for optimizing your experience
            </li>
          </ul>

          <h2 className="text-xl font-semibold text-text-primary mt-8">2. How We Use Your Data</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>To provide and improve Link Party</li>
            <li>To send party invitations and notifications you request</li>
            <li>To understand how the product is used (anonymous analytics with your consent)</li>
          </ul>

          <h2 className="text-xl font-semibold text-text-primary mt-8">3. Cookies</h2>
          <p>
            We use essential cookies for authentication. Analytics cookies are only set if you accept them via the
            cookie consent banner. You can change your preference at any time by clearing your browser cookies.
          </p>

          <h2 className="text-xl font-semibold text-text-primary mt-8">4. Data Sharing</h2>
          <p>
            We do not sell your data. We share data only with service providers necessary to operate Link Party
            (Supabase for database hosting, Vercel for web hosting, Resend for email delivery, PostHog for analytics).
          </p>

          <h2 className="text-xl font-semibold text-text-primary mt-8">5. Data Retention</h2>
          <p>
            Party data may be automatically deleted after parties expire (24 hours). Account data is retained until you
            delete your account. You can delete your account at any time from your profile settings.
          </p>

          <h2 className="text-xl font-semibold text-text-primary mt-8">6. Your Rights</h2>
          <p>You have the right to:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Access the personal data we hold about you</li>
            <li>Request correction or deletion of your data</li>
            <li>Opt out of analytics tracking</li>
            <li>Delete your account and all associated data</li>
          </ul>

          <h2 className="text-xl font-semibold text-text-primary mt-8">7. Changes</h2>
          <p>We may update this policy from time to time. We will notify you of significant changes.</p>

          <h2 className="text-xl font-semibold text-text-primary mt-8">8. Contact</h2>
          <p>
            Privacy questions? Email{' '}
            <a href="mailto:hello@linkparty.app" className="text-accent-400 hover:text-accent-300">
              hello@linkparty.app
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
