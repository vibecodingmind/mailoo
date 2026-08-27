import React from 'react';
import { ArrowLeft, Shield } from 'lucide-react';

export type LegalDoc = 'privacy' | 'terms' | 'dpa' | 'subprocessors' | 'trust';

const DOCS: Record<LegalDoc, { title: string; updated: string; sections: { heading: string; body: string }[] }> = {
  privacy: {
    title: 'Privacy Policy',
    updated: 'August 26, 2026',
    sections: [
      {
        heading: 'What we collect',
        body: 'Mailoo stores account identity (name, email), organization metadata, mailbox contents you choose to host with us, DNS configuration, audit logs, and billing records. We do not sell personal data, build advertising profiles, or inject third-party tracking pixels into your mail.',
      },
      {
        heading: 'How mail is processed',
        body: 'Inbound and outbound messages are processed solely to deliver, store, filter, and display mail for your organization. Optional AI features send the selected draft or thread excerpt to Google Gemini only when you explicitly invoke Copilot, summarize, or smart-sort.',
      },
      {
        heading: 'Retention',
        body: 'You control retention policies per organization. Trash and spam auto-purge windows are configurable. Deleted mailboxes remove associated messages from the active store. Audit logs are retained for security investigations.',
      },
      {
        heading: 'Subprocessors',
        body: 'Infrastructure hosting, optional Gemini inference, and payment processing (when connected) are the only subprocessors. A current list is available on request at privacy@mailoo.email.',
      },
    ],
  },
  terms: {
    title: 'Terms of Service',
    updated: 'August 26, 2026',
    sections: [
      {
        heading: 'The service',
        body: 'Mailoo provides custom-domain email hosting, webmail, DNS guidance, and related collaboration tools. Plans define mailbox, domain, and storage quotas. Fair-use anti-abuse limits apply to outbound sending.',
      },
      {
        heading: 'Acceptable use',
        body: 'You may not use Mailoo to send spam, phishing, malware, or unlawful content. We may suspend mailboxes that damage shared IP reputation. You remain responsible for content stored in your organization.',
      },
      {
        heading: 'Billing',
        body: 'Subscriptions renew monthly or annually until cancelled. Downgrades take effect at the next renewal. Over-quota mailboxes continue to receive mail but cannot send until storage is freed or the plan is upgraded.',
      },
      {
        heading: 'Limitation of liability',
        body: 'Mailoo is provided as-is for this product preview. Production SLAs, indemnities, and uptime credits apply only on a signed Enterprise agreement.',
      },
    ],
  },
  dpa: {
    title: 'Data Processing Addendum',
    updated: 'August 26, 2026',
    sections: [
      {
        heading: 'Roles',
        body: 'You are the controller of mailbox content and end-user identity. Mailoo is the processor, acting only on documented instructions: deliver, store, filter, and display mail, plus optional AI assistance you trigger.',
      },
      {
        heading: 'Security measures',
        body: 'Passwords are hashed with scrypt (RFC 7914). Sessions are bearer tokens with expiry. Transport expects TLS 1.3. DKIM keys are 2048-bit RSA. Organization audit logs record privileged actions.',
      },
      {
        heading: 'International transfers',
        body: 'If you enable Gemini Copilot, selected content may be processed in Google Cloud regions. You can disable AI features and continue using core mail hosting.',
      },
      {
        heading: 'Deletion',
        body: 'Upon written request after account closure, we delete organization data from the active store within 30 days, except records we must keep for legal or abuse prevention. In this preview you can export or delete your workspace from Security → Privacy.',
      },
    ],
  },
  subprocessors: {
    title: 'Subprocessors',
    updated: 'August 27, 2026',
    sections: [
      {
        heading: 'Current list',
        body: 'This preview store runs on the host you deploy (currently a local JSON file). Optional AI features call Google Gemini when you explicitly invoke Copilot. No advertising networks, analytics pixels, or session replay vendors are loaded in the product UI.',
      },
      {
        heading: 'Planned production subprocessors',
        body: 'A production host will add: cloud infrastructure for compute and object storage, a transactional email provider for verification/reset mail, and a payment processor (Stripe or equivalent) for subscriptions. That list will be published here before those systems go live.',
      },
      {
        heading: 'Customer control',
        body: 'You can use Mailoo without Gemini by omitting GEMINI_API_KEY. Workspace export and deletion are available to owners in Security → Privacy.',
      },
    ],
  },
  trust: {
    title: 'Security & Trust',
    updated: 'August 27, 2026',
    sections: [
      {
        heading: 'What this preview already does',
        body: 'Passwords are hashed with scrypt (RFC 7914). Sessions are bearer tokens with expiry. Unauthenticated APIs no longer impersonate the demo studio. Auth endpoints are rate limited. User secrets (password hashes, TOTP seeds, reset tokens) are stripped from API responses. DKIM keys are 2048-bit RSA. Domain verify performs live public DNS lookups.',
      },
      {
        heading: 'What it does not yet do',
        body: 'This is not a live MX/SMTP/IMAP host. There is no Stripe settlement, no outbound IP reputation program, and no SOC 2 report. Treat it as a high-fidelity product preview until those controls ship.',
      },
      {
        heading: 'Reporting',
        body: 'Report vulnerabilities to security@mailoo.email. A security.txt file is published at /.well-known/security.txt.',
      },
    ],
  },
};

interface LegalPagesProps {
  doc: LegalDoc;
  onBack: () => void;
}

export const LegalPages: React.FC<LegalPagesProps> = ({ doc, onBack }) => {
  const content = DOCS[doc];

  return (
    <div id="mailoo-legal-page" className="min-h-screen bg-[#0A0A0B] text-[#E4E4E7] overflow-y-auto">
      <header className="border-b border-[#27272A] sticky top-0 bg-[#0A0A0B]/90 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 text-xs text-[#A1A1AA] hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="flex items-center gap-2 text-[10px] font-mono-code uppercase text-[#71717A]">
            <Shield className="w-3.5 h-3.5" />
            Legal
          </div>
        </div>
      </header>

      <article className="max-w-3xl mx-auto px-6 py-12 space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-white tracking-tight">{content.title}</h1>
          <p className="text-xs font-mono-code text-[#71717A]">Last updated {content.updated}</p>
        </div>
        {content.sections.map((section) => (
          <section key={section.heading} className="space-y-2">
            <h2 className="text-sm font-bold text-white">{section.heading}</h2>
            <p className="text-sm text-[#A1A1AA] leading-relaxed">{section.body}</p>
          </section>
        ))}
      </article>
    </div>
  );
};
