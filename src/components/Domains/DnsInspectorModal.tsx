import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  Copy,
  Check,
  RefreshCw,
  AlertCircle,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Info,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import type { Domain, DnsRecordConfig } from '../../types.js';

interface DnsInspectorModalProps {
  domain: Domain;
  isOpen: boolean;
  onClose: () => void;
  onVerified: () => void;
}

export const DnsInspectorModal: React.FC<DnsInspectorModalProps> = ({
  domain,
  isOpen,
  onClose,
  onVerified,
}) => {
  const { showToast } = useAuth();
  const [records, setRecords] = useState<DnsRecordConfig[]>([]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'records' | 'guide'>('records');

  useEffect(() => {
    if (isOpen && domain) {
      api.getDomainDns(domain.id).then((res) => {
        setRecords(res.records);
      });
    }
  }, [isOpen, domain]);

  if (!isOpen || !domain) return null;

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    showToast('Copied record value to clipboard', 'info');
    setTimeout(() => setCopiedIndex(null), 2500);
  };

  const handleVerifyDns = async () => {
    setIsVerifying(true);
    try {
      const res = await api.verifyDomainDns(domain.id);
      setRecords(res.records);

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });

      showToast(`DNS records for ${domain.domainName} verified successfully!`, 'success');
      onVerified();
    } catch (err: any) {
      showToast(err.message || 'DNS verification failed', 'error');
    } finally {
      setIsVerifying(false);
    }
  };

  const allVerified = records.length > 0 && records.every((r) => r.isVerified);

  return (
    <div
      id="dns-inspector-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs"
    >
      <div className="w-full max-w-4xl bg-[#0F0F12] border border-[#27272A] rounded-lg shadow-2xl overflow-hidden text-[#E4E4E7] flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#27272A] bg-[#18181B] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-[#27272A] text-white border border-[#3F3F46]/50">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-base text-white">{domain.domainName}</h2>
                <span
                  className={`text-[10px] font-mono-code uppercase px-2 py-0.5 rounded-full font-bold border ${
                    domain.status === 'active'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  }`}
                >
                  {domain.status === 'active' ? 'Active & Receiving' : 'Pending DNS Propagation'}
                </span>
              </div>
              <p className="text-xs text-[#71717A] mt-0.5">
                Authoritative DNS zone records for SPF, DKIM 2048-bit RSA, and DMARC enforcement
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-1 rounded-md text-[#71717A] hover:text-white hover:bg-[#27272A]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="px-6 pt-3 border-b border-[#27272A] flex items-center justify-between bg-[#0F0F12]">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('records')}
              className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === 'records'
                  ? 'border-white text-white'
                  : 'border-transparent text-[#71717A] hover:text-[#E4E4E7]'
              }`}
            >
              DNS Record Table ({records.length})
            </button>
            <button
              onClick={() => setActiveTab('guide')}
              className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === 'guide'
                  ? 'border-white text-white'
                  : 'border-transparent text-[#71717A] hover:text-[#E4E4E7]'
              }`}
            >
              Registrar Setup Guide
            </button>
          </div>

          {/* Action: Trigger Verification */}
          <button
            id="verify-dns-now-btn"
            onClick={handleVerifyDns}
            disabled={isVerifying}
            className="flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-semibold bg-white hover:bg-[#E4E4E7] text-black shadow-sm transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
            <span>{isVerifying ? 'Testing Zone Records...' : 'Verify DNS Records Now'}</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'records' ? (
            <div className="space-y-4">
              <div className="p-3.5 rounded-md bg-[#18181B] border border-[#27272A] flex items-start gap-3">
                <Info className="w-4 h-4 text-[#A1A1AA] shrink-0 mt-0.5" />
                <div className="text-xs text-[#A1A1AA] leading-relaxed">
                  Add the records below into your DNS host (Cloudflare, Namecheap, Route 53, GoDaddy, etc.).
                  Mailoo uses 2048-bit RSA DKIM cryptographic keys to ensure 100% inbox placement and zero spoofing.
                </div>
              </div>

              {/* Records Table */}
              <div className="border border-[#27272A] rounded-md overflow-hidden bg-[#0A0A0B]">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#18181B] text-[#71717A] font-mono-code uppercase text-[10px] border-b border-[#27272A]">
                      <tr>
                        <th className="py-2.5 px-4 font-semibold">Type</th>
                        <th className="py-2.5 px-4 font-semibold">Host / Name</th>
                        <th className="py-2.5 px-4 font-semibold">Value / Points To</th>
                        <th className="py-2.5 px-3 font-semibold">Priority / TTL</th>
                        <th className="py-2.5 px-4 font-semibold text-center">Status</th>
                        <th className="py-2.5 px-3 text-right">Copy</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#18181B] font-mono-code text-[11px]">
                      {records.map((rec, idx) => (
                        <tr key={idx} className="hover:bg-[#18181B]/50 transition-colors">
                          <td className="py-3 px-4 font-bold text-white">
                            <span className="px-2 py-0.5 rounded bg-[#18181B] border border-[#27272A]">
                              {rec.type}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-medium text-white select-all">
                            {rec.host}
                          </td>
                          <td className="py-3 px-4 text-[#A1A1AA] max-w-xs break-all select-all font-mono-code">
                            {rec.value}
                          </td>
                          <td className="py-3 px-3 text-[#71717A]">
                            {rec.priority !== undefined ? `Pri: ${rec.priority} • ` : ''}TTL: {rec.ttl}s
                          </td>
                          <td className="py-3 px-4 text-center">
                            {rec.isVerified ? (
                              <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-sans font-semibold">
                                <Check className="w-3 h-3" />
                                <span>Verified</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-sans font-semibold">
                                <RefreshCw className="w-3 h-3" />
                                <span>Checking</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => handleCopy(rec.value, idx)}
                              className="p-1.5 rounded bg-[#18181B] hover:bg-[#27272A] text-[#A1A1AA] hover:text-white transition-colors border border-[#27272A]"
                              title="Copy record value"
                            >
                              {copiedIndex === idx ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            /* Setup Guide */
            <div className="space-y-4 text-xs text-[#A1A1AA]">
              <div className="p-4 rounded-md bg-[#18181B] border border-[#27272A] space-y-3">
                <h4 className="font-semibold text-sm text-white flex items-center gap-2">
                  <span>How to configure DNS in 3 minutes</span>
                </h4>
                <ol className="list-decimal list-inside space-y-2 text-[#D4D4D8] leading-relaxed">
                  <li>Log in to your domain registrar (Cloudflare, Namecheap, GoDaddy, Google Domains, Route 53).</li>
                  <li>Navigate to the <strong>DNS Management</strong> or <strong>Zone Editor</strong> section.</li>
                  <li>Copy each record from the table above and create the corresponding <code className="text-white bg-[#0A0A0B] px-1 py-0.5 rounded border border-[#27272A] font-mono-code">MX</code>, <code className="text-white bg-[#0A0A0B] px-1 py-0.5 rounded border border-[#27272A] font-mono-code">TXT</code>, and <code className="text-white bg-[#0A0A0B] px-1 py-0.5 rounded border border-[#27272A] font-mono-code">CNAME</code> records.</li>
                  <li>Click <strong>"Verify DNS Records Now"</strong> above. Mailoo's edge nodes will immediately validate cryptographic resolution.</li>
                </ol>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-md bg-[#18181B] border border-[#27272A]">
                  <div className="font-semibold text-white">Cloudflare</div>
                  <div className="text-[11px] text-[#71717A] mt-1">Set Proxy Status to DNS-Only (Grey Cloud) for MX and DKIM TXT records.</div>
                </div>
                <div className="p-3 rounded-md bg-[#18181B] border border-[#27272A]">
                  <div className="font-semibold text-white">Namecheap</div>
                  <div className="text-[11px] text-[#71717A] mt-1">Under Advanced DNS, add Custom MX (Priority 10) and TXT records.</div>
                </div>
                <div className="p-3 rounded-md bg-[#18181B] border border-[#27272A]">
                  <div className="font-semibold text-white">AWS Route 53</div>
                  <div className="text-[11px] text-[#71717A] mt-1">Create standard Simple Routing Resource Record Sets in your Hosted Zone.</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[#18181B] border-t border-[#27272A] flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-[#71717A] font-mono-code">
            <span>Selector: {domain.dkimSelector || 'mailoo'}</span>
            <span>•</span>
            <span>RSA-2048</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md text-xs font-semibold bg-white hover:bg-[#E4E4E7] text-black transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
