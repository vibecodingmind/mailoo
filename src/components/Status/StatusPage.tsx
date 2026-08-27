import React, { useEffect, useState } from 'react';
import { ArrowLeft, Activity, CheckCircle2, AlertTriangle, MinusCircle } from 'lucide-react';
import { api } from '../../services/api.js';

type CheckStatus = 'operational' | 'degraded' | 'not_configured' | 'down';

interface StatusPayload {
  status: string;
  service: string;
  version: string;
  uptimeSeconds?: number;
  startedAt?: string;
  checks: { id: string; name: string; status: CheckStatus; detail?: string }[];
}

interface StatusPageProps {
  onBack: () => void;
}

function tone(status: string) {
  if (status === 'operational') return 'text-emerald-400';
  if (status === 'degraded') return 'text-amber-400';
  if (status === 'not_configured') return 'text-[#A1A1AA]';
  return 'text-rose-400';
}

function Icon({ status }: { status: string }) {
  if (status === 'operational') return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
  if (status === 'degraded') return <AlertTriangle className="w-4 h-4 text-amber-400" />;
  if (status === 'not_configured') return <MinusCircle className="w-4 h-4 text-[#71717A]" />;
  return <AlertTriangle className="w-4 h-4 text-rose-400" />;
}

function formatUptime(seconds?: number) {
  if (!seconds && seconds !== 0) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 23) return `${Math.floor(h / 24)}d ${h % 24}h`;
  return `${h}h ${m}m`;
}

export const StatusPage: React.FC<StatusPageProps> = ({ onBack }) => {
  const [payload, setPayload] = useState<StatusPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await api.getStatus();
        if (!cancelled) {
          setPayload(data);
          setError(null);
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message || 'Status endpoint unavailable');
      }
    };
    void load();
    const timer = window.setInterval(() => void load(), 30000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const overall = payload?.status || (error ? 'down' : 'operational');

  return (
    <div id="mailoo-status-page" className="min-h-screen bg-[#0A0A0B] text-[#E4E4E7] overflow-y-auto">
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
            <Activity className="w-3.5 h-3.5" />
            Status
          </div>
        </div>
      </header>

      <article className="max-w-3xl mx-auto px-6 py-12 space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-white tracking-tight">System status</h1>
          <p className="text-sm text-[#A1A1AA]">
            Live checks for this Mailoo instance. This preview does not operate public MX; API, datastore, and optional
            copilot are reported honestly.
          </p>
        </div>

        <div className="p-5 rounded-lg border border-[#27272A] bg-[#0F0F12] flex items-center justify-between gap-4">
          <div>
            <div className={`text-sm font-bold uppercase tracking-wide ${tone(overall)}`}>
              {error ? 'Unreachable' : overall.replace('_', ' ')}
            </div>
            <div className="text-xs text-[#71717A] mt-1 font-mono-code">
              {payload?.service || 'Mailoo'} {payload?.version ? `v${payload.version}` : ''} · uptime{' '}
              {formatUptime(payload?.uptimeSeconds)}
            </div>
          </div>
          <Icon status={overall} />
        </div>

        {error && <p className="text-sm text-rose-400">{error}</p>}

        <div className="space-y-2">
          {(payload?.checks || []).map((check) => (
            <div
              key={check.id}
              className="flex items-start justify-between gap-4 p-4 rounded-lg border border-[#27272A] bg-[#0F0F12]"
            >
              <div>
                <div className="text-sm font-semibold text-white">{check.name}</div>
                {check.detail && <p className="text-xs text-[#71717A] mt-1">{check.detail}</p>}
              </div>
              <div className={`text-[11px] font-mono-code uppercase flex items-center gap-1.5 ${tone(check.status)}`}>
                <Icon status={check.status} />
                {check.status.replace('_', ' ')}
              </div>
            </div>
          ))}
        </div>
      </article>
    </div>
  );
};
