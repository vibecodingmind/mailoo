import React, { useState, useEffect } from 'react';
import {
  Award,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Globe,
  Upload,
  Sparkles,
  ExternalLink,
  Shield,
  FileCheck,
  HelpCircle,
  Image as ImageIcon,
} from 'lucide-react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import type { BimiConfig } from '../../types.js';

export const BimiBrandManager: React.FC = () => {
  const { domains, showToast } = useAuth();
  const [bimiConfigs, setBimiConfigs] = useState<BimiConfig[]>([]);
  const [selectedDomainId, setSelectedDomainId] = useState<string>(domains[0]?.id || '');
  const [svgLogoUrl, setSvgLogoUrl] = useState<string>('https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=120&auto=format&fit=crop&q=80');
  const [vmcCertUrl, setVmcCertUrl] = useState<string>('https://pki.entrust.com/bimi/certificates/atelier-nordic.pem');
  const [selector, setSelector] = useState<string>('default');
  const [isSaving, setIsSaving] = useState(false);
  const [copiedDns, setCopiedDns] = useState(false);

  const fetchBimi = async () => {
    try {
      const res = await api.getBimiConfigs();
      setBimiConfigs(res.configs || []);
      if (res.configs && res.configs.length > 0) {
        const first = res.configs[0];
        setSelectedDomainId(first.domainId);
        setSvgLogoUrl(first.svgLogoUrl);
        setVmcCertUrl(first.vmcCertUrl || '');
        setSelector(first.selector || 'default');
      }
    } catch (err: any) {
      console.error('Failed to load BIMI settings', err);
    }
  };

  useEffect(() => {
    fetchBimi();
  }, []);

  const currentDomain = domains.find((d) => d.id === selectedDomainId) || domains[0];
  const activeBimi = bimiConfigs.find((b) => b.domainId === selectedDomainId);

  const generatedDnsRecord = `default._bimi.${currentDomain?.name || 'atelier-nordic.com'}`;
  const generatedDnsValue = `v=BIMI1; l=${svgLogoUrl}; ${vmcCertUrl ? `a=${vmcCertUrl};` : 'a=;'}`;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDomainId) return;

    setIsSaving(true);
    try {
      await api.saveBimiConfig({
        domainId: selectedDomainId,
        svgLogoUrl,
        vmcCertUrl: vmcCertUrl.trim() || undefined,
        selector,
      });
      showToast('BIMI Brand Indicator & VMC record updated successfully!', 'success');
      await fetchBimi();
    } catch (err: any) {
      showToast(err.message || 'Failed to save BIMI config', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const copyRecord = () => {
    navigator.clipboard.writeText(generatedDnsValue);
    setCopiedDns(true);
    showToast('Copied BIMI DNS record to clipboard', 'info');
    setTimeout(() => setCopiedDns(false), 2000);
  };

  return (
    <div id="bimi-brand-view" className="flex-1 bg-[#0A0A0B] overflow-y-auto p-6 sm:p-8 text-[#E4E4E7]">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#27272A] pb-6">
          <div>
            <div className="flex items-center gap-2 text-[#A1A1AA] text-xs font-mono-code font-semibold tracking-wider uppercase mb-1">
              <Award className="w-4 h-4 text-amber-400" />
              <span>Verified Brand Avatars</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              BIMI & Verified Mark Certificates (VMC)
            </h1>
            <p className="text-xs text-[#A1A1AA] mt-1 max-w-2xl">
              Brand Indicators for Message Identification (BIMI) guarantees your studio logo and official verified blue checkmark appear directly beside your outbound emails across Apple Mail, Gmail, and Yahoo Mail.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-semibold font-mono-code flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>VMC Cryptographically Bound</span>
            </span>
          </div>
        </div>

        {/* Live Client Preview Mockup */}
        <div className="p-6 rounded-lg bg-[#0F0F12] border border-[#27272A] space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs font-mono-code uppercase text-[#71717A] font-semibold">
              Live Inbox Avatar Simulation (Apple Mail / Gmail)
            </div>
            <span className="text-[10px] font-mono-code text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              Verified Checkmark Active
            </span>
          </div>

          <div className="p-4 rounded-md bg-[#18181B] border border-[#27272A] flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <img
                  src={svgLogoUrl}
                  alt="Brand Avatar"
                  className="w-10 h-10 rounded-full object-cover border border-[#3F3F46] bg-black"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
                <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-0.5 shadow-sm text-white" title="Verified Mark Certificate Authenticated">
                  <CheckCircle2 className="w-3 h-3 fill-blue-500 text-white" />
                </div>
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white">Atelier Nordic Studio</span>
                  <span className="text-[10px] text-blue-400 font-mono-code bg-blue-500/10 px-1.5 py-0.2 rounded border border-blue-500/20">
                    ✓ Verified Sender
                  </span>
                </div>
                <div className="text-xs text-[#A1A1AA] truncate font-medium mt-0.5">
                  Holmenkollen Cantilever Structural & BIM Review — CAD Specs Attached
                </div>
              </div>
            </div>

            <div className="text-right text-[10px] font-mono-code text-[#71717A] shrink-0">
              Today 10:42 AM
            </div>
          </div>
        </div>

        {/* Configuration Form */}
        <form onSubmit={handleSave} className="p-6 rounded-lg bg-[#0F0F12] border border-[#27272A] space-y-6">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-white">BIMI Parameters & DNS Deployment</h2>
            <p className="text-xs text-[#A1A1AA]">
              Specify your Tiny SVG Portable/Secure (SVG-P/S) brand vector and public PEM certificate issued by DigiCert or Entrust.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#A1A1AA]">Target Domain</label>
              <select
                value={selectedDomainId}
                onChange={(e) => setSelectedDomainId(e.target.value)}
                className="w-full bg-[#18181B] border border-[#27272A] rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:border-white"
              >
                {domains.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.status})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#A1A1AA]">BIMI Selector</label>
              <input
                type="text"
                value={selector}
                onChange={(e) => setSelector(e.target.value)}
                className="w-full bg-[#18181B] border border-[#27272A] rounded-md px-3 py-2 text-xs font-mono-code text-white focus:outline-none focus:border-white"
                placeholder="default"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#A1A1AA]">SVG Logo URL (SVG-P/S Compliant)</label>
            <input
              type="text"
              value={svgLogoUrl}
              onChange={(e) => setSvgLogoUrl(e.target.value)}
              className="w-full bg-[#18181B] border border-[#27272A] rounded-md px-3 py-2 text-xs font-mono-code text-white focus:outline-none focus:border-white"
              placeholder="https://atelier-nordic.com/bimi-logo.svg"
              required
            />
            <p className="text-[10px] text-[#71717A]">
              Must be square aspect ratio, non-animated SVG Tiny 1.2 format served over HTTPS.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#A1A1AA]">Verified Mark Certificate URL (.PEM)</label>
            <input
              type="text"
              value={vmcCertUrl}
              onChange={(e) => setVmcCertUrl(e.target.value)}
              className="w-full bg-[#18181B] border border-[#27272A] rounded-md px-3 py-2 text-xs font-mono-code text-white focus:outline-none focus:border-white"
              placeholder="https://pki.entrust.com/bimi/certificates/atelier-nordic.pem"
            />
            <p className="text-[10px] text-[#71717A]">
              Optional for self-asserted testing; mandatory for the official verified checkmark on Gmail and Apple Mail.
            </p>
          </div>

          {/* Generated DNS TXT Record Box */}
          <div className="p-4 rounded-md bg-[#18181B] border border-[#27272A] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono-code text-[#A1A1AA] uppercase font-semibold">
                DNS TXT Record to Publish
              </span>
              <button
                type="button"
                onClick={copyRecord}
                className="flex items-center gap-1 text-xs text-white hover:text-white font-medium cursor-pointer"
              >
                {copiedDns ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedDns ? 'Copied' : 'Copy Value'}</span>
              </button>
            </div>

            <div className="space-y-1 text-xs font-mono-code">
              <div className="text-[#71717A]">
                Host / Name: <span className="text-white">{generatedDnsRecord}</span>
              </div>
              <div className="text-[#71717A] break-all">
                Value: <span className="text-emerald-400">{generatedDnsValue}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 bg-white hover:bg-[#E4E4E7] text-black text-xs font-semibold rounded-md shadow-sm transition-all cursor-pointer"
            >
              {isSaving ? 'Saving & Publishing...' : 'Save BIMI Configuration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
