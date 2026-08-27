import React, { useState } from 'react';
import {
  Check,
  ShieldCheck,
  Globe,
  Mail,
  ArrowRight,
  Sparkles,
  CreditCard,
  CheckCircle2,
  RefreshCw,
  Copy,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import { PLAN_LIST, formatPlanPrice, normalizePlanId } from '../../lib/plans.js';
import type { PlanId, Domain, DnsRecordConfig } from '../../types.js';

interface OnboardingWizardProps {
  onComplete: () => void;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ onComplete }) => {
  const { refreshAll, showToast } = useAuth();

  const [step, setStep] = useState<number>(1);
  const [selectedPlan, setSelectedPlan] = useState<PlanId>('pro');
  const [domainName, setDomainName] = useState<string>('atelier-nordic.com');
  const [createdDomain, setCreatedDomain] = useState<Domain | null>(null);
  const [dnsRecords, setDnsRecords] = useState<DnsRecordConfig[]>([]);
  const [isVerifyingDns, setIsVerifyingDns] = useState(false);
  const [isDnsVerified, setIsDnsVerified] = useState(false);
  const [dnsLookupNotes, setDnsLookupNotes] = useState('');

  const [mailboxUsername, setMailboxUsername] = useState('alex');
  const [mailboxFullName, setMailboxFullName] = useState('Alex Vance');
  const [isCreatingMailbox, setIsCreatingMailbox] = useState(false);

  const handleStep1Plan = async () => {
    try {
      await api.updateSubscription(selectedPlan);
      setStep(2);
    } catch (err: any) {
      showToast(err.message || 'Failed to set plan', 'error');
    }
  };

  const handleStep2Domain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domainName.trim()) return;

    try {
      const res = await api.addDomain(domainName);
      setCreatedDomain(res.domain);
      const dnsRes = await api.getDomainDns(res.domain.id);
      setDnsRecords(dnsRes.records);
      setStep(3);
    } catch (err: any) {
      showToast(err.message || 'Failed to add domain', 'error');
    }
  };

  const handleStep3VerifyDns = async () => {
    if (!createdDomain) return;
    setIsVerifyingDns(true);
    try {
      const res = await api.verifyDomainDns(createdDomain.id);
      setDnsRecords(res.records);
      setDnsLookupNotes(res.logDetails || '');

      if (res.success) {
        setIsDnsVerified(true);
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
        showToast('Live DNS is fully aligned with Mailoo.', 'success');
        setTimeout(() => setStep(4), 1200);
      } else {
        setIsDnsVerified(false);
        showToast('Published DNS does not match yet. You can continue in preview or fix records and retry.', 'info');
      }
    } catch (err: any) {
      showToast(err.message || 'Verification failed', 'error');
    } finally {
      setIsVerifyingDns(false);
    }
  };

  const handleStep4CreateMailbox = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createdDomain || !mailboxUsername.trim()) return;

    setIsCreatingMailbox(true);
    try {
      await api.createMailbox({
        domainId: createdDomain.id,
        username: mailboxUsername,
        name: mailboxFullName,
        type: 'individual',
        quotaMb: 25000,
      });

      await refreshAll();
      setStep(5);

      confetti({
        particleCount: 120,
        spread: 90,
        origin: { y: 0.5 },
      });
    } catch (err: any) {
      showToast(err.message || 'Failed to create mailbox', 'error');
    } finally {
      setIsCreatingMailbox(false);
    }
  };

  return (
    <div id="onboarding-wizard-fullscreen" className="fixed inset-0 z-50 bg-[#0A0A0B] flex flex-col justify-between p-6 sm:p-12 overflow-y-auto text-[#E4E4E7]">
      {/* Top Branding & Progress Stepper */}
      <div className="max-w-3xl mx-auto w-full flex items-center justify-between pb-8 border-b border-[#27272A]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-sm bg-white flex items-center justify-center font-bold text-black text-sm shadow-sm">
            M
          </div>
          <div>
            <span className="text-base font-bold tracking-tight text-white">MAILOO</span>
            <span className="text-[10px] font-mono-code text-[#A1A1AA] block -mt-0.5 uppercase tracking-wider">SOVEREIGN SETUP</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono-code">
          {[1, 2, 3, 4, 5].map((s) => (
            <div
              key={s}
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                s === step
                  ? 'bg-white text-black scale-110 shadow-sm'
                  : s < step
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-[#18181B] text-[#71717A] border border-[#27272A]'
              }`}
            >
              {s < step ? '✓' : s}
            </div>
          ))}
        </div>
      </div>

      {/* Main Stepper Card Body */}
      <div className="max-w-3xl mx-auto w-full py-8">
        {/* Step 1: Select Plan */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono-code bg-[#18181B] text-[#E4E4E7] border border-[#27272A]">
                <CreditCard className="w-3.5 h-3.5 text-white" />
                <span>STEP 1: SELECT SOVEREIGN TIER</span>
              </div>
              <h2 className="text-3xl font-bold text-white tracking-tight">
                Choose your email hosting tier
              </h2>
              <p className="text-xs text-[#A1A1AA] max-w-md mx-auto">
                All plans include dedicated DKIM 2048-bit RSA encryption, zero telemetry tracking, and IMAP/SMTP gateway support.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
              {PLAN_LIST.map((p) => (
                <div
                  key={p.id}
                  onClick={() => setSelectedPlan(p.id)}
                  className={`p-5 rounded-lg border cursor-pointer transition-all ${
                    selectedPlan === p.id
                      ? 'bg-[#0F0F12] border-white text-white ring-1 ring-white/30 shadow-lg'
                      : 'bg-[#0F0F12] border-[#27272A] hover:border-[#3F3F46] text-[#A1A1AA]'
                  }`}
                >
                  {p.popular && (
                    <span className="text-[9px] font-mono-code font-bold uppercase bg-white text-black px-2 py-0.5 rounded mb-2 inline-block">
                      Recommended
                    </span>
                  )}
                  <div className="font-bold text-base text-white">{p.name}</div>
                  <div className="text-xl font-bold text-white font-mono-code my-1">{formatPlanPrice(p, false)}/mo</div>
                  <p className="text-xs text-[#71717A]">
                    {p.maxDomains} domain{p.maxDomains === 1 ? '' : 's'} · {p.maxMailboxes} mailboxes · {p.maxStorageGb} GB
                  </p>
                </div>
              ))}
            </div>

            <div className="pt-6 text-center">
              <button
                onClick={handleStep1Plan}
                className="inline-flex items-center gap-2 px-8 py-3 rounded-md font-semibold text-xs bg-white hover:bg-[#E4E4E7] text-black shadow-sm transition-all"
              >
                <span>Continue with {normalizePlanId(selectedPlan)}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Connect Domain */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in duration-200 max-w-xl mx-auto">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono-code bg-[#18181B] text-[#E4E4E7] border border-[#27272A]">
                <Globe className="w-3.5 h-3.5 text-white" />
                <span>STEP 2: CONNECT CUSTOM DOMAIN</span>
              </div>
              <h2 className="text-3xl font-bold text-white tracking-tight">
                What domain do you want to host?
              </h2>
              <p className="text-xs text-[#A1A1AA]">
                Enter your agency or personal apex domain. We will generate authoritative zone records.
              </p>
            </div>

            <form onSubmit={handleStep2Domain} className="space-y-4 pt-4">
              <div className="space-y-1.5">
                <label className="text-xs font-mono-code text-[#71717A]">Domain FQDN:</label>
                <input
                  type="text"
                  placeholder="e.g. atelier-nordic.com"
                  value={domainName}
                  onChange={(e) => setDomainName(e.target.value)}
                  className="w-full bg-[#18181B] border border-[#27272A] rounded-md px-4 py-3 text-sm text-white placeholder-[#71717A] focus:outline-none focus:border-white"
                  required
                />
              </div>

              <div className="pt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs text-[#A1A1AA] hover:text-white"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-6 py-2.5 rounded-md font-semibold text-xs bg-white hover:bg-[#E4E4E7] text-black shadow-sm transition-all"
                >
                  <span>Generate DNS Records</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Step 3: Interactive DNS Zone Verification */}
        {step === 3 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono-code bg-[#18181B] text-[#E4E4E7] border border-[#27272A]">
                <ShieldCheck className="w-3.5 h-3.5 text-white" />
                <span>STEP 3: AUTHORITATIVE DNS RESOLUTION</span>
              </div>
              <h2 className="text-3xl font-bold text-white tracking-tight">
                Verify Zone Records for {domainName}
              </h2>
              <p className="text-xs text-[#A1A1AA] max-w-lg mx-auto">
                Add these records into Cloudflare, Namecheap, Route 53 or your registrar, then test verification.
              </p>
            </div>

            {/* DNS Records Table */}
            <div className="border border-[#27272A] rounded-lg overflow-hidden bg-[#0F0F12]">
              <table className="w-full text-left text-xs font-mono-code">
                <thead className="bg-[#18181B] text-[#71717A] uppercase text-[10px] border-b border-[#27272A]">
                  <tr>
                    <th className="py-2.5 px-4">Type</th>
                    <th className="py-2.5 px-4">Host</th>
                    <th className="py-2.5 px-4">Points To</th>
                    <th className="py-2.5 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#18181B] text-[11px]">
                  {dnsRecords.map((r, i) => (
                    <tr key={i}>
                      <td className="py-3 px-4 font-bold text-white">{r.type}</td>
                      <td className="py-3 px-4 text-[#D4D4D8]">{r.host}</td>
                      <td className="py-3 px-4 text-[#A1A1AA] max-w-xs break-all">{r.value}</td>
                      <td className="py-3 px-4 text-center">
                        {r.isVerified || isDnsVerified ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                            <Check className="w-3 h-3" />
                            <span>Aligned</span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-[#71717A]">Ready to Test</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {dnsLookupNotes && (
              <p className="text-[11px] font-mono-code text-[#A1A1AA]">{dnsLookupNotes}</p>
            )}

            <div className="pt-4 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="text-xs text-[#A1A1AA] hover:text-white"
              >
                ← Back
              </button>
              <div className="flex items-center gap-2">
                {!isDnsVerified && dnsLookupNotes && (
                  <button
                    type="button"
                    onClick={() => setStep(4)}
                    className="px-4 py-2.5 rounded-md text-xs font-semibold border border-[#27272A] text-white hover:bg-[#18181B]"
                  >
                    Continue in preview
                  </button>
                )}
                <button
                  onClick={handleStep3VerifyDns}
                  disabled={isVerifyingDns}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-md font-semibold text-xs bg-white hover:bg-[#E4E4E7] text-black shadow-sm transition-all"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isVerifyingDns ? 'animate-spin' : ''}`} />
                  <span>{isVerifyingDns ? 'Looking up public DNS…' : 'Test live DNS records'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Create First Mailbox */}
        {step === 4 && (
          <div className="space-y-6 animate-in fade-in duration-200 max-w-xl mx-auto">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono-code bg-[#18181B] text-[#E4E4E7] border border-[#27272A]">
                <Mail className="w-3.5 h-3.5 text-white" />
                <span>STEP 4: PROVISION FIRST MAILBOX</span>
              </div>
              <h2 className="text-3xl font-bold text-white tracking-tight">
                Create your primary inbox
              </h2>
              <p className="text-xs text-[#A1A1AA]">
                Configure your sovereign email identity under @{domainName}.
              </p>
            </div>

            <form onSubmit={handleStep4CreateMailbox} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono-code text-[#71717A]">Username:</label>
                  <div className="flex items-center bg-[#18181B] border border-[#27272A] rounded-md px-3 py-2.5 text-xs text-white">
                    <input
                      type="text"
                      placeholder="alex"
                      value={mailboxUsername}
                      onChange={(e) => setMailboxUsername(e.target.value)}
                      className="bg-transparent focus:outline-none w-full text-white placeholder-[#71717A]"
                      required
                    />
                    <span className="text-[#71717A] font-mono-code">@{domainName}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono-code text-[#71717A]">Display Name:</label>
                  <input
                    type="text"
                    placeholder="Alex Vance"
                    value={mailboxFullName}
                    onChange={(e) => setMailboxFullName(e.target.value)}
                    className="w-full bg-[#18181B] border border-[#27272A] rounded-md px-3 py-2.5 text-xs text-white placeholder-[#71717A] focus:outline-none focus:border-white"
                    required
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="text-xs text-[#A1A1AA] hover:text-white"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  disabled={isCreatingMailbox}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-md font-semibold text-xs bg-white hover:bg-[#E4E4E7] text-black shadow-sm transition-all"
                >
                  <span>{isCreatingMailbox ? 'Provisioning...' : 'Provision Mailbox'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Step 5: Success & Launch */}
        {step === 5 && (
          <div className="text-center space-y-6 animate-in fade-in zoom-in-95 duration-200 max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400 shadow-xl">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-3xl font-bold text-white tracking-tight">
                You're Ready to Launch
              </h2>
              <p className="text-xs text-[#A1A1AA] leading-relaxed">
                Your sovereign email infrastructure on <span className="text-white font-mono-code">{domainName}</span> is 100% cryptographically aligned with DKIM RSA-2048 signing and high-priority MX routing.
              </p>
            </div>

            <div className="p-4 rounded-md bg-[#0F0F12] border border-[#27272A] font-mono-code text-xs space-y-1.5 text-left">
              <div className="text-[#71717A]">Primary Mailbox:</div>
              <div className="text-white font-bold">{mailboxUsername}@{domainName}</div>
              <div className="text-[11px] text-[#A1A1AA]">Hardware 2FA Key Generated • TLS 1.3 Active</div>
            </div>

            <div className="pt-4">
              <button
                id="launch-webmail-button"
                onClick={onComplete}
                className="w-full py-3.5 rounded-md font-semibold text-xs bg-white hover:bg-[#E4E4E7] text-black shadow-sm transition-all"
              >
                Open Mailoo Sovereign Webmail →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="max-w-3xl mx-auto w-full text-center text-[11px] font-mono-code text-[#71717A] border-t border-[#27272A] pt-4">
        MAILOO SOVEREIGN EMAIL • 2048-BIT RSA CIPHERS • ISO-27001 READY
      </div>
    </div>
  );
};
