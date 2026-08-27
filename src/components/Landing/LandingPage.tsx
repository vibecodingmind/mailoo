import React, { useEffect, useMemo, useState } from 'react';
import {
  ShieldCheck,
  Globe,
  Sparkles,
  ArrowRight,
  Lock,
  Mail,
  Check,
  EyeOff,
  ChevronRight,
  Copy,
  Server,
  Users,
  Zap,
  Quote,
} from 'lucide-react';
import { DEMO_ACCOUNT, PLAN_LIST, formatPlanPrice } from '../../lib/plans.js';
import type { LegalDoc } from '../Legal/LegalPages.js';
import type { AuthMode } from '../Auth/AuthModal.js';

interface LandingPageProps {
  onEnterApp: () => void;
  onStartOnboarding: () => void;
  onOpenAuth: (mode: AuthMode) => void;
  onOpenLegal: (doc: LegalDoc) => void;
  onOpenStatus: () => void;
}

const FAQS = [
  {
    q: 'Can I keep my existing domain?',
    a: 'Yes. Add MX, SPF, DKIM, and DMARC records at your registrar. Mailoo generates the exact zone file and verifies alignment before mail starts flowing.',
  },
  {
    q: 'Does this replace Google Workspace or Fastmail?',
    a: 'For studios that want custom-domain mail without advertising conglomerates, yes. IMAP and SMTP stay available so Apple Mail, Thunderbird, and Outlook keep working.',
  },
  {
    q: 'Is AI required?',
    a: 'No. Copilot only runs when you ask it to draft, refine, or summarize. Core hosting, DNS, and webmail work without a Gemini key.',
  },
  {
    q: 'How is this different from a demo?',
    a: 'This build is a full product preview with seeded Atelier Nordic mail. Sign up to provision your own organization, or explore the live studio with the demo account.',
  },
];

