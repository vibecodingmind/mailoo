import React, { useState } from 'react';
import {
  ShieldCheck,
  Globe,
  Sparkles,
  ArrowRight,
  Lock,
  Zap,
  Mail,
  Check,
  Server,
  EyeOff,
  Cpu,
  ChevronRight,
  Terminal,
} from 'lucide-react';

interface LandingPageProps {
  onEnterApp: () => void;
  onStartOnboarding: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onEnterApp,
  onStartOnboarding,
}) => {
  const [testDomain, setTestDomain] = useState('klim-foundry.com');
  const [activeDnsTab, setActiveDnsTab] = useState<'mx' | 'spf' | 'dkim' | 'dmarc'>('dkim');

  return (
    <div id="mailoo-landing-page" className="min-h-screen bg-[#0A0A0B] text-[#E4E4E7] overflow-y-auto selection:bg-white selection:text-black">
      {/* Top Navbar */}
      <header className="border-b border-[#27272A] sticky top-0 z-40 bg-[#0A0A0B]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-sm bg-white flex items-center justify-center font-bold text-black text-sm shadow-sm">
              M
            </div>
            <span className="text-lg font-bold tracking-tight text-white">
              MAILOO
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-xs font-mono-code text-[#71717A]">
            <a href="#features" className="hover:text-white transition-colors">ARCHITECTURAL SPEC</a>
            <a href="#dns-playground" className="hover:text-white transition-colors">DNS INSPECTOR</a>
            <a href="#manifesto" className="hover:text-white transition-colors">SOVEREIGN PRIVACY</a>
            <a href="#pricing" className="hover:text-white transition-colors">PRICING</a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              id="landing-open-webmail-btn"
              onClick={onEnterApp}
              className="px-4 py-2 rounded-md text-xs font-semibold bg-[#18181B] hover:bg-[#27272A] text-white border border-[#27272A] transition-all"
            >
              Open Webmail
            </button>
            <button
              id="landing-start-onboarding-btn"
              onClick={onStartOnboarding}
              className="flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold bg-white hover:bg-[#E4E4E7] text-black shadow-sm transition-all"
            >
              <span>Get Started</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-24 px-6 border-b border-[#27272A] overflow-hidden">
        <div className="max-w-4xl mx-auto text-center space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-mono-code bg-[#18181B] text-[#E4E4E7] border border-[#27272A] animate-in fade-in slide-in-from-top-4 duration-300">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>2048-BIT RSA DKIM • ZERO SURVEILLANCE • NATIVE COPILOT</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-[1.1]">
            Sovereign email hosting for the uncompromising.
          </h1>

          <p className="text-sm sm:text-base text-[#A1A1AA] max-w-2xl mx-auto leading-relaxed font-light">
            Mailoo gives design studios, boutique agencies, and independent founders complete ownership of their communication infrastructure with editorial typography and mathematical deliverability.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={onStartOnboarding}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-3.5 rounded-md font-semibold text-xs bg-white hover:bg-[#E4E4E7] text-black shadow-sm transition-all"
            >
              <span>Provision Sovereign Mailbox</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={onEnterApp}
              className="w-full sm:w-auto px-7 py-3.5 rounded-md font-semibold text-xs bg-[#18181B] hover:bg-[#27272A] text-white border border-[#27272A] transition-all"
            >
              Explore Live Demo Studio
            </button>
          </div>
        </div>
      </section>

      {/* Interactive DNS Zone Playground */}
      <section id="dns-playground" className="py-20 px-6 border-b border-[#27272A] bg-[#0F0F12]">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <div className="text-xs font-mono-code uppercase text-[#71717A] font-semibold tracking-wider">
              Interactive Ingress Playground
            </div>
            <h2 className="text-3xl font-bold text-white tracking-tight">
              Test Instant Cryptographic Zone Generation
            </h2>
            <p className="text-xs text-[#A1A1AA] max-w-xl mx-auto">
              Type any apex domain below to simulate the exact DKIM RSA key, SPF whitelist, and DMARC quarantine policies generated by Mailoo edge nodes.
            </p>
          </div>

          <div className="border border-[#27272A] rounded-lg bg-[#0A0A0B] p-6 space-y-6 shadow-2xl">
            {/* Domain input */}
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

            {/* Generated Code Terminal Box */}
            <div className="p-4 rounded-md bg-[#0F0F12] border border-[#27272A] font-mono-code text-xs space-y-2">
              <div className="flex items-center justify-between text-[#71717A] text-[11px] pb-2 border-b border-[#27272A]">
                <span>DNS RECORD PAYLOAD — {testDomain.toUpperCase()}</span>
                <span className="text-emerald-400">● 100% INBOX DELIVERABILITY READY</span>
              </div>

              {activeDnsTab === 'dkim' && (
                <div className="space-y-1 text-[#E4E4E7]">
                  <div className="text-[#71717A]">; 2048-bit RSA DKIM Signature Record</div>
                  <div>
                    <span className="text-white font-bold">mailoo._domainkey.{testDomain || 'example.com'}</span>{' '}
                    <span className="text-[#A1A1AA]">TXT</span>{' '}
                    <span className="text-[#71717A]">300</span>
                  </div>
                  <div className="text-[#D4D4D8] break-all bg-[#18181B] p-2.5 rounded border border-[#27272A]">
                    "v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAxK42f0N+9L7c2vQG0p...AQAB"
                  </div>
                </div>
              )}

              {activeDnsTab === 'spf' && (
                <div className="space-y-1 text-[#E4E4E7]">
                  <div className="text-[#71717A]">; Strict Sender Policy Framework</div>
                  <div>
                    <span className="text-white font-bold">@ ({testDomain || 'example.com'})</span>{' '}
                    <span className="text-[#A1A1AA]">TXT</span>{' '}
                    <span className="text-[#71717A]">300</span>
                  </div>
                  <div className="text-emerald-400 font-bold bg-[#18181B] p-2.5 rounded border border-[#27272A]">
                    "v=spf1 include:_spf.mailoo.email ~all"
                  </div>
                </div>
              )}

              {activeDnsTab === 'mx' && (
                <div className="space-y-1 text-[#E4E4E7]">
                  <div className="text-[#71717A]">; Primary and Secondary MX Ingress Routes</div>
                  <div>
                    <span className="text-white font-bold">@ ({testDomain || 'example.com'})</span>{' '}
                    <span className="text-[#A1A1AA]">MX</span>{' '}
                    <span className="text-[#71717A]">10 mail.mailoo.email</span>
                  </div>
                </div>
              )}

              {activeDnsTab === 'dmarc' && (
                <div className="space-y-1 text-[#E4E4E7]">
                  <div className="text-[#71717A]">; DMARC Quarantine Enforcement</div>
                  <div>
                    <span className="text-white font-bold">_dmarc.{testDomain || 'example.com'}</span>{' '}
                    <span className="text-[#A1A1AA]">TXT</span>{' '}
                    <span className="text-[#71717A]">300</span>
                  </div>
                  <div className="text-[#D4D4D8] bg-[#18181B] p-2.5 rounded border border-[#27272A]">
                    "v=DMARC1; p=quarantine; pct=100; rua=mailto:dmarc-reports@mailoo.email"
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Feature Pillar Architecture */}
      <section id="features" className="py-20 px-6 border-b border-[#27272A]">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-2">
            <div className="text-xs font-mono-code uppercase text-[#71717A] font-semibold tracking-wider">
              Product Principles
            </div>
            <h2 className="text-3xl font-bold text-white tracking-tight">
              Engineered from first principles
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-lg border border-[#27272A] bg-[#0F0F12] space-y-3">
              <div className="p-2.5 rounded-md bg-[#18181B] text-white w-fit border border-[#27272A]">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Sovereign Domain Control</h3>
              <p className="text-xs text-[#A1A1AA] leading-relaxed">
                You own your MX records, your DKIM keys, and your reputation. Never be locked into advertising conglomerates.
              </p>
            </div>

            <div className="p-6 rounded-lg border border-[#27272A] bg-[#0F0F12] space-y-3">
              <div className="p-2.5 rounded-md bg-[#18181B] text-white w-fit border border-[#27272A]">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Editorial AI Copilot</h3>
              <p className="text-xs text-[#A1A1AA] leading-relaxed">
                Powered by server-side Gemini 2.5. Draft executive responses, summarize complex threads, and detect zero-day phishing vectors.
              </p>
            </div>

            <div className="p-6 rounded-lg border border-[#27272A] bg-[#0F0F12] space-y-3">
              <div className="p-2.5 rounded-md bg-[#18181B] text-white w-fit border border-[#27272A]">
                <EyeOff className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Zero Surveillance Policy</h3>
              <p className="text-xs text-[#A1A1AA] leading-relaxed">
                No tracking pixels. No data mining. No advertising profiles. Your private correspondence stays strictly yours.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-[#27272A] text-center text-xs font-mono-code text-[#71717A] space-y-2">
        <div>MAILOO EMAIL INC. • SOVEREIGN COMMUNICATION STANDARD</div>
        <div className="text-[#71717A]">TLS 1.3 • DKIM 2048-BIT • DMARC ALIGNED • 99.99% UPTIME SLA</div>
      </footer>
    </div>
  );
};
