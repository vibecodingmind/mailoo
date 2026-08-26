import React, { useState, useEffect } from 'react';
import {
  Globe,
  Plus,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Trash2,
  RefreshCw,
  Sparkles,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { DnsInspectorModal } from './DnsInspectorModal.js';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import type { Domain } from '../../types.js';

export const DomainManager: React.FC = () => {
  const { domains, refreshAll, organization, showToast } = useAuth();
  const [selectedDomainForDns, setSelectedDomainForDns] = useState<Domain | null>(null);
  const [isAddDomainOpen, setIsAddDomainOpen] = useState(false);
  const [newDomainName, setNewDomainName] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomainName.trim()) return;

    setIsAdding(true);
    try {
      const res = await api.addDomain(newDomainName);
      setNewDomainName('');
      setIsAddDomainOpen(false);
      showToast(`Domain ${res.domain.domainName} added! Configure DNS records now.`, 'success');
      await refreshAll();
      setSelectedDomainForDns(res.domain);
    } catch (err: any) {
      showToast(err.message || 'Failed to add domain', 'error');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteDomain = async (domainId: string, domainName: string) => {
    if (confirm(`Are you sure you want to delete ${domainName}? All associated mailboxes and aliases will be removed.`)) {
      try {
        await api.deleteDomain(domainId);
        showToast(`Deleted ${domainName}`, 'info');
        await refreshAll();
      } catch (err: any) {
        showToast(err.message || 'Failed to delete domain', 'error');
      }
    }
  };

  return (
    <div id="domains-management-view" className="flex-1 bg-[#0A0A0B] overflow-y-auto p-6 sm:p-8 text-[#E4E4E7]">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#27272A] pb-6">
          <div>
            <div className="flex items-center gap-2 text-[#A1A1AA] text-xs font-mono-code font-semibold tracking-wider uppercase mb-1">
              <Globe className="w-4 h-4 text-white" />
              <span>Domain Infrastructure</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Custom Domains & DNS Alignment
            </h1>
            <p className="text-xs text-[#A1A1AA] mt-1 max-w-2xl">
              Connect sovereign domain names. Mailoo automates 2048-bit DKIM key generation, SPF alignment, and DMARC enforcement for 100% email deliverability.
            </p>
          </div>

          <button
            id="add-domain-modal-btn"
            onClick={() => setIsAddDomainOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold bg-white hover:bg-[#E4E4E7] text-black shadow-sm transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Connect New Domain</span>
          </button>
        </div>

        {/* Quota & Status Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-lg bg-[#0F0F12] border border-[#27272A] space-y-1">
            <div className="text-[11px] font-mono-code text-[#71717A] uppercase">Domains Connected</div>
            <div className="text-xl font-bold text-white">
              {domains.length} <span className="text-xs text-[#71717A] font-sans font-normal">/ {organization?.maxDomains || 5} allocated</span>
            </div>
          </div>

          <div className="p-5 rounded-lg bg-[#0F0F12] border border-[#27272A] space-y-1">
            <div className="text-[11px] font-mono-code text-[#71717A] uppercase">Cryptographic Health</div>
            <div className="text-xl font-bold text-emerald-400 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5" />
              <span>100% Aligned</span>
            </div>
          </div>

          <div className="p-5 rounded-lg bg-[#0F0F12] border border-[#27272A] space-y-1">
            <div className="text-[11px] font-mono-code text-[#71717A] uppercase">Current Tier</div>
            <div className="text-xl font-bold text-white uppercase font-mono-code">
              {organization?.plan || 'PRO'}
            </div>
          </div>
        </div>

        {/* Domains List */}
        <div className="space-y-4">
          <h2 className="text-xs uppercase font-mono-code font-bold text-[#71717A] tracking-wider">
            Connected Domain Zones ({domains.length})
          </h2>

          <div className="space-y-3">
            {domains.map((dom) => {
              const isActive = dom.status === 'active';
              return (
                <div
                  key={dom.id}
                  id={`domain-card-${dom.id}`}
                  className="p-5 rounded-lg border border-[#27272A] bg-[#0F0F12] hover:border-[#3F3F46] transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-md bg-[#18181B] border border-[#27272A] text-white">
                        <Globe className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2.5">
                          <span className="font-semibold text-base text-white">{dom.domainName}</span>
                          <span
                            className={`text-[10px] font-mono-code font-bold uppercase px-2 py-0.5 rounded-full border ${
                              isActive
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            }`}
                          >
                            {isActive ? 'Active' : 'Pending DNS'}
                          </span>
                        </div>
                        <div className="text-xs text-[#71717A] font-mono-code mt-0.5">
                          Added {new Date(dom.createdAt).toLocaleDateString()} • Selector: {dom.dkimSelector || 'mailoo'}
                        </div>
                      </div>
                    </div>

                    {/* Cryptographic Badges */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono-code px-2 py-0.5 rounded bg-[#18181B] border border-[#27272A] text-[#D4D4D8]">
                        <CheckCircle2 className={`w-3 h-3 ${dom.mxVerified ? 'text-emerald-400' : 'text-[#71717A]'}`} />
                        <span>MX (10 mail.mailoo.email)</span>
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono-code px-2 py-0.5 rounded bg-[#18181B] border border-[#27272A] text-[#D4D4D8]">
                        <CheckCircle2 className={`w-3 h-3 ${dom.spfVerified ? 'text-emerald-400' : 'text-[#71717A]'}`} />
                        <span>SPF (include:_spf)</span>
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono-code px-2 py-0.5 rounded bg-[#18181B] border border-[#27272A] text-[#D4D4D8]">
                        <CheckCircle2 className={`w-3 h-3 ${dom.dkimVerified ? 'text-emerald-400' : 'text-[#71717A]'}`} />
                        <span>DKIM 2048-bit</span>
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono-code px-2 py-0.5 rounded bg-[#18181B] border border-[#27272A] text-[#D4D4D8]">
                        <CheckCircle2 className={`w-3 h-3 ${dom.dmarcVerified ? 'text-emerald-400' : 'text-[#71717A]'}`} />
                        <span>DMARC (p=quarantine)</span>
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      id={`inspect-dns-btn-${dom.id}`}
                      onClick={() => setSelectedDomainForDns(dom)}
                      className="flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-semibold bg-[#18181B] hover:bg-[#27272A] text-white border border-[#27272A] shadow-sm transition-all"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Configure & Inspect DNS</span>
                    </button>

                    <button
                      onClick={() => handleDeleteDomain(dom.id, dom.domainName)}
                      className="p-2 rounded-md text-[#71717A] hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Delete Domain"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Add Domain Modal */}
      {isAddDomainOpen && (
        <div
          id="add-domain-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs"
        >
          <div className="w-full max-w-md bg-[#0F0F12] border border-[#27272A] rounded-lg shadow-2xl overflow-hidden text-[#E4E4E7]">
            <div className="px-6 py-4 border-b border-[#27272A] bg-[#18181B] flex items-center justify-between">
              <h3 className="font-semibold text-sm text-white">Connect Custom Domain</h3>
              <button onClick={() => setIsAddDomainOpen(false)} className="text-[#71717A] hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleAddDomain} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-mono-code text-[#71717A]">Domain FQDN:</label>
                <input
                  id="new-domain-input"
                  type="text"
                  placeholder="e.g. acme-architecture.com"
                  value={newDomainName}
                  onChange={(e) => setNewDomainName(e.target.value)}
                  className="w-full bg-[#18181B] border border-[#27272A] rounded px-3.5 py-2.5 text-xs text-white placeholder-[#71717A] focus:outline-none focus:border-[#3F3F46]"
                  required
                />
                <p className="text-[11px] text-[#71717A]">
                  Enter your apex domain (e.g. <code className="text-neutral-300 font-mono-code">company.com</code>) or sub-domain (<code className="text-neutral-300 font-mono-code">mail.company.com</code>).
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddDomainOpen(false)}
                  className="px-4 py-2 rounded-md text-xs text-[#A1A1AA] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  id="submit-add-domain-btn"
                  type="submit"
                  disabled={isAdding || !newDomainName.trim()}
                  className="flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold bg-white hover:bg-[#E4E4E7] text-black transition-all disabled:opacity-50"
                >
                  <span>{isAdding ? 'Registering...' : 'Add Domain'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DNS Inspector Modal */}
      {selectedDomainForDns && (
        <DnsInspectorModal
          domain={selectedDomainForDns}
          isOpen={!!selectedDomainForDns}
          onClose={() => setSelectedDomainForDns(null)}
          onVerified={async () => {
            await refreshAll();
          }}
        />
      )}
    </div>
  );
};
