import React, { useState } from 'react';
import {
  CreditCard,
  Check,
  ShieldCheck,
  Zap,
  ArrowRight,
  Download,
  Receipt,
  Sparkles,
  HardDrive,
  Globe,
  Mail,
  Server,
  Database,
  Layers,
} from 'lucide-react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import type { PlanTier } from '../../types.js';

export const BillingView: React.FC = () => {
  const { organization, mailboxes = [], refreshAll, showToast } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);

  // Storage calculations
  const maxStorageGb = organization?.maxStorageGb || (organization?.plan === 'enterprise' ? 250 : organization?.plan === 'starter' ? 10 : 50);
  const maxStorageMb = maxStorageGb * 1024;
  const calculatedMailboxUsedMb = mailboxes.reduce((sum, m) => sum + (m.usedMb || 0), 0);
  const usedStorageMb = organization?.currentStorageMb || (calculatedMailboxUsedMb > 0 ? calculatedMailboxUsedMb : 3420);
  const usedStorageGb = (usedStorageMb / 1024).toFixed(2);
  const freeStorageMb = Math.max(0, maxStorageMb - usedStorageMb);
  const freeStorageGb = (freeStorageMb / 1024).toFixed(2);
  const usagePercent = Math.min(100, Math.max(1, Math.round((usedStorageMb / maxStorageMb) * 100)));

  const plans = [
    {
      id: 'STARTER' as PlanTier,
      name: 'Starter',
      price: '$9',
      cadence: '/month',
      desc: 'For solo creators and independent craft studios.',
      features: [
        '1 Custom Apex/Sub Domain',
        '2 Mailboxes Included',
        '10 GB Encrypted Storage',
        'DKIM 2048-bit RSA + SPF',
        'IMAP / SMTP Client Gateway',
      ],
      popular: false,
    },
    {
      id: 'PRO' as PlanTier,
      name: 'Pro Studio',
      price: '$29',
      cadence: '/month',
      desc: 'For growing design agencies and boutique firms.',
      features: [
        '5 Custom Domains',
        '10 Mailboxes + Shared Inboxes',
        '50 GB Encrypted Storage',
        'Gemini 2.5 AI Email Copilot',
        'Unlimited Forwarding Aliases',
        'Real-time Audit Logs & RBAC',
      ],
      popular: true,
    },
    {
      id: 'ENTERPRISE' as PlanTier,
      name: 'Enterprise Sovereign',
      price: '$99',
      cadence: '/month',
      desc: 'For organizations with multi-brand sovereign requirements.',
      features: [
        'Unlimited Custom Domains',
        '50+ Mailboxes & Teams',
        '250 GB Encrypted Storage',
        'Custom DKIM Key Rotation',
        'Dedicated IP Ingress & Egress',
        'Priority 24/7 SLA Engineering',
      ],
      popular: false,
    },
  ];

  const handleSelectPlan = async (plan: PlanTier) => {
    if (plan === organization?.plan) return;

    setIsUpdating(true);
    try {
      await api.updateSubscription(plan);
      showToast(`Subscription updated to ${plan}!`, 'success');
      await refreshAll();
    } catch (err: any) {
      showToast(err.message || 'Failed to update plan', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const invoices = [
    {
      id: 'INV-2026-08',
      date: 'Aug 01, 2026',
      amount: '$29.00',
      status: 'PAID',
      plan: 'Pro Studio (Monthly)',
    },
    {
      id: 'INV-2026-07',
      date: 'Jul 01, 2026',
      amount: '$29.00',
      status: 'PAID',
      plan: 'Pro Studio (Monthly)',
    },
    {
      id: 'INV-2026-06',
      date: 'Jun 01, 2026',
      amount: '$29.00',
      status: 'PAID',
      plan: 'Pro Studio (Monthly)',
    },
  ];

  return (
    <div id="billing-view-container" className="flex-1 bg-[#0A0A0B] overflow-y-auto p-6 sm:p-8 text-[#E4E4E7]">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="border-b border-[#27272A] pb-6">
          <div className="flex items-center gap-2 text-[#A1A1AA] text-xs font-mono-code font-semibold tracking-wider uppercase mb-1">
            <CreditCard className="w-4 h-4 text-white" />
            <span>Subscription & Resource Allocation</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Plans, Billing & Quotas
          </h1>
          <p className="text-xs text-[#A1A1AA] mt-1 max-w-2xl">
            Sovereign email hosting with transparent monthly pricing, zero hidden fees, and seamless resource scaling.
          </p>
        </div>

        {/* Storage Usage Progress Bar & Resource Allocation Card */}
        <div id="billing-storage-progress-card" className="p-6 rounded-lg border border-[#27272A] bg-[#0F0F12] space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-md bg-[#18181B] border border-[#27272A] text-white">
                <HardDrive className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-white tracking-tight">Email Storage Utilization</h2>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-mono-code font-bold uppercase ${
                      usagePercent > 85
                        ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                        : usagePercent > 70
                        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                        : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    {usagePercent > 85 ? 'High Usage' : usagePercent > 70 ? 'Moderate' : 'Optimal Capacity'}
                  </span>
                </div>
                <p className="text-xs text-[#A1A1AA] mt-0.5">
                  Allocated encrypted volume across active mailboxes and server retention archives.
                </p>
              </div>
            </div>

            <div className="text-left sm:text-right font-mono-code">
              <span className="text-xl font-bold text-white">{usedStorageGb} GB</span>
              <span className="text-xs text-[#71717A] ml-1.5">/ {maxStorageGb} GB Quota</span>
              <div className="text-[11px] text-[#A1A1AA]">{usagePercent}% Occupied</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div
              id="billing-storage-progress-track"
              role="progressbar"
              aria-valuenow={usagePercent}
              aria-valuemin={0}
              aria-valuemax={100}
              className="w-full h-3 bg-[#18181B] border border-[#27272A] rounded-full overflow-hidden p-0.5"
            >
              <div
                id="billing-storage-progress-fill"
                className={`h-full rounded-full transition-all duration-500 ${
                  usagePercent > 85
                    ? 'bg-gradient-to-r from-rose-500 to-rose-400'
                    : usagePercent > 70
                    ? 'bg-gradient-to-r from-amber-500 to-amber-400'
                    : 'bg-gradient-to-r from-blue-500 to-emerald-400'
                }`}
                style={{ width: `${Math.max(2, usagePercent)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono-code text-[#71717A]">
              <span>0 GB (Empty)</span>
              <span>{freeStorageGb} GB Remaining Free Capacity</span>
              <span>{maxStorageGb} GB Max Allocation</span>
            </div>
          </div>

          {/* Metric Stats Breakdown */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-[#1F1F23]">
            <div className="p-3 rounded bg-[#141417] border border-[#27272A]/70 space-y-1">
              <div className="text-[10px] uppercase font-mono-code text-[#71717A] font-semibold">Occupied Space</div>
              <div className="text-sm font-bold text-white font-mono-code">{usedStorageMb.toLocaleString()} MB</div>
              <div className="text-[10px] text-[#A1A1AA]">Active emails & attachments</div>
            </div>

            <div className="p-3 rounded bg-[#141417] border border-[#27272A]/70 space-y-1">
              <div className="text-[10px] uppercase font-mono-code text-[#71717A] font-semibold">Available Quota</div>
              <div className="text-sm font-bold text-emerald-400 font-mono-code">{freeStorageGb} GB</div>
              <div className="text-[10px] text-[#A1A1AA]">Unallocated reserve</div>
            </div>

            <div className="p-3 rounded bg-[#141417] border border-[#27272A]/70 space-y-1">
              <div className="text-[10px] uppercase font-mono-code text-[#71717A] font-semibold">Active Mailboxes</div>
              <div className="text-sm font-bold text-white font-mono-code">{mailboxes.length} Provisioned</div>
              <div className="text-[10px] text-[#A1A1AA]">
                Avg {(mailboxes.length > 0 ? (usedStorageMb / mailboxes.length).toFixed(0) : '0')} MB / box
              </div>
            </div>

            <div className="p-3 rounded bg-[#141417] border border-[#27272A]/70 space-y-1">
              <div className="text-[10px] uppercase font-mono-code text-[#71717A] font-semibold">Storage Architecture</div>
              <div className="text-sm font-bold text-blue-400 font-mono-code">NVMe AES-256</div>
              <div className="text-[10px] text-[#A1A1AA]">Self-hosted encrypted vault</div>
            </div>
          </div>
        </div>

        {/* Current Plan Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((p) => {
            const isCurrent = organization?.plan === p.id;
            return (
              <div
                key={p.id}
                className={`p-6 rounded-lg border relative flex flex-col justify-between transition-all ${
                  isCurrent
                    ? 'bg-[#0F0F12] border-white ring-1 ring-white/20'
                    : p.popular
                    ? 'bg-[#0F0F12] border-[#3F3F46] hover:border-white/50'
                    : 'bg-[#0F0F12] border-[#27272A] hover:border-[#3F3F46]'
                }`}
              >
                {p.popular && !isCurrent && (
                  <span className="absolute -top-3 right-6 px-2.5 py-0.5 rounded-full text-[10px] font-mono-code font-bold uppercase bg-white text-black">
                    Most Popular
                  </span>
                )}
                {isCurrent && (
                  <span className="absolute -top-3 right-6 px-2.5 py-0.5 rounded-full text-[10px] font-mono-code font-bold uppercase bg-emerald-400 text-black">
                    Current Plan
                  </span>
                )}

                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-bold text-white tracking-tight">{p.name}</h3>
                    <p className="text-xs text-[#A1A1AA] mt-1 min-h-[32px]">{p.desc}</p>
                  </div>

                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-white font-mono-code">{p.price}</span>
                    <span className="text-xs text-[#71717A] font-mono-code">{p.cadence}</span>
                  </div>

                  <div className="pt-4 border-t border-[#27272A] space-y-2.5">
                    {p.features.map((feat, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-[#D4D4D8]">
                        <Check className="w-3.5 h-3.5 text-white shrink-0" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-[#27272A]">
                  <button
                    onClick={() => handleSelectPlan(p.id)}
                    disabled={isCurrent || isUpdating}
                    className={`w-full py-2.5 rounded-md text-xs font-semibold transition-all ${
                      isCurrent
                        ? 'bg-[#18181B] text-[#71717A] border border-[#27272A] cursor-default'
                        : 'bg-white hover:bg-[#E4E4E7] text-black shadow-sm'
                    }`}
                  >
                    {isCurrent ? 'Active Subscription' : `Switch to ${p.name}`}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Invoice & Payment History */}
        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs uppercase font-mono-code font-bold text-[#A1A1AA] tracking-wider">
              Invoices & Payment Receipts
            </h2>
            <span className="text-[11px] font-mono-code text-[#71717A]">
              Payment Method: Visa ending in 4242 (Auto-renews)
            </span>
          </div>

          <div className="border border-[#27272A] rounded-lg overflow-hidden bg-[#0F0F12]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#18181B] text-[#71717A] font-mono-code uppercase text-[10px] border-b border-[#27272A]">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">Invoice ID</th>
                  <th className="py-2.5 px-4 font-semibold">Billing Date</th>
                  <th className="py-2.5 px-4 font-semibold">Description</th>
                  <th className="py-2.5 px-4 font-semibold">Amount</th>
                  <th className="py-2.5 px-4 font-semibold">Status</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#18181B] font-mono-code text-[11px]">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-[#18181B]/50 transition-colors">
                    <td className="py-3 px-4 font-bold text-white">{inv.id}</td>
                    <td className="py-3 px-4 text-[#A1A1AA]">{inv.date}</td>
                    <td className="py-3 px-4 text-[#E4E4E7] font-sans">{inv.plan}</td>
                    <td className="py-3 px-4 font-semibold text-white">{inv.amount}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => showToast(`Downloaded receipt for ${inv.id}`, 'info')}
                        className="inline-flex items-center gap-1 text-xs text-white hover:text-[#A1A1AA]"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>PDF</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
