import Link from 'next/link'

export const metadata = {
  title: 'Terms of Service | Link Party',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-party">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <Link href="/" className="text-accent-400 hover:text-accent-300 text-sm transition-colors">
          &larr; Back to Link Party
        </Link>

        <h1 className="text-3xl font-bold mt-6 mb-8">Terms of Service</h1>

        <div className="prose prose-invert prose-sm max-w-none space-y-6 text-text-secondary">
          <p>
            <strong>Last updated:</strong> March 2026
          </p>

          <p>
            Link Party (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;) is a collaborative content-sharing
            platform. By using Link Party you agree to these terms.
          </p>

          <h2 className="text-xl font-semibold text-text-primary mt-8">1. Eligibility</h2>
          <p>You must be at least 13 years old to use Link Party.</p>

          <h2 className="text-xl font-semibold text-text-primary mt-8">2. Your Account</h2>
          <p>
            You are responsible for maintaining the security of your account. Do not share your credentials. You may
            delete your account at any time from your profile settings.
          </p>

          <h2 className="text-xl font-semibold text-text-primary mt-8">3. Acceptable Use</h2>
          <p>You agree not to:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Upload illegal, harmful, or abusive content</li>
            <li>Harass or impersonate other users</li>
            <li>Attempt to gain unauthorized access to our systems</li>
            <li>Use automated tools to scrape or abuse the service</li>
          </ul>

          <h2 className="text-xl font-semibold text-text-primary mt-8">4. Content</h2>
          <p>
            You retain ownership of content you share. By posting content to a party, you grant other party members
            permission to view it. Content in expired parties may be deleted automatically.
          </p>

          <h2 className="text-xl font-semibold text-text-primary mt-8">5. Service Availability</h2>
          <p>
            Link Party is currently in beta. We may modify, suspend, or discontinue any part of the service at any time.
            We provide the service &ldquo;as is&rdquo; without warranties.
          </p>

          <h2 className="text-xl font-semibold text-text-primary mt-8">6. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, Link Party shall not be liable for any indirect, incidental, or
            consequential damages arising from your use of the service.
          </p>

          <h2 className="text-xl font-semibold text-text-primary mt-8">7. Changes</h2>
          <p>We may update these terms from time to time. Continued use of Link Party constitutes acceptance.</p>

          <h2 className="text-xl font-semibold text-text-primary mt-8">8. Contact</h2>
          <p>
            Questions? Reach us at{' '}
            <a href="mailto:hello@linkparty.app" className="text-accent-400 hover:text-accent-300">
              hello@linkparty.app
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
