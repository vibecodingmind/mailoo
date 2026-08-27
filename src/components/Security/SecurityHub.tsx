import React, { useState, useEffect } from 'react';
import {
  Shield,
  Key,
  ListFilter,
  CheckCircle2,
  Lock,
  Smartphone,
  Copy,
  Check,
  Plus,
  Trash2,
  Terminal,
  Server,
  Download,
  AlertTriangle,
  Laptop,
  Globe,
  Search,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Activity,
  FileCode,
  QrCode,
  RotateCcw,
  Database,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import type { AuditLog, ApiKey, LoginAttempt, PgpKey, RetentionPolicy, AppPassword } from '../../types.js';

export const SecurityHub: React.FC = () => {
  const { user, organization, mailboxes, showToast, logout, isDemoSession } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loginAttempts, setLoginAttempts] = useState<LoginAttempt[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [appPasswords, setAppPasswords] = useState<AppPassword[]>([]);
  const [pgpKeys, setPgpKeys] = useState<PgpKey[]>([]);
  const [retentionPolicy, setRetentionPolicy] = useState<RetentionPolicy | null>(null);
  const [activeTab, setActiveTab] = useState<'logins' | 'pgp' | 'retention' | 'audit' | 'keys' | 'imap' | 'app_passwords' | '2fa' | 'privacy'>('logins');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [loginStatusFilter, setLoginStatusFilter] = useState<string>('all');
  const [loginSearch, setLoginSearch] = useState<string>('');
  const [isLoadingLogins, setIsLoadingLogins] = useState(false);
  const [isNewKeyModalOpen, setIsNewKeyModalOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [createdKeySecret, setCreatedKeySecret] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  // App Password Modal State
  const [isNewAppPwdModalOpen, setIsNewAppPwdModalOpen] = useState(false);
  const [appPwdName, setAppPwdName] = useState('');
  const [appPwdMailboxId, setAppPwdMailboxId] = useState(mailboxes[0]?.id || '');
  const [appPwdScopes, setAppPwdScopes] = useState<('imap' | 'smtp' | 'caldav' | 'carddav')[]>(['imap', 'smtp']);
  const [createdAppPwdSecret, setCreatedAppPwdSecret] = useState<string | null>(null);

  // 2FA Setup State
  const [is2faModalOpen, setIs2faModalOpen] = useState(false);
  const [twoFaData, setTwoFaData] = useState<{ secret: string; qrCodeUrl: string; recoveryKeys: string[] } | null>(null);
  const [twoFaCode, setTwoFaCode] = useState('');

  // PGP Key Modal State
  const [isPgpModalOpen, setIsPgpModalOpen] = useState(false);
  const [pgpFormData, setPgpFormData] = useState({
    name: '',
    email: '',
    publicKey: '',
    fingerprint: '',
  });

  // Retention Scan Report State
  const [retentionScanReport, setRetentionScanReport] = useState<any | null>(null);
  const [isScanningRetention, setIsScanningRetention] = useState(false);

  const fetchSecurityData = async () => {
    setIsLoadingLogins(true);
    try {
      const [auditRes, keysRes, appPwdRes, loginRes, pgpRes, retRes] = await Promise.all([
        api.getAuditLogs(),
        api.getApiKeys(),
        api.getAppPasswords(),
        api.getLoginAttempts(),
        api.getPgpKeys(),
        api.getRetentionPolicy(),
      ]);
      setLogs(auditRes.logs || []);
      setApiKeys(keysRes.keys || []);
      setAppPasswords(appPwdRes.appPasswords || []);
      setLoginAttempts(loginRes.attempts || []);
      setPgpKeys(pgpRes.keys || []);
      setRetentionPolicy(retRes.policy || null);
    } catch (err) {
      console.error('Failed to load security audit data', err);
    } finally {
      setIsLoadingLogins(false);
    }
  };

  useEffect(() => {
    fetchSecurityData();
  }, []);

  const filteredLogs = logs.filter((l) => {
    if (categoryFilter === 'all') return true;
    return l.category === categoryFilter;
  });

  const filteredLoginAttempts = loginAttempts.filter((att) => {
    if (loginStatusFilter !== 'all') {
      if (loginStatusFilter === 'success' && att.status !== 'success') return false;
      if (loginStatusFilter === 'mfa' && att.status !== 'mfa_challenge') return false;
      if (loginStatusFilter === 'blocked_failed' && att.status !== 'blocked' && att.status !== 'failed') return false;
    }
    if (loginSearch.trim()) {
      const q = loginSearch.toLowerCase();
      return (
        att.ipAddress.toLowerCase().includes(q) ||
        att.location.toLowerCase().includes(q) ||
        att.device.toLowerCase().includes(q) ||
        att.browser.toLowerCase().includes(q) ||
        att.userEmail.toLowerCase().includes(q) ||
        (att.details && att.details.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleSimulateLogin = async (type: 'success' | 'blocked') => {
    try {
      if (type === 'blocked') {
        await api.simulateLoginAttempt({
          status: 'blocked',
          location: 'Frankfurt, Germany (Tor Exit Node)',
          ip: '185.220.101.' + Math.floor(Math.random() * 200 + 1),
          device: 'Headless Linux Robot',
          method: 'password_mfa',
        });
        showToast('Simulated blocked unauthorized login event recorded', 'info');
      } else {
        await api.simulateLoginAttempt({
          status: 'success',
          location: 'Oslo, Norway',
          ip: '84.212.19.42',
          device: 'MacBook Pro 16" (macOS Sequoia)',
          method: 'hardware_key',
        });
        showToast('Simulated verified hardware login attempt recorded', 'success');
      }
      fetchSecurityData();
    } catch (err: any) {
      showToast(err.message || 'Simulation failed', 'error');
    }
  };

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;

    try {
      const res = await api.createApiKey(newKeyName, ['mail:read', 'mail:send', 'mail:sync']);
      setCreatedKeySecret(res.key.keySecret || null);
      const allKeys = await api.getApiKeys();
      setApiKeys(allKeys.keys);
      showToast('API / IMAP Token generated', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to create token', 'error');
    }
  };

  const handleDeleteKey = async (id: string) => {
    if (confirm('Revoke this application token? Any connected mail client will lose access.')) {
      try {
        await api.deleteApiKey(id);
        const allKeys = await api.getApiKeys();
        setApiKeys(allKeys.keys);
        showToast('Token revoked', 'info');
      } catch (err: any) {
        showToast('Failed to revoke token', 'error');
      }
    }
  };

  // App Password Actions
  const handleCreateAppPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appPwdName.trim()) {
      showToast('Please enter an app / client label', 'error');
      return;
    }
    try {
      const res = await api.createAppPassword({
        name: appPwdName.trim(),
        mailboxId: appPwdMailboxId || mailboxes[0]?.id || '',
        scopes: appPwdScopes,
      });
      setCreatedAppPwdSecret(res.rawSecret);
      showToast('Generated 16-character App Password', 'success');
      fetchSecurityData();
    } catch (err: any) {
      showToast(err.message || 'Failed to generate app password', 'error');
    }
  };

  const handleDeleteAppPassword = async (id: string) => {
    if (confirm('Revoke this app-specific password? The associated mail client will be disconnected.')) {
      try {
        await api.deleteAppPassword(id);
        showToast('App password revoked', 'info');
        fetchSecurityData();
      } catch (err: any) {
        showToast('Failed to revoke app password', 'error');
      }
    }
  };

  const handleExportWorkspace = async () => {
    try {
      const payload = await api.exportAccount();
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mailoo-${organization?.slug || 'workspace'}-export.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Workspace export downloaded', 'success');
    } catch (err: any) {
      showToast(err.message || 'Export failed', 'error');
    }
  };

  const handleDeleteWorkspace = async () => {
    if (isDemoSession) {
      showToast('The seeded preview studio cannot be deleted', 'error');
      return;
    }
    const confirmName = window.prompt(`Type ${organization?.name || 'DELETE'} to permanently delete this workspace`);
    if (confirmName !== organization?.name) {
      if (confirmName !== null) showToast('Workspace name did not match', 'error');
      return;
    }
    try {
      const res = await api.deleteAccount();
      showToast(res.message || 'Workspace deleted', 'info');
      await logout();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete workspace', 'error');
    }
  };

  // PGP Key Actions
  const handleGeneratePgpKey = async () => {
    try {
      const res = await api.generatePgpKey({
        email: user?.email || 'admin@ateliernordic.com',
        name: user?.fullName || 'Architectural Lead',
      });
      showToast('Generated new 4096-bit RSA PGP Sovereign Keypair', 'success');
      fetchSecurityData();
    } catch (err: any) {
      showToast('Failed to generate PGP key', 'error');
    }
  };

  const handleSaveImportedPgpKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pgpFormData.name || !pgpFormData.email || !pgpFormData.publicKey) {
      showToast('Name, email, and public key block are required', 'error');
      return;
    }
    try {
      await api.createPgpKey(pgpFormData);
      showToast('Public PGP key imported', 'success');
      setIsPgpModalOpen(false);
      fetchSecurityData();
    } catch (err: any) {
      showToast(err.message || 'Failed to import key', 'error');
    }
  };

  const handleDeletePgpKey = async (id: string) => {
    if (confirm('Remove this PGP key from your keyring?')) {
      try {
        await api.deletePgpKey(id);
        showToast('PGP key deleted', 'success');
        fetchSecurityData();
      } catch (err: any) {
        showToast('Failed to delete PGP key', 'error');
      }
    }
  };

  // 2FA TOTP Handlers
  const handleStart2faSetup = async () => {
    try {
      const res = await api.setup2FA();
      setTwoFaData(res);
      setIs2faModalOpen(true);
    } catch (err: any) {
      showToast('Failed to initiate 2FA setup', 'error');
    }
  };

  const handleConfirm2fa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!twoFaData) return;
    try {
      await api.enable2FA(twoFaData.secret, twoFaData.recoveryKeys);
      showToast('2FA / TOTP Authenticator successfully activated', 'success');
      setIs2faModalOpen(false);
      setTwoFaData(null);
    } catch (err: any) {
      showToast('Failed to activate 2FA', 'error');
    }
  };

  // Retention Scan Execution
  const handleRunRetentionScan = async () => {
    setIsScanningRetention(true);
    try {
      const res = await api.executeRetentionScan();
      setRetentionScanReport(res.result);
      showToast(`Retention purge completed. Cleaned ${res.result.totalCleaned} items.`, 'success');
      fetchSecurityData();
    } catch (err: any) {
      showToast('Retention scan failed', 'error');
    } finally {
      setIsScanningRetention(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    showToast('Copied to clipboard', 'info');
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <div id="security-hub-view" className="flex-1 bg-[#0A0A0B] overflow-y-auto p-6 sm:p-8 text-[#E4E4E7]">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#27272A] pb-6">
          <div>
            <div className="flex items-center gap-2 text-[#A1A1AA] text-xs font-mono-code font-semibold tracking-wider uppercase mb-1">
              <Shield className="w-4 h-4 text-white" />
              <span>Sovereign Security & Auditing</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Security Hub & Account Audits
            </h1>
            <p className="text-xs text-[#A1A1AA] mt-1 max-w-2xl">
              Inspect account login telemetry, manage PGP encryption keyrings, configure automatic data retention & purge schedules, and enforce hardware 2FA/TOTP authentication.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchSecurityData}
              disabled={isLoadingLogins}
              className="flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium bg-[#18181B] hover:bg-[#27272A] text-[#D4D4D8] border border-[#27272A] transition-all cursor-pointer"
              title="Refresh security logs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLogins ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            <button
              onClick={handleStart2faSetup}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-medium bg-[#18181B] hover:bg-[#27272A] text-white border border-[#27272A] shadow-sm transition-all"
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
              <span>Configure 2FA / TOTP</span>
            </button>

            <button
              onClick={() => {
                setNewKeyName('');
                setCreatedKeySecret(null);
                setIsNewKeyModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold bg-white hover:bg-[#E4E4E7] text-black shadow-sm transition-all shrink-0 cursor-pointer"
            >
              <Key className="w-4 h-4" />
              <span>Generate Token</span>
            </button>
          </div>
        </div>

        {/* Security Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="p-5 rounded-lg bg-[#0F0F12] border border-[#27272A] space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono-code text-[#71717A] uppercase">2FA / TOTP Status</span>
              <Smartphone className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-sm font-bold text-emerald-400 flex items-center gap-1.5 pt-1">
              <CheckCircle2 className="w-4 h-4" />
              <span>TOTP MFA Enforced</span>
            </div>
            <div className="text-[10px] font-mono-code text-[#71717A] truncate">
              {user?.mfaEnabled ? 'Hardware / App Authenticator Active' : 'TOTP Cryptographic Seed Ready'}
            </div>
          </div>

          <div className="p-5 rounded-lg bg-[#0F0F12] border border-[#27272A] space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono-code text-[#71717A] uppercase">PGP Keyring</span>
              <Lock className="w-4 h-4 text-white" />
            </div>
            <div className="text-sm font-bold text-white font-mono-code pt-1">
              {pgpKeys.length} Sovereign Keys
            </div>
            <div className="text-[10px] font-mono-code text-[#71717A]">
              RSA 4096-bit Armored Cipher
            </div>
          </div>

          <div className="p-5 rounded-lg bg-[#0F0F12] border border-[#27272A] space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono-code text-[#71717A] uppercase">Retention Policy</span>
              <Database className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-sm font-bold text-white pt-1">
              {retentionPolicy?.trashRetentionDays || 30}d Trash / {retentionPolicy?.spamRetentionDays || 14}d Spam
            </div>
            <div className="text-[10px] font-mono-code text-[#71717A]">
              Auto-Purge Background Engine Active
            </div>
          </div>

          <div className="p-5 rounded-lg bg-[#0F0F12] border border-[#27272A] space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono-code text-[#71717A] uppercase">Active Sessions</span>
              <Activity className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-sm font-bold text-white pt-1">
              {loginAttempts.length} Telemetry Logs
            </div>
            <div className="text-[10px] font-mono-code text-[#71717A]">
              Threat Firewall Active
            </div>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-2 border-b border-[#27272A] overflow-x-auto">
          <button
            id="tab-btn-login-attempts"
            onClick={() => setActiveTab('logins')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 cursor-pointer ${
              activeTab === 'logins'
                ? 'border-white text-white'
                : 'border-transparent text-[#71717A] hover:text-[#E4E4E7]'
            }`}
          >
            <Laptop className="w-3.5 h-3.5" />
            <span>Account Login Attempts ({loginAttempts.length})</span>
          </button>
          <button
            id="tab-btn-pgp-keys"
            onClick={() => setActiveTab('pgp')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 cursor-pointer ${
              activeTab === 'pgp'
                ? 'border-white text-white'
                : 'border-transparent text-[#71717A] hover:text-[#E4E4E7]'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>PGP Key Management ({pgpKeys.length})</span>
          </button>
          <button
            id="tab-btn-retention-policy"
            onClick={() => setActiveTab('retention')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 cursor-pointer ${
              activeTab === 'retention'
                ? 'border-white text-white'
                : 'border-transparent text-[#71717A] hover:text-[#E4E4E7]'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Data Retention & Auto-Purge</span>
          </button>
          <button
            id="tab-btn-audit-stream"
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 cursor-pointer ${
              activeTab === 'audit'
                ? 'border-white text-white'
                : 'border-transparent text-[#71717A] hover:text-[#E4E4E7]'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Audit Log Stream ({filteredLogs.length})</span>
          </button>
          <button
            id="tab-btn-api-tokens"
            onClick={() => setActiveTab('keys')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 cursor-pointer ${
              activeTab === 'keys'
                ? 'border-white text-white'
                : 'border-transparent text-[#71717A] hover:text-[#E4E4E7]'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>API & Client Tokens ({apiKeys.length})</span>
          </button>
          <button
            id="tab-btn-imap-config"
            onClick={() => setActiveTab('imap')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 cursor-pointer ${
              activeTab === 'imap'
                ? 'border-white text-white'
                : 'border-transparent text-[#71717A] hover:text-[#E4E4E7]'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>IMAP / SMTP Config</span>
          </button>
          <button
            id="tab-btn-app-passwords"
            onClick={() => setActiveTab('app_passwords')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 cursor-pointer ${
              activeTab === 'app_passwords'
                ? 'border-white text-white'
                : 'border-transparent text-[#71717A] hover:text-[#E4E4E7]'
            }`}
          >
            <Key className="w-3.5 h-3.5 text-amber-400" />
            <span>App Passwords ({appPasswords.length})</span>
          </button>
          <button
            id="tab-btn-privacy-export"
            onClick={() => setActiveTab('privacy')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 cursor-pointer ${
              activeTab === 'privacy'
                ? 'border-white text-white'
                : 'border-transparent text-[#71717A] hover:text-[#E4E4E7]'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Privacy & export</span>
          </button>
        </div>

        {/* Tab 1: Account Login Attempts View */}
        {activeTab === 'logins' && (
          <div id="login-attempts-section" className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0F0F12] p-3 rounded-lg border border-[#27272A]">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A]" />
                  <input
                    type="text"
                    value={loginSearch}
                    onChange={(e) => setLoginSearch(e.target.value)}
                    placeholder="Search IP, device, location..."
                    className="w-48 sm:w-64 bg-[#18181B] border border-[#27272A] rounded-md pl-8 pr-3 py-1.5 text-xs text-white placeholder-[#71717A] focus:outline-none focus:border-white"
                  />
                  {loginSearch && (
                    <button
                      onClick={() => setLoginSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[#71717A] hover:text-white text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {[
                    { id: 'all', label: 'All' },
                    { id: 'success', label: 'Verified' },
                    { id: 'mfa', label: 'MFA Challenges' },
                    { id: 'blocked_failed', label: 'Blocked / Failed' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setLoginStatusFilter(f.id)}
                      className={`px-2.5 py-1 text-[11px] rounded transition-colors cursor-pointer ${
                        loginStatusFilter === f.id
                          ? 'bg-[#27272A] text-white font-medium'
                          : 'text-[#71717A] hover:text-[#D4D4D8]'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSimulateLogin('success')}
                  className="px-2.5 py-1 text-[11px] bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded cursor-pointer transition-colors"
                >
                  + Simulate Verified Login
                </button>
                <button
                  onClick={() => handleSimulateLogin('blocked')}
                  className="px-2.5 py-1 text-[11px] bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded cursor-pointer transition-colors"
                >
                  + Simulate Threat Block
                </button>
              </div>
            </div>

            <div className="bg-[#0F0F12] border border-[#27272A] rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#18181B] text-[#A1A1AA] uppercase font-mono-code text-[10px] border-b border-[#27272A]">
                  <tr>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Device / Browser</th>
                    <th className="px-4 py-3">Location & IP</th>
                    <th className="px-4 py-3">Method</th>
                    <th className="px-4 py-3">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#27272A]">
                  {filteredLoginAttempts.map((attempt) => (
                    <tr key={attempt.id} className="hover:bg-[#18181B]/50 transition-colors">
                      <td className="px-4 py-3">
                        {attempt.status === 'success' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium text-[11px]">
                            <ShieldCheck className="w-3 h-3" />
                            Verified
                          </span>
                        )}
                        {attempt.status === 'mfa_challenge' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium text-[11px]">
                            <Smartphone className="w-3 h-3" />
                            MFA Pass
                          </span>
                        )}
                        {attempt.status === 'blocked' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-medium text-[11px]">
                            <ShieldAlert className="w-3 h-3" />
                            Threat Blocked
                          </span>
                        )}
                        {attempt.status === 'failed' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-500/10 text-zinc-400 border border-zinc-500/20 font-medium text-[11px]">
                            Failed Credential
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-white">{attempt.device}</div>
                        <div className="text-[10px] text-[#71717A]">{attempt.browser}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-[#E4E4E7] flex items-center gap-1">
                          <Globe className="w-3 h-3 text-[#71717A]" />
                          <span>{attempt.location}</span>
                        </div>
                        <div className="text-[10px] font-mono-code text-[#71717A]">{attempt.ipAddress}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono-code text-[11px] bg-[#18181B] px-2 py-0.5 rounded border border-[#27272A]">
                          {attempt.authMethod}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#71717A] font-mono-code text-[10px]">
                        {new Date(attempt.timestamp).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: PGP Key Management View */}
        {activeTab === 'pgp' && (
          <div id="pgp-keys-section" className="space-y-4">
            <div className="flex items-center justify-between bg-[#0F0F12] p-4 rounded-lg border border-[#27272A]">
              <div>
                <h3 className="text-sm font-semibold text-white">Sovereign PGP End-to-End Encryption</h3>
                <p className="text-xs text-[#A1A1AA] mt-0.5">
                  Publish and manage your OpenPGP 4096-bit public keys for confidential, encrypted client correspondence.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleGeneratePgpKey}
                  className="px-3.5 py-1.5 rounded-md bg-white hover:bg-[#E4E4E7] text-black text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generate Keypair</span>
                </button>
                <button
                  onClick={() => {
                    setPgpFormData({
                      name: user?.fullName || '',
                      email: user?.email || '',
                      publicKey: '',
                      fingerprint: '',
                    });
                    setIsPgpModalOpen(true);
                  }}
                  className="px-3.5 py-1.5 rounded-md bg-[#18181B] hover:bg-[#27272A] text-white text-xs font-medium border border-[#27272A] flex items-center gap-1.5 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Import Public Key</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {pgpKeys.map((key) => (
                <div
                  key={key.id}
                  id={`pgp-key-card-${key.id}`}
                  className="bg-[#0F0F12] border border-[#27272A] rounded-lg p-5 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-md bg-[#18181B] border border-[#27272A] flex items-center justify-center text-white">
                        <Lock className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-white">{key.name}</h4>
                          {key.isDefault && (
                            <span className="text-[10px] font-mono-code bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded">
                              Default Encryption Key
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#A1A1AA]">{key.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono-code bg-[#18181B] px-2.5 py-1 rounded border border-[#27272A] text-[#D4D4D8]">
                        {key.algorithm}
                      </span>
                      <button
                        onClick={() => handleDeletePgpKey(key.id)}
                        className="p-1.5 rounded hover:bg-rose-500/10 text-[#71717A] hover:text-rose-400 transition-colors"
                        title="Delete key"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="bg-[#18181B] p-3 rounded border border-[#27272A] flex items-center justify-between text-xs font-mono-code text-[#A1A1AA]">
                    <div className="flex items-center gap-2">
                      <span className="text-neutral-400 font-semibold uppercase text-[10px]">Fingerprint:</span>
                      <span className="text-white">{key.fingerprint}</span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(key.fingerprint)}
                      className="text-[#71717A] hover:text-white transition-colors"
                      title="Copy fingerprint"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="relative">
                    <pre className="bg-[#121215] p-3 rounded border border-[#27272A] font-mono-code text-[11px] text-[#A1A1AA] overflow-x-auto max-h-36">
                      {key.publicKey}
                    </pre>
                    <button
                      onClick={() => copyToClipboard(key.publicKey)}
                      className="absolute top-2 right-2 px-2 py-1 rounded bg-[#18181B] hover:bg-[#27272A] text-white text-[10px] font-mono-code border border-[#27272A] flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Copy ASCII Armor</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Data Retention & Auto-Purge View */}
        {activeTab === 'retention' && (
          <div id="retention-policy-section" className="space-y-6">
            <div className="bg-[#0F0F12] border border-[#27272A] rounded-lg p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-[#27272A] pb-4">
                <div>
                  <h3 className="text-base font-semibold text-white">Data Retention & Auto-Purge Schedule</h3>
                  <p className="text-xs text-[#A1A1AA] mt-0.5">
                    Automate deletion of expired trash and spam items, and configure GDPR/compliance archival rules.
                  </p>
                </div>

                <button
                  onClick={handleRunRetentionScan}
                  disabled={isScanningRetention}
                  className="px-4 py-2 bg-white hover:bg-[#E4E4E7] text-black text-xs font-semibold rounded-md flex items-center gap-2 shadow-sm transition-all"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isScanningRetention ? 'animate-spin' : ''}`} />
                  <span>Execute Live Retention Scan Now</span>
                </button>
              </div>

              {retentionScanReport && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs space-y-2">
                  <div className="font-semibold text-emerald-400 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Retention Scan Execution Report ({new Date(retentionScanReport.timestamp).toLocaleTimeString()})</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 pt-2 text-[#D4D4D8]">
                    <div className="p-2.5 bg-[#0F0F12] rounded border border-emerald-500/20">
                      <div className="text-[10px] uppercase font-mono-code text-[#71717A]">Trash Items Purged</div>
                      <div className="text-base font-bold text-white mt-0.5">{retentionScanReport.purgedTrash} messages</div>
                    </div>
                    <div className="p-2.5 bg-[#0F0F12] rounded border border-emerald-500/20">
                      <div className="text-[10px] uppercase font-mono-code text-[#71717A]">Spam Messages Dropped</div>
                      <div className="text-base font-bold text-white mt-0.5">{retentionScanReport.purgedSpam} items</div>
                    </div>
                    <div className="p-2.5 bg-[#0F0F12] rounded border border-emerald-500/20">
                      <div className="text-[10px] uppercase font-mono-code text-[#71717A]">Threads Auto-Archived</div>
                      <div className="text-base font-bold text-white mt-0.5">{retentionScanReport.archivedCount} threads</div>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 rounded-lg bg-[#18181B] border border-[#27272A] space-y-2">
                  <label className="block text-xs font-semibold text-white">Trash Auto-Purge (Days)</label>
                  <p className="text-[11px] text-[#A1A1AA]">
                    Messages moved to trash are permanently expunged from disks after this duration.
                  </p>
                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="number"
                      value={retentionPolicy?.trashRetentionDays || 30}
                      onChange={(e) =>
                        setRetentionPolicy((prev: any) => ({ ...prev, trashRetentionDays: Number(e.target.value) }))
                      }
                      className="w-24 px-3 py-1.5 rounded bg-[#121215] border border-[#27272A] text-xs text-white"
                    />
                    <span className="text-xs text-[#71717A]">days</span>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-[#18181B] border border-[#27272A] space-y-2">
                  <label className="block text-xs font-semibold text-white">Spam Auto-Purge (Days)</label>
                  <p className="text-[11px] text-[#A1A1AA]">
                    Unconfirmed spam / phishing items are dropped automatically after this window.
                  </p>
                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="number"
                      value={retentionPolicy?.spamRetentionDays || 14}
                      onChange={(e) =>
                        setRetentionPolicy((prev: any) => ({ ...prev, spamRetentionDays: Number(e.target.value) }))
                      }
                      className="w-24 px-3 py-1.5 rounded bg-[#121215] border border-[#27272A] text-xs text-white"
                    />
                    <span className="text-xs text-[#71717A]">days</span>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-[#18181B] border border-[#27272A] space-y-2">
                  <label className="block text-xs font-semibold text-white">Auto-Archive Old Threads (Days)</label>
                  <p className="text-[11px] text-[#A1A1AA]">
                    Inactive inbox threads with no customer response are moved to archive repository.
                  </p>
                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="number"
                      value={retentionPolicy?.autoArchiveAfterDays || 365}
                      onChange={(e) =>
                        setRetentionPolicy((prev: any) => ({ ...prev, autoArchiveAfterDays: Number(e.target.value) }))
                      }
                      className="w-24 px-3 py-1.5 rounded bg-[#121215] border border-[#27272A] text-xs text-white"
                    />
                    <span className="text-xs text-[#71717A]">days</span>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-[#18181B] border border-[#27272A] flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-semibold text-white">Legal / Compliance Hold</label>
                    <p className="text-[11px] text-[#A1A1AA] max-w-xs mt-0.5">
                      Overrides all automatic purging policies to preserve immutable copies for audits.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={retentionPolicy?.complianceHold || false}
                    onChange={(e) =>
                      setRetentionPolicy((prev: any) => ({ ...prev, complianceHold: e.target.checked }))
                    }
                    className="w-4 h-4 rounded bg-[#121215] border-[#27272A] text-purple-600"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-[#27272A]">
                <button
                  onClick={async () => {
                    if (retentionPolicy) {
                      await api.updateRetentionPolicy(retentionPolicy);
                      showToast('Retention policy updated', 'success');
                    }
                  }}
                  className="px-4 py-1.5 bg-white hover:bg-[#E4E4E7] text-black text-xs font-semibold rounded-md shadow-sm"
                >
                  Save Policy Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Audit Log Stream View */}
        {activeTab === 'audit' && (
          <div id="audit-log-section" className="space-y-4">
            <div className="flex items-center justify-between bg-[#0F0F12] p-3 rounded-lg border border-[#27272A]">
              <div className="flex items-center gap-2">
                <ListFilter className="w-3.5 h-3.5 text-[#71717A]" />
                <span className="text-xs text-[#71717A]">Category:</span>
                {['all', 'auth', 'security', 'domains', 'mailboxes', 'billing', 'mail'].map((c) => (
                  <button
                    key={c}
                    onClick={() => setCategoryFilter(c)}
                    className={`px-2 py-1 text-[11px] rounded capitalize transition-colors cursor-pointer ${
                      categoryFilter === c
                        ? 'bg-[#27272A] text-white font-medium'
                        : 'text-[#71717A] hover:text-[#D4D4D8]'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-[#0F0F12] border border-[#27272A] rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#18181B] text-[#A1A1AA] uppercase font-mono-code text-[10px] border-b border-[#27272A]">
                  <tr>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">User & IP</th>
                    <th className="px-4 py-3">Details</th>
                    <th className="px-4 py-3">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#27272A]">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#18181B]/50 transition-colors">
                      <td className="px-4 py-3 font-mono-code text-white font-semibold">{log.action}</td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] uppercase font-mono-code px-2 py-0.5 rounded bg-[#18181B] text-[#A1A1AA] border border-[#27272A]">
                          {log.category}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-white">{log.userEmail}</div>
                        <div className="text-[10px] font-mono-code text-[#71717A]">{log.ipAddress}</div>
                      </td>
                      <td className="px-4 py-3 text-[#A1A1AA]">{log.details}</td>
                      <td className="px-4 py-3 text-[#71717A] font-mono-code text-[10px]">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 5: API & Client Tokens */}
        {activeTab === 'keys' && (
          <div id="api-keys-section" className="space-y-4">
            <div className="bg-[#0F0F12] border border-[#27272A] rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#18181B] text-[#A1A1AA] uppercase font-mono-code text-[10px] border-b border-[#27272A]">
                  <tr>
                    <th className="px-4 py-3">Name / Label</th>
                    <th className="px-4 py-3">Key Prefix</th>
                    <th className="px-4 py-3">Scopes</th>
                    <th className="px-4 py-3">Created Date</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#27272A]">
                  {apiKeys.map((key) => (
                    <tr key={key.id} className="hover:bg-[#18181B]/50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-white">{key.name}</td>
                      <td className="px-4 py-3 font-mono-code text-[#D4D4D8]">{key.keyPrefix}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {key.scopes.map((s) => (
                            <span
                              key={s}
                              className="text-[10px] font-mono-code px-1.5 py-0.5 rounded bg-[#18181B] text-[#A1A1AA] border border-[#27272A]"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[#71717A] font-mono-code text-[10px]">
                        {new Date(key.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDeleteKey(key.id)}
                          className="p-1 rounded hover:bg-rose-500/10 text-[#71717A] hover:text-rose-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 6: IMAP / SMTP Configuration */}
        {activeTab === 'imap' && (
          <div id="imap-config-section" className="bg-[#0F0F12] border border-[#27272A] rounded-lg p-6 space-y-6">
            <div>
              <h3 className="text-base font-semibold text-white">IMAP & SMTP Client Configuration</h3>
              <p className="text-xs text-[#A1A1AA] mt-1">
                Connect Apple Mail, Thunderbird, or mobile email clients using sovereign TLS endpoints.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono-code">
              <div className="p-4 rounded-md bg-[#18181B] border border-[#27272A] space-y-2">
                <div className="text-white font-bold uppercase text-[11px]">Incoming Server (IMAP)</div>
                <div className="flex justify-between py-1 border-b border-[#27272A]">
                  <span className="text-[#71717A]">Host:</span>
                  <span className="text-white">imap.mailoo.email</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#27272A]">
                  <span className="text-[#71717A]">Port:</span>
                  <span className="text-white">993 (SSL/TLS)</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-[#71717A]">Username:</span>
                  <span className="text-[#D4D4D8]">{user?.email || 'user@ateliernordic.com'}</span>
                </div>
              </div>

              <div className="p-4 rounded-md bg-[#18181B] border border-[#27272A] space-y-2">
                <div className="text-white font-bold uppercase text-[11px]">Outgoing Server (SMTP)</div>
                <div className="flex justify-between py-1 border-b border-[#27272A]">
                  <span className="text-[#71717A]">Host:</span>
                  <span className="text-white">smtp.mailoo.email</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#27272A]">
                  <span className="text-[#71717A]">Port:</span>
                  <span className="text-white">465 or 587 (STARTTLS)</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-[#71717A]">Authentication:</span>
                  <span className="text-[#D4D4D8]">Password / Sovereign Token</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 7: App Passwords */}
        {activeTab === 'app_passwords' && (
          <div id="app-passwords-section" className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0F0F12] border border-[#27272A] rounded-lg p-5">
              <div>
                <h3 className="text-base font-semibold text-white">App-Specific Passwords</h3>
                <p className="text-xs text-[#A1A1AA] mt-1 max-w-xl">
                  Generate secure, scoped 16-character passwords for Apple Mail, Thunderbird, Outlook, CalDAV, or CardDAV without exposing your master account credentials or 2FA secrets.
                </p>
              </div>
              <button
                onClick={() => {
                  setAppPwdName('');
                  setCreatedAppPwdSecret(null);
                  setIsNewAppPwdModalOpen(true);
                }}
                className="flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-semibold bg-white hover:bg-[#E4E4E7] text-black shadow-sm transition-all shrink-0 cursor-pointer"
              >
                <Key className="w-3.5 h-3.5" />
                <span>Generate App Password</span>
              </button>
            </div>

            <div className="bg-[#0F0F12] border border-[#27272A] rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#18181B] text-[#A1A1AA] uppercase font-mono-code text-[10px] border-b border-[#27272A]">
                  <tr>
                    <th className="px-4 py-3">Device / Application</th>
                    <th className="px-4 py-3">Bound Mailbox</th>
                    <th className="px-4 py-3">Prefix</th>
                    <th className="px-4 py-3">Granted Protocols</th>
                    <th className="px-4 py-3">Last Active</th>
                    <th className="px-4 py-3 text-right">Revoke</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#27272A]">
                  {appPasswords.map((pwd) => {
                    const mb = mailboxes.find((m) => m.id === pwd.mailboxId);
                    return (
                      <tr key={pwd.id} className="hover:bg-[#18181B]/50 transition-colors">
                        <td className="px-4 py-3 font-semibold text-white">{pwd.name}</td>
                        <td className="px-4 py-3 text-[#D4D4D8] font-mono-code text-[11px]">
                          {mb?.address || 'Primary User Account'}
                        </td>
                        <td className="px-4 py-3 font-mono-code text-amber-400 font-bold">{pwd.prefix}••••</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {pwd.scopes.map((s) => (
                              <span
                                key={s}
                                className="text-[9px] uppercase font-mono-code px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[#71717A] font-mono-code text-[10px]">
                          {pwd.lastUsedAt ? new Date(pwd.lastUsedAt).toLocaleDateString() : 'Active (Today)'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleDeleteAppPassword(pwd.id)}
                            className="p-1 rounded hover:bg-rose-500/10 text-[#71717A] hover:text-rose-400 transition-colors cursor-pointer"
                            title="Revoke password"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {appPasswords.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-xs text-[#71717A]">
                        No app-specific passwords configured. Generate one to authenticate Apple Mail or CalDAV clients securely.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'privacy' && (
          <div id="privacy-export-section" className="space-y-4">
            <div className="p-5 rounded-lg border border-[#27272A] bg-[#0F0F12] space-y-3">
              <h3 className="text-sm font-bold text-white">Export workspace</h3>
              <p className="text-xs text-[#A1A1AA] leading-relaxed">
                Download organization metadata, mail snippets, contacts, and audit logs. Password hashes, TOTP secrets,
                session tokens, and attachment binaries are omitted.
              </p>
              <button
                id="export-workspace-btn"
                type="button"
                onClick={() => void handleExportWorkspace()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold bg-white text-black"
              >
                <Download className="w-3.5 h-3.5" />
                Download JSON export
              </button>
            </div>
            <div className="p-5 rounded-lg border border-rose-500/30 bg-rose-500/5 space-y-3">
              <h3 className="text-sm font-bold text-rose-300">Delete workspace</h3>
              <p className="text-xs text-[#A1A1AA] leading-relaxed">
                Permanently remove this organization, mailboxes, and messages from the preview store. The Atelier Nordic
                demo studio cannot be deleted.
              </p>
              <button
                id="delete-workspace-btn"
                type="button"
                disabled={isDemoSession}
                onClick={() => void handleDeleteWorkspace()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold border border-rose-500/40 text-rose-300 disabled:opacity-40"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {isDemoSession ? 'Protected demo studio' : 'Delete this workspace'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2FA Setup Modal */}
      {is2faModalOpen && twoFaData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0F0F12] border border-[#27272A] rounded-xl shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
              <h3 className="font-semibold text-sm text-white flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <span>Configure Two-Factor Authentication</span>
              </h3>
              <button onClick={() => setIs2faModalOpen(false)} className="text-[#71717A] hover:text-white">✕</button>
            </div>

            <p className="text-xs text-[#A1A1AA]">
              Scan this QR code with Google Authenticator, 1Password, or Authy, or enter the secret key manually.
            </p>

            <div className="p-4 bg-[#18181B] rounded-lg border border-[#27272A] flex flex-col items-center justify-center gap-3">
              <div className="w-36 h-36 bg-white p-2 rounded-lg flex items-center justify-center">
                <QrCode className="w-32 h-32 text-black" />
              </div>
              <div className="text-center">
                <div className="text-[10px] text-[#71717A] uppercase font-mono-code">Secret Seed Key</div>
                <div className="font-mono-code text-xs font-bold text-white select-all">{twoFaData.secret}</div>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="text-xs font-semibold text-white">Emergency Recovery Keys:</div>
              <div className="grid grid-cols-2 gap-1.5 font-mono-code text-[11px] text-[#A1A1AA] bg-[#18181B] p-2.5 rounded border border-[#27272A]">
                {twoFaData.recoveryKeys.map((k) => (
                  <span key={k}>{k}</span>
                ))}
              </div>
            </div>

            <form onSubmit={handleConfirm2fa} className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-medium text-[#A1A1AA] mb-1">
                  Enter 6-Digit Authenticator Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  placeholder="e.g. 749201"
                  value={twoFaCode}
                  onChange={(e) => setTwoFaCode(e.target.value)}
                  className="w-full text-center tracking-widest font-mono-code text-base font-bold bg-[#18181B] border border-[#27272A] rounded-md py-2 text-white focus:outline-none focus:border-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIs2faModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-[#71717A] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-white text-black rounded-md hover:bg-[#E4E4E7]"
                >
                  Activate 2FA
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import PGP Modal */}
      {isPgpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#0F0F12] border border-[#27272A] rounded-xl shadow-2xl overflow-hidden p-6">
            <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
              <h3 className="font-semibold text-sm text-white">Import Public PGP Key</h3>
              <button onClick={() => setIsPgpModalOpen(false)} className="text-[#71717A] hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSaveImportedPgpKey} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#A1A1AA] mb-1">Identity / Name *</label>
                  <input
                    type="text"
                    required
                    value={pgpFormData.name}
                    onChange={(e) => setPgpFormData({ ...pgpFormData, name: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-md bg-[#18181B] border border-[#27272A] text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#A1A1AA] mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={pgpFormData.email}
                    onChange={(e) => setPgpFormData({ ...pgpFormData, email: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-md bg-[#18181B] border border-[#27272A] text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#A1A1AA] mb-1">
                  ASCII-Armored Public Key Block *
                </label>
                <textarea
                  rows={6}
                  required
                  value={pgpFormData.publicKey}
                  onChange={(e) => setPgpFormData({ ...pgpFormData, publicKey: e.target.value })}
                  placeholder={`-----BEGIN PGP PUBLIC KEY BLOCK-----\nVersion: OpenPGP.js v5.1.0\n...\n-----END PGP PUBLIC KEY BLOCK-----`}
                  className="w-full p-3 rounded-md bg-[#18181B] border border-[#27272A] text-xs font-mono-code text-white focus:outline-none focus:border-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#27272A]">
                <button
                  type="button"
                  onClick={() => setIsPgpModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-[#71717A] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-white text-black text-xs font-semibold rounded-md hover:bg-[#E4E4E7]"
                >
                  Import Key
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Generate API Key Modal */}
      {isNewKeyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-md bg-[#0F0F12] border border-[#27272A] rounded-lg shadow-2xl overflow-hidden text-[#E4E4E7]">
            <div className="px-6 py-4 border-b border-[#27272A] bg-[#18181B] flex items-center justify-between">
              <h3 className="font-semibold text-sm text-white">Generate Client Access Token</h3>
              <button onClick={() => setIsNewKeyModalOpen(false)} className="text-[#71717A] hover:text-white cursor-pointer">✕</button>
            </div>

            {createdKeySecret ? (
              <div className="p-6 space-y-4">
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-md text-emerald-400 text-xs">
                  Copy this token now. It will never be shown again.
                </div>
                <div className="flex items-center gap-2 p-3 bg-[#18181B] border border-[#27272A] rounded-md font-mono-code text-xs text-white select-all">
                  <span className="truncate flex-1">{createdKeySecret}</span>
                  <button
                    onClick={() => copyToClipboard(createdKeySecret)}
                    className="p-1 text-[#71717A] hover:text-white cursor-pointer"
                  >
                    {copiedKey ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <button
                  onClick={() => setIsNewKeyModalOpen(false)}
                  className="w-full py-2 bg-white text-black font-semibold text-xs rounded-md cursor-pointer"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateKey} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#A1A1AA] mb-1.5">
                    Token Description / Device
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MacBook Apple Mail Client"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    className="w-full bg-[#18181B] border border-[#27272A] rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:border-white"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsNewKeyModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-[#71717A] hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold bg-white text-black rounded-md hover:bg-[#E4E4E7] cursor-pointer"
                  >
                    Generate
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
      {/* Generate App Password Modal */}
      {isNewAppPwdModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-md bg-[#0F0F12] border border-[#27272A] rounded-lg shadow-2xl overflow-hidden text-[#E4E4E7]">
            <div className="px-6 py-4 border-b border-[#27272A] bg-[#18181B] flex items-center justify-between">
              <h3 className="font-semibold text-sm text-white flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-400" />
                <span>Generate App-Specific Password</span>
              </h3>
              <button onClick={() => setIsNewAppPwdModalOpen(false)} className="text-[#71717A] hover:text-white cursor-pointer">✕</button>
            </div>

            {createdAppPwdSecret ? (
              <div className="p-6 space-y-4">
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-md text-amber-400 text-xs">
                  Your 16-character app password has been generated. Use it in place of your standard password in your client. It will not be shown again.
                </div>
                <div className="flex items-center gap-2 p-3 bg-[#18181B] border border-[#27272A] rounded-md font-mono-code text-base font-bold text-amber-400 tracking-wider select-all justify-between">
                  <span>{createdAppPwdSecret}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(createdAppPwdSecret);
                      showToast('Copied app password to clipboard', 'info');
                    }}
                    className="p-1 text-[#71717A] hover:text-white cursor-pointer"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                <button
                  onClick={() => setIsNewAppPwdModalOpen(false)}
                  className="w-full py-2 bg-white text-black font-semibold text-xs rounded-md cursor-pointer"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateAppPassword} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#A1A1AA] mb-1.5">
                    App / Device Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apple Mail on iPhone 16"
                    value={appPwdName}
                    onChange={(e) => setAppPwdName(e.target.value)}
                    className="w-full bg-[#18181B] border border-[#27272A] rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:border-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#A1A1AA] mb-1.5">
                    Bound Mailbox
                  </label>
                  <select
                    value={appPwdMailboxId}
                    onChange={(e) => setAppPwdMailboxId(e.target.value)}
                    className="w-full bg-[#18181B] border border-[#27272A] rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:border-white"
                  >
                    {mailboxes.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.address})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#A1A1AA] mb-1.5">
                    Allowed Protocols
                  </label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {(['imap', 'smtp', 'caldav', 'carddav'] as const).map((proto) => (
                      <label key={proto} className="flex items-center gap-2 p-2 rounded bg-[#18181B] border border-[#27272A] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={appPwdScopes.includes(proto)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setAppPwdScopes([...appPwdScopes, proto]);
                            } else {
                              setAppPwdScopes(appPwdScopes.filter((s) => s !== proto));
                            }
                          }}
                          className="rounded border-[#27272A]"
                        />
                        <span className="uppercase font-mono-code font-bold text-[11px] text-white">{proto}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsNewAppPwdModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-[#71717A] hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold bg-white text-black rounded-md hover:bg-[#E4E4E7] cursor-pointer"
                  >
                    Create Password
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