export const LandingPage: React.FC<LandingPageProps> = ({
  onEnterApp,
  onStartOnboarding,
  onOpenAuth,
  onOpenLegal,
  onOpenStatus,
}) => {
  const [testDomain, setTestDomain] = useState('klim-foundry.com');
  const [activeDnsTab, setActiveDnsTab] = useState<'mx' | 'spf' | 'dkim' | 'dmarc'>('dkim');
  const [annual, setAnnual] = useState(false);
  const [copied, setCopied] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [statusLabel, setStatusLabel] = useState('Checking systems…');
  const [statusOk, setStatusOk] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/status')
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const mx = (data.checks || []).find((c: { id: string }) => c.id === 'mx');
        if (data.status === 'degraded') {
          setStatusLabel('Degraded — see status');
          setStatusOk(false);
        } else if (mx?.status === 'not_configured') {
          setStatusLabel('Preview operational');
          setStatusOk(true);
        } else {
          setStatusLabel('All systems operational');
          setStatusOk(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStatusLabel('Status unreachable');
          setStatusOk(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const apex = (testDomain || 'example.com').trim().toLowerCase() || 'example.com';

  const records = useMemo(() => {
    let dkimTail = 'mailoo';
    try {
      dkimTail = btoa(apex).replace(/=+$/, '');
    } catch {
      dkimTail = apex.replace(/[^a-z0-9]/g, '');
    }
    return {
      dkim: `v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA${dkimTail}AQAB`,
      spf: 'v=spf1 include:_spf.mailoo.email ~all',
      mx: '10 mail.mailoo.email',
      dmarc: `v=DMARC1; p=quarantine; pct=100; rua=mailto:dmarc-reports@mailoo.email`,
    };
  }, [apex]);

  const copyRecord = async () => {
    const value = records[activeDnsTab];
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div id="mailoo-landing-page" className="min-h-screen bg-[#0A0A0B] text-[#E4E4E7] overflow-y-auto selection:bg-white selection:text-black">
      <header className="border-b border-[#27272A] sticky top-0 z-40 bg-[#0A0A0B]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-sm bg-white flex items-center justify-center font-bold text-black text-sm shadow-sm">
              M
            </div>
            <span className="text-lg font-bold tracking-tight text-white">MAILOO</span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-xs font-mono-code text-[#71717A]">
            <a href="#features" className="hover:text-white transition-colors">
              ARCHITECTURE
            </a>
            <a href="#dns-playground" className="hover:text-white transition-colors">
              DNS INSPECTOR
            </a>
            <a href="#manifesto" className="hover:text-white transition-colors">
              PRIVACY
            </a>
            <a href="#pricing" className="hover:text-white transition-colors">
              PRICING
            </a>
            <a href="#faq" className="hover:text-white transition-colors">
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              id="landing-sign-in-btn"
              onClick={() => onOpenAuth('login')}
              className="px-4 py-2 rounded-md text-xs font-semibold bg-[#18181B] hover:bg-[#27272A] text-white border border-[#27272A] transition-all"
            >
              Sign in
            </button>
            <button
              id="landing-start-onboarding-btn"
              onClick={() => onOpenAuth('signup')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold bg-white hover:bg-[#E4E4E7] text-black shadow-sm transition-all"
            >
              <span>Get Started</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      <section className="relative pt-20 pb-24 px-6 border-b border-[#27272A] overflow-hidden">
        <div className="max-w-4xl mx-auto text-center space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-mono-code bg-[#18181B] text-[#E4E4E7] border border-[#27272A]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>2048-BIT RSA DKIM • ZERO SURVEILLANCE • NATIVE COPILOT</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-[1.1]">
            Sovereign email hosting for the uncompromising.
          </h1>

          <p className="text-sm sm:text-base text-[#A1A1AA] max-w-2xl mx-auto leading-relaxed font-light">
            Mailoo gives design studios, boutique agencies, and independent founders complete ownership of their
            communication infrastructure — custom domains, cryptographic deliverability, and editorial webmail.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => onOpenAuth('signup')}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-3.5 rounded-md font-semibold text-xs bg-white hover:bg-[#E4E4E7] text-black shadow-sm transition-all"
            >
              <span>Provision sovereign mailbox</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              id="landing-open-webmail-btn"
              onClick={onEnterApp}
              className="w-full sm:w-auto px-7 py-3.5 rounded-md font-semibold text-xs bg-[#18181B] hover:bg-[#27272A] text-white border border-[#27272A] transition-all"
            >
              Explore live demo studio
            </button>
          </div>
          <p className="text-[11px] font-mono-code text-[#52525B]">
            Explore the seeded {DEMO_ACCOUNT.studio} workspace in one click — no password in the client.
          </p>
        </div>
      </section>

      <section className="border-b border-[#27272A] bg-[#0F0F12]">
        <div className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { k: '99.99%', v: 'target uptime SLA' },
            { k: '2048-bit', v: 'RSA DKIM signing' },
            { k: '15 min', v: 'idle session lock' },
            { k: '0 ads', v: 'zero surveillance' },
          ].map((stat) => (
            <div key={stat.v}>
              <div className="text-2xl font-bold text-white font-mono-code">{stat.k}</div>
              <div className="text-[11px] uppercase tracking-wider text-[#71717A] mt-1">{stat.v}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="py-20 px-6 border-b border-[#27272A]">
        <div className="max-w-5xl mx-auto space-y-10">
          <div className="text-center space-y-2">
            <div className="text-xs font-mono-code uppercase text-[#71717A] font-semibold tracking-wider">Launch in four steps</div>
            <h2 className="text-3xl font-bold text-white tracking-tight">From domain to inbox in one sitting</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { n: '01', t: 'Choose a plan', d: 'Starter, Pro Studio, or Enterprise with transparent quotas.' },
              { n: '02', t: 'Connect DNS', d: 'Publish MX, SPF, DKIM, and DMARC. We verify cryptographic alignment.' },
              { n: '03', t: 'Provision mailboxes', d: 'Create users, aliases, shared inboxes, and vacation responders.' },
              { n: '04', t: 'Send from your domain', d: 'Webmail, IMAP, SMTP, and optional Gemini copilot — ready.' },
            ].map((step) => (
              <div key={step.n} className="p-5 rounded-lg border border-[#27272A] bg-[#0F0F12] space-y-2">
                <div className="text-[11px] font-mono-code text-[#71717A]">{step.n}</div>
                <h3 className="text-sm font-bold text-white">{step.t}</h3>
                <p className="text-xs text-[#A1A1AA] leading-relaxed">{step.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="dns-playground" className="py-20 px-6 border-b border-[#27272A] bg-[#0F0F12]">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <div className="text-xs font-mono-code uppercase text-[#71717A] font-semibold tracking-wider">
              Interactive ingress playground
            </div>
            <h2 className="text-3xl font-bold text-white tracking-tight">Test instant cryptographic zone generation</h2>
            <p className="text-xs text-[#A1A1AA] max-w-xl mx-auto">
              Type any apex domain to preview the DKIM RSA key, SPF whitelist, and DMARC quarantine policy Mailoo publishes.
            </p>
          </div>

          <div className="border border-[#27272A] rounded-lg bg-[#0A0A0B] p-6 space-y-6 shadow-2xl">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 flex items-center bg-[#18181B] border border-[#27272A] rounded-md px-4 py-2.5">
                <Globe className="w-4 h-4 text-white mr-2.5 shrink-0" />
                <input
                  type="text"
                  value={testDomain}
                  onChange={(e) => setTestDomain(e.target.value)}
                  placeholder="yourcompany.com"
                  className="w-full bg-transparent text-sm text-white focus:outline-none font-mono-code"
                />
              </div>
              <div className="flex items-center gap-2">
                {(['dkim', 'spf', 'mx', 'dmarc'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setActiveDnsTab(t)}
                    className={`px-3 py-2 rounded-md text-xs font-mono-code uppercase font-bold transition-colors ${
                      activeDnsTab === t
                        ? 'bg-white text-black'
                        : 'bg-[#18181B] text-[#71717A] hover:text-white border border-[#27272A]'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-md bg-[#0F0F12] border border-[#27272A] font-mono-code text-xs space-y-2">
              <div className="flex items-center justify-between text-[#71717A] text-[11px] pb-2 border-b border-[#27272A]">
                <span>DNS RECORD PAYLOAD — {apex.toUpperCase()}</span>
                <button type="button" onClick={copyRecord} className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300">
                  <Copy className="w-3 h-3" />
                  {copied ? 'Copied' : 'Copy value'}
                </button>
              </div>

              {activeDnsTab === 'dkim' && (
                <div className="space-y-1 text-[#E4E4E7]">
                  <div className="text-[#71717A]">; 2048-bit RSA DKIM signature record</div>
                  <div>
                    <span className="text-white font-bold">mailoo._domainkey.{apex}</span>{' '}
                    <span className="text-[#A1A1AA]">TXT</span>
                  </div>
                  <div className="text-[#D4D4D8] break-all bg-[#18181B] p-2.5 rounded border border-[#27272A]">
                    "{records.dkim}"
                  </div>
                </div>
              )}

              {activeDnsTab === 'spf' && (
                <div className="space-y-1 text-[#E4E4E7]">
                  <div>
                    <span className="text-white font-bold">@ ({apex})</span> <span className="text-[#A1A1AA]">TXT</span>
                  </div>
                  <div className="text-emerald-400 font-bold bg-[#18181B] p-2.5 rounded border border-[#27272A]">
                    "{records.spf}"
                  </div>
                </div>
              )}

              {activeDnsTab === 'mx' && (
                <div className="space-y-1 text-[#E4E4E7]">
                  <div>
                    <span className="text-white font-bold">@ ({apex})</span> <span className="text-[#A1A1AA]">MX</span>{' '}
                    <span className="text-[#71717A]">{records.mx}</span>
                  </div>
                </div>
              )}

              {activeDnsTab === 'dmarc' && (
                <div className="space-y-1 text-[#E4E4E7]">
                  <div>
                    <span className="text-white font-bold">_dmarc.{apex}</span> <span className="text-[#A1A1AA]">TXT</span>
                  </div>
                  <div className="text-[#D4D4D8] bg-[#18181B] p-2.5 rounded border border-[#27272A]">"{records.dmarc}"</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="py-20 px-6 border-b border-[#27272A]">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-2">
            <div className="text-xs font-mono-code uppercase text-[#71717A] font-semibold tracking-wider">Product principles</div>
            <h2 className="text-3xl font-bold text-white tracking-tight">Engineered from first principles</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: <ShieldCheck className="w-5 h-5" />,
                title: 'Sovereign domain control',
                body: 'You own your MX records, DKIM keys, and sender reputation. Never be locked into an advertising conglomerate.',
              },
              {
                icon: <Sparkles className="w-5 h-5" />,
                title: 'Editorial AI copilot',
                body: 'Powered by server-side Gemini. Draft executive replies, summarize threads, and flag phishing — only when you ask.',
              },
              {
                icon: <EyeOff className="w-5 h-5" />,
                title: 'Zero surveillance policy',
                body: 'No ad profiles. No data mining. Optional read receipts are yours to disable. Correspondence stays yours.',
              },
              {
                icon: <Lock className="w-5 h-5" />,
                title: 'Security hub',
                body: 'scrypt passwords, TOTP, hardware keys, app passwords, PGP, session expiry, and a full audit trail.',
              },
              {
                icon: <Users className="w-5 h-5" />,
                title: 'Teams and shared inboxes',
                body: 'RBAC, mailbox grants, aliases, vacation responders, and internal notes on client threads.',
              },
              {
                icon: <Server className="w-5 h-5" />,
                title: 'Deliverability built in',
                body: 'SPF/DKIM/DMARC alignment, BIMI logos, blacklist health, and DMARC aggregate reporting in one dashboard.',
              },
            ].map((card) => (
              <div key={card.title} className="p-6 rounded-lg border border-[#27272A] bg-[#0F0F12] space-y-3">
                <div className="p-2.5 rounded-md bg-[#18181B] text-white w-fit border border-[#27272A]">{card.icon}</div>
                <h3 className="text-base font-bold text-white">{card.title}</h3>
                <p className="text-xs text-[#A1A1AA] leading-relaxed">{card.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="manifesto" className="py-20 px-6 border-b border-[#27272A] bg-[#0F0F12]">
        <div className="max-w-3xl mx-auto space-y-6 text-center">
          <div className="text-xs font-mono-code uppercase text-[#71717A] font-semibold tracking-wider">Sovereign privacy</div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Mail should not be an advertising surface.</h2>
          <p className="text-sm text-[#A1A1AA] leading-relaxed">
            Mailoo is built for studios that still write like humans. We do not scan inboxes to sell ads. We do not
            train public models on your mail. Encryption, DNS alignment, and session hygiene are defaults — not
            enterprise upsells.
          </p>
          <div className="flex flex-wrap justify-center gap-3 text-[11px] font-mono-code text-[#A1A1AA]">
            <span className="px-3 py-1.5 rounded-full border border-[#27272A] bg-[#0A0A0B]">No mailbox advertising</span>
            <span className="px-3 py-1.5 rounded-full border border-[#27272A] bg-[#0A0A0B]">Explicit-opt-in AI</span>
            <span className="px-3 py-1.5 rounded-full border border-[#27272A] bg-[#0A0A0B]">Org-owned DKIM keys</span>
          </div>
        </div>
      </section>

      <section className="py-20 px-6 border-b border-[#27272A]">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="space-y-4">
            <Quote className="w-8 h-8 text-[#3F3F46]" />
            <blockquote className="text-xl font-medium text-white leading-snug">
              “We moved the studio off a consumer inbox in an afternoon. Clients still write to @atelier-nordic.com —
              we just own the keys now.”
            </blockquote>
            <div className="text-xs text-[#A1A1AA]">
              <span className="text-white font-semibold">Alex Vance</span> · Principal, Atelier Nordic
            </div>
          </div>
          <div className="border border-[#27272A] rounded-lg overflow-hidden text-xs">
            <div className="bg-[#18181B] px-4 py-2 font-mono-code text-[#71717A] uppercase text-[10px]">
              Compared with the default
            </div>
            <table className="w-full">
              <tbody className="divide-y divide-[#18181B]">
                {[
                  ['Custom domain you control', 'Mailoo', 'Workspace add-on'],
                  ['DKIM keys you can rotate', 'Yes', 'Opaque'],
                  ['No ad profiling', 'Yes', 'Consumer SKUs scan mail'],
                  ['Shared studio inboxes', 'Native', 'Groups / aliases'],
                  ['Editorial webmail', 'Designed for studios', 'Generic'],
                ].map((row) => (
                  <tr key={row[0]} className="text-[#A1A1AA]">
                    <td className="px-4 py-2.5 text-white">{row[0]}</td>
                    <td className="px-4 py-2.5 text-emerald-400">{row[1]}</td>
                    <td className="px-4 py-2.5">{row[2]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section id="pricing" className="py-20 px-6 border-b border-[#27272A] bg-[#0F0F12]">
        <div className="max-w-6xl mx-auto space-y-10">
          <div className="text-center space-y-4">
            <div className="text-xs font-mono-code uppercase text-[#71717A] font-semibold tracking-wider">Pricing</div>
            <h2 className="text-3xl font-bold text-white tracking-tight">Simple studio pricing. No seat games.</h2>
            <div className="inline-flex items-center gap-2 p-1 rounded-full border border-[#27272A] bg-[#0A0A0B]">
              <button
                type="button"
                onClick={() => setAnnual(false)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold ${!annual ? 'bg-white text-black' : 'text-[#A1A1AA]'}`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setAnnual(true)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold ${annual ? 'bg-white text-black' : 'text-[#A1A1AA]'}`}
              >
                Annual · 2 months free
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PLAN_LIST.map((plan) => (
              <div
                key={plan.id}
                className={`p-6 rounded-lg border flex flex-col ${
                  plan.popular ? 'border-white ring-1 ring-white/20 bg-[#0A0A0B]' : 'border-[#27272A] bg-[#0A0A0B]'
                }`}
              >
                {plan.popular && (
                  <span className="self-start mb-3 px-2 py-0.5 rounded-full text-[10px] font-mono-code font-bold uppercase bg-white text-black">
                    Most popular
                  </span>
                )}
                <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                <p className="text-xs text-[#A1A1AA] mt-1 min-h-[40px]">{plan.tagline}</p>
                <div className="flex items-baseline gap-1 mt-4">
                  <span className="text-3xl font-bold text-white font-mono-code">{formatPlanPrice(plan, annual)}</span>
                  <span className="text-xs text-[#71717A]">/month</span>
                </div>
                <p className="text-[11px] text-[#71717A] mt-1">
                  {plan.maxDomains} domain{plan.maxDomains === 1 ? '' : 's'} · {plan.maxMailboxes} mailboxes · {plan.maxStorageGb} GB
                </p>
                <ul className="mt-5 space-y-2 flex-1">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2 text-xs text-[#D4D4D8]">
                      <Check className="w-3.5 h-3.5 text-white shrink-0 mt-0.5" />
                      {feat}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => onOpenAuth('signup')}
                  className="mt-6 w-full py-2.5 rounded-md text-xs font-semibold bg-white text-black hover:bg-[#E4E4E7]"
                >
                  Start with {plan.name}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="py-20 px-6 border-b border-[#27272A]">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <div className="text-xs font-mono-code uppercase text-[#71717A] font-semibold tracking-wider">FAQ</div>
            <h2 className="text-3xl font-bold text-white tracking-tight">Before you switch MX</h2>
          </div>
          <div className="space-y-2">
            {FAQS.map((item, idx) => (
              <button
                key={item.q}
                type="button"
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full text-left p-4 rounded-lg border border-[#27272A] bg-[#0F0F12]"
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-semibold text-white">{item.q}</span>
                  <ChevronRight className={`w-4 h-4 text-[#71717A] transition-transform ${openFaq === idx ? 'rotate-90' : ''}`} />
                </div>
                {openFaq === idx && <p className="text-xs text-[#A1A1AA] mt-2 leading-relaxed">{item.a}</p>}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-6 border-b border-[#27272A] bg-[#0F0F12] text-center space-y-5">
        <h2 className="text-2xl font-bold text-white">Own the domain. Own the inbox.</h2>
        <div className="flex flex-col sm:flex-row justify-center gap-3">
          <button
            type="button"
            onClick={onStartOnboarding}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-md text-xs font-semibold bg-white text-black"
          >
            <Zap className="w-3.5 h-3.5" />
            Run setup wizard
          </button>
          <button
            type="button"
            onClick={onEnterApp}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-md text-xs font-semibold border border-[#27272A] text-white"
          >
            <Mail className="w-3.5 h-3.5" />
            Open demo webmail
          </button>
        </div>
      </section>

      <footer className="py-12 px-6 text-xs text-[#71717A]">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-white font-bold">
              <span className="w-6 h-6 rounded-sm bg-white text-black flex items-center justify-center text-xs">M</span>
              MAILOO
            </div>
            <p className="leading-relaxed">Sovereign custom-domain email for studios that still write letters.</p>
          </div>
          <div className="space-y-2">
            <div className="text-[10px] font-mono-code uppercase text-[#52525B]">Product</div>
            <a href="#features" className="block hover:text-white">
              Architecture
            </a>
            <a href="#pricing" className="block hover:text-white">
              Pricing
            </a>
            <a href="#dns-playground" className="block hover:text-white">
              DNS inspector
            </a>
          </div>
          <div className="space-y-2">
            <div className="text-[10px] font-mono-code uppercase text-[#52525B]">Legal</div>
            <button type="button" onClick={() => onOpenLegal('privacy')} className="block hover:text-white text-left">
              Privacy policy
            </button>
            <button type="button" onClick={() => onOpenLegal('terms')} className="block hover:text-white text-left">
              Terms of service
            </button>
            <button type="button" onClick={() => onOpenLegal('dpa')} className="block hover:text-white text-left">
              Data processing addendum
            </button>
            <button type="button" onClick={() => onOpenLegal('subprocessors')} className="block hover:text-white text-left">
              Subprocessors
            </button>
            <button type="button" onClick={() => onOpenLegal('trust')} className="block hover:text-white text-left">
              Security & trust
            </button>
          </div>
          <div className="space-y-2">
            <div className="text-[10px] font-mono-code uppercase text-[#52525B]">Status</div>
            <button
              type="button"
              onClick={onOpenStatus}
              className={`block text-left hover:text-white ${statusOk ? 'text-emerald-400' : 'text-amber-400'}`}
            >
              {statusLabel}
            </button>
            <p>TLS 1.3 · DKIM 2048-bit · live DNS verify</p>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-10 pt-6 border-t border-[#27272A] font-mono-code text-center">
          MAILOO EMAIL INC. · SOVEREIGN COMMUNICATION STANDARD · © 2026
        </div>
      </footer>
    </div>
  );
};
