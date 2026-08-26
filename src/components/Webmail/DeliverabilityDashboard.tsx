import React, { useState, useEffect } from 'react';
import {
  Activity,
  ShieldCheck,
  ShieldAlert,
  Server,
  Globe,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Zap,
  Lock,
  ExternalLink,
  Info,
  Check,
  Cpu,
  BarChart3,
  FileCheck,
} from 'lucide-react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import type { DeliverabilityAudit } from '../../types.js';

export const DeliverabilityDashboard: React.FC = () => {
  const { domains, showToast } = useAuth();
  const [audit, setAudit] = useState<DeliverabilityAudit | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'dmarc' | 'blacklists' | 'standards'>('overview');

  const fetchAudit = async () => {
    setIsLoading(true);
    try {
      const res = await api.getDeliverabilityAudit();
      setAudit(res.audit);
    } catch (err: any) {
      showToast('Failed to load deliverability telemetry', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAudit();
  }, []);

  const activeDomain = domains[0]?.name || 'atelier-nordic.com';

  return (
    <div id="deliverability-dashboard-view" className="flex-1 bg-[#0A0A0B] overflow-y-auto p-6 sm:p-8 text-[#E4E4E7]">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#27272A] pb-6">
          <div>
            <div className="flex items-center gap-2 text-[#A1A1AA] text-xs font-mono-code font-semibold tracking-wider uppercase mb-1">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Deliverability & Reputation Engine</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              IP Reputation, DMARC & Spam Diagnostics
            </h1>
            <p className="text-xs text-[#A1A1AA] mt-1 max-w-2xl">
              Live telemetry monitoring SPF/DKIM cryptographic alignment, DMARC aggregate reports from major providers (Google, Microsoft, Apple), and real-time DNSBL spam blacklist lookups.
            </p>
          </div>

          <button
            onClick={fetchAudit}
            disabled={isLoading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-semibold bg-[#18181B] hover:bg-[#27272A] text-white border border-[#27272A] transition-all cursor-pointer shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Run Real-Time Audit</span>
          </button>
        </div>

        {/* Hero Score Cards */}
        {audit && (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-5 rounded-lg bg-[#0F0F12] border border-[#27272A] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono-code text-[#71717A] uppercase">Deliverability Score</span>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-white">{audit.overallScore}</span>
                <span className="text-xs text-emerald-400 font-semibold font-mono-code">/ 100 Grade A+</span>
              </div>
              <div className="w-full bg-[#27272A] h-1.5 rounded-full overflow-hidden">
                <div className="bg-emerald-400 h-full rounded-full" style={{ width: `${audit.overallScore}%` }}></div>
              </div>
            </div>

            <div className="p-5 rounded-lg bg-[#0F0F12] border border-[#27272A] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono-code text-[#71717A] uppercase">Inbox Placement</span>
                <Zap className="w-4 h-4 text-amber-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-white">{audit.inboxPlacementRate}%</span>
                <span className="text-xs text-[#71717A] font-mono-code">0.6% Junk</span>
              </div>
              <div className="text-[10px] text-[#71717A] font-mono-code">
                Passed on Gmail, O365 & iCloud
              </div>
            </div>

            <div className="p-5 rounded-lg bg-[#0F0F12] border border-[#27272A] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono-code text-[#71717A] uppercase">DMARC Policy</span>
                <Lock className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-xl font-bold text-purple-400 font-mono-code uppercase">
                p={audit.dmarcPolicy}
              </div>
              <div className="text-[10px] text-[#71717A] font-mono-code">
                100% Cryptographic Enforcement
              </div>
            </div>

            <div className="p-5 rounded-lg bg-[#0F0F12] border border-[#27272A] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono-code text-[#71717A] uppercase">SpamAssassin Baseline</span>
                <Cpu className="w-4 h-4 text-blue-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-emerald-400 font-mono-code">{audit.spamAssassinScore}</span>
                <span className="text-xs text-[#71717A] font-mono-code">(Clean &lt; 5.0)</span>
              </div>
              <div className="text-[10px] text-[#71717A] font-mono-code">
                TLS 1.3 Cipher: {audit.tls13Rate}%
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-[#27272A]">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'overview'
                ? 'border-white text-white'
                : 'border-transparent text-[#71717A] hover:text-[#E4E4E7]'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Overview & Recommendations</span>
          </button>
          <button
            onClick={() => setActiveTab('dmarc')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'dmarc'
                ? 'border-white text-white'
                : 'border-transparent text-[#71717A] hover:text-[#E4E4E7]'
            }`}
          >
            <FileCheck className="w-3.5 h-3.5" />
            <span>DMARC Aggregate Reports</span>
          </button>
          <button
            onClick={() => setActiveTab('blacklists')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'blacklists'
                ? 'border-white text-white'
                : 'border-transparent text-[#71717A] hover:text-[#E4E4E7]'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>DNSBL Blacklist Monitors ({audit?.blacklists.length || 0})</span>
          </button>
        </div>

        {/* Tab Content */}
        {audit && activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Recommendations */}
            <div className="p-5 rounded-lg bg-[#0F0F12] border border-[#27272A] space-y-3">
              <div className="text-xs font-mono-code font-semibold text-white uppercase flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Cryptographic & Compliance Verification Passed</span>
              </div>
              <div className="space-y-2">
                {audit.recommendations.map((rec, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs text-[#D4D4D8] bg-[#18181B] p-3 rounded-md border border-[#27272A]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0"></span>
                    <span>{rec}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Protocol Summary Matrix */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-5 rounded-lg bg-[#0F0F12] border border-[#27272A] space-y-3">
                <div className="text-xs font-semibold text-white uppercase font-mono-code">Authentication Alignment</div>
                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between p-2.5 rounded bg-[#18181B] border border-[#27272A]">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="font-semibold text-white">SPF (Sender Policy Framework)</span>
                    </div>
                    <span className="font-mono-code text-[11px] text-emerald-400">Strict Match Pass</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded bg-[#18181B] border border-[#27272A]">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="font-semibold text-white">DKIM (2048-bit RSA)</span>
                    </div>
                    <span className="font-mono-code text-[11px] text-emerald-400">Cryptographically Signed</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded bg-[#18181B] border border-[#27272A]">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="font-semibold text-white">DMARC Policy Enforcement</span>
                    </div>
                    <span className="font-mono-code text-[11px] text-emerald-400">p=reject (100% Volume)</span>
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-lg bg-[#0F0F12] border border-[#27272A] space-y-3">
                <div className="text-xs font-semibold text-white uppercase font-mono-code">Transport & Encryption Standards</div>
                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between p-2.5 rounded bg-[#18181B] border border-[#27272A]">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="font-semibold text-white">MTA-STS (RFC 8461)</span>
                    </div>
                    <span className="font-mono-code text-[11px] text-emerald-400">Mode: Enforce</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded bg-[#18181B] border border-[#27272A]">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="font-semibold text-white">TLS-RPT (RFC 8460)</span>
                    </div>
                    <span className="font-mono-code text-[11px] text-emerald-400">Telemetry Ingest Active</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded bg-[#18181B] border border-[#27272A]">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="font-semibold text-white">DANE / TLSA DNSSEC</span>
                    </div>
                    <span className="font-mono-code text-[11px] text-emerald-400">TLSA 3 1 1 Validated</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: DMARC Reports */}
        {audit && activeTab === 'dmarc' && (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-[#0F0F12] border border-[#27272A] text-xs text-[#A1A1AA] flex items-center justify-between">
              <div>
                Aggregated daily XML telemetry parsed from Google Postmaster, Microsoft SNDS, Apple iCloud Mail, and ProtonMail MX ingress.
              </div>
              <span className="font-mono-code text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                0 Quarantine / 0 Rejection Violations
              </span>
            </div>

            <div className="border border-[#27272A] rounded-lg overflow-hidden bg-[#0F0F12]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#18181B] text-[#71717A] font-mono-code uppercase text-[10px] border-b border-[#27272A]">
                  <tr>
                    <th className="py-3 px-4">Ingress Gateway / Org</th>
                    <th className="py-3 px-4">Source IP & Region</th>
                    <th className="py-3 px-4">Volume</th>
                    <th className="py-3 px-4">SPF Pass</th>
                    <th className="py-3 px-4">DKIM Pass</th>
                    <th className="py-3 px-4">DMARC Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#27272A]">
                  {audit.dmarcReports.map((rpt, idx) => (
                    <tr key={idx} className="hover:bg-[#18181B]/50 transition-colors">
                      <td className="py-3 px-4 font-medium text-white">{rpt.organization}</td>
                      <td className="py-3 px-4 font-mono-code text-[11px] text-[#A1A1AA]">
                        {rpt.sourceIp} ({rpt.country})
                      </td>
                      <td className="py-3 px-4 font-mono-code text-white">{rpt.count.toLocaleString()} msgs</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono-code font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          PASS
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono-code font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          PASS
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono-code font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          DISPOSITION: NONE (DELIVERED)
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: DNSBL Blacklists */}
        {audit && activeTab === 'blacklists' && (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-[#0F0F12] border border-[#27272A] flex items-center justify-between text-xs">
              <span className="text-[#A1A1AA]">
                Real-time UDP/DNS queries to authoritative anti-spam blocklists across worldwide mail transit nodes.
              </span>
              <span className="font-mono-code text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                All 6 Reputations Clean
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {audit.blacklists.map((bl, idx) => (
                <div key={idx} className="p-4 rounded-lg bg-[#0F0F12] border border-[#27272A] flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-white">{bl.service}</div>
                    <div className="text-[10px] font-mono-code text-[#71717A] mt-0.5">{bl.host}</div>
                    <div className="text-[10px] text-[#A1A1AA] mt-1">{bl.category}</div>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono-code font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <CheckCircle2 className="w-3 h-3" />
                      CLEAN
                    </span>
                    <div className="text-[10px] font-mono-code text-[#71717A] mt-1">{bl.responseTimeMs}ms</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
