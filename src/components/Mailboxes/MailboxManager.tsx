import React, { useState, useEffect } from 'react';
import {
  Mail,
  Plus,
  Trash2,
  Edit3,
  HardDrive,
  CheckCircle2,
  Users,
  Repeat,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Shield,
  Clock,
  ArrowRight,
  Calendar,
  Send,
  Save,
  Info,
  CalendarRange,
  FileText,
  UserCheck,
} from 'lucide-react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import type { Mailbox, Alias, VacationResponder } from '../../types.js';

export const MailboxManager: React.FC = () => {
  const { mailboxes, domains, refreshAll, organization, showToast } = useAuth();
  const [aliases, setAliases] = useState<Alias[]>([]);
  const [activeTab, setActiveTab] = useState<'mailboxes' | 'aliases' | 'autoreply'>('mailboxes');

  // Create mailbox form state
  const [isAddMailboxOpen, setIsAddMailboxOpen] = useState(false);
  const [mailboxDomainId, setMailboxDomainId] = useState(domains[0]?.id || '');
  const [mailboxUsername, setMailboxUsername] = useState('');
  const [mailboxFullName, setMailboxFullName] = useState('');
  const [mailboxType, setMailboxType] = useState<'individual' | 'shared'>('individual');
  const [mailboxQuota, setMailboxQuota] = useState(25000);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Create alias form state
  const [isAddAliasOpen, setIsAddAliasOpen] = useState(false);
  const [aliasDomainId, setAliasDomainId] = useState(domains[0]?.id || '');
  const [aliasPrefix, setAliasPrefix] = useState('');
  const [aliasTargetMailboxId, setAliasTargetMailboxId] = useState(mailboxes[0]?.id || '');
  const [aliasDescription, setAliasDescription] = useState('');

  // Edit Mailbox Signature modal
  const [editingMailbox, setEditingMailbox] = useState<Mailbox | null>(null);
  const [editSignature, setEditSignature] = useState('');
  const [editAutoReply, setEditAutoReply] = useState(false);
  const [editAutoReplySubject, setEditAutoReplySubject] = useState('');
  const [editAutoReplyBody, setEditAutoReplyBody] = useState('');

  // Dedicated Auto-Reply Tab State
  const [selectedAutoReplyMailboxId, setSelectedAutoReplyMailboxId] = useState<string>(
    mailboxes[0]?.id || ''
  );
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(false);
  const [autoReplySubject, setAutoReplySubject] = useState('');
  const [autoReplyBody, setAutoReplyBody] = useState('');
  const [autoReplyStartDate, setAutoReplyStartDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [autoReplyEndDate, setAutoReplyEndDate] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
  );
  const [autoReplyOnlyContacts, setAutoReplyOnlyContacts] = useState(false);
  const [isSavingAutoReply, setIsSavingAutoReply] = useState(false);

  // Sync selected mailbox in auto-reply tab
  useEffect(() => {
    if (mailboxes.length > 0) {
      const activeMb = mailboxes.find((m) => m.id === selectedAutoReplyMailboxId) || mailboxes[0];
      if (activeMb) {
        setSelectedAutoReplyMailboxId(activeMb.id);
        setAutoReplyEnabled(activeMb.autoReplyEnabled || Boolean(activeMb.vacationResponder?.isEnabled));
        setAutoReplySubject(
          activeMb.autoReplySubject ||
            activeMb.vacationResponder?.subject ||
            'Out of Office: Thank you for your message'
        );
        setAutoReplyBody(
          activeMb.autoReplyBody ||
            activeMb.vacationResponder?.bodyText ||
            `Hello,\n\nI am currently away from the office with limited access to email. I will respond to your message promptly upon my return.\n\nFor urgent design inquiries, please contact our studio desk at concierge@mailoo.email.\n\nWarm regards.`
        );
        if (activeMb.vacationResponder?.startDate) {
          setAutoReplyStartDate(activeMb.vacationResponder.startDate.split('T')[0]);
        }
        if (activeMb.vacationResponder?.endDate) {
          setAutoReplyEndDate(activeMb.vacationResponder.endDate.split('T')[0]);
        }
        setAutoReplyOnlyContacts(Boolean(activeMb.vacationResponder?.onlyKnownContacts));
      }
    }
  }, [selectedAutoReplyMailboxId, mailboxes]);

  const fetchAliases = async () => {
    try {
      const res = await api.getAliases();
      setAliases(res.aliases);
    } catch (err) {
      console.error('Failed to fetch aliases', err);
    }
  };

  useEffect(() => {
    fetchAliases();
  }, []);

  const handleCreateMailbox = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mailboxUsername.trim() || !mailboxDomainId) return;

    setIsSubmitting(true);
    try {
      await api.createMailbox({
        domainId: mailboxDomainId,
        username: mailboxUsername,
        name: mailboxFullName,
        type: mailboxType,
        quotaMb: mailboxQuota,
      });

      setMailboxUsername('');
      setMailboxFullName('');
      setIsAddMailboxOpen(false);
      showToast('Mailbox created successfully!', 'success');
      await refreshAll();
    } catch (err: any) {
      showToast(err.message || 'Failed to create mailbox', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMailbox = async (id: string, email: string) => {
    if (confirm(`Are you sure you want to permanently delete ${email}? All stored emails will be removed.`)) {
      try {
        await api.deleteMailbox(id);
        showToast(`Deleted ${email}`, 'info');
        await refreshAll();
      } catch (err: any) {
        showToast(err.message || 'Failed to delete mailbox', 'error');
      }
    }
  };

  const handleCreateAlias = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aliasPrefix.trim() || !aliasTargetMailboxId || !aliasDomainId) return;

    setIsSubmitting(true);
    try {
      await api.createAlias({
        domainId: aliasDomainId,
        aliasPrefix,
        targetMailboxId: aliasTargetMailboxId,
        description: aliasDescription,
      });

      setAliasPrefix('');
      setAliasDescription('');
      setIsAddAliasOpen(false);
      showToast('Routing alias created!', 'success');
      await fetchAliases();
    } catch (err: any) {
      showToast(err.message || 'Failed to create alias', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleAlias = async (alias: Alias) => {
    try {
      await api.updateAlias(alias.id, { isEnabled: !alias.isEnabled });
      await fetchAliases();
      showToast(`Alias ${alias.aliasAddress} ${!alias.isEnabled ? 'enabled' : 'disabled'}`, 'info');
    } catch (err: any) {
      showToast('Failed to toggle alias', 'error');
    }
  };

  const handleDeleteAlias = async (id: string, address: string) => {
    if (confirm(`Remove alias ${address}?`)) {
      try {
        await api.deleteAlias(id);
        await fetchAliases();
        showToast(`Removed alias ${address}`, 'info');
      } catch (err: any) {
        showToast('Failed to delete alias', 'error');
      }
    }
  };

  const handleSaveMailboxSettings = async () => {
    if (!editingMailbox) return;
    try {
      await api.updateMailbox(editingMailbox.id, {
        signature: editSignature,
        autoReplyEnabled: editAutoReply,
        autoReplySubject: editAutoReplySubject,
        autoReplyBody: editAutoReplyBody,
      });

      showToast('Mailbox settings saved', 'success');
      setEditingMailbox(null);
      await refreshAll();
    } catch (err: any) {
      showToast('Failed to update mailbox', 'error');
    }
  };

  const handleSaveDedicatedAutoReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAutoReplyMailboxId) return;

    setIsSavingAutoReply(true);
    try {
      const vacationConfig: VacationResponder = {
        isEnabled: autoReplyEnabled,
        startDate: new Date(autoReplyStartDate).toISOString(),
        endDate: new Date(autoReplyEndDate).toISOString(),
        subject: autoReplySubject,
        bodyText: autoReplyBody,
        onlyKnownContacts: autoReplyOnlyContacts,
      };

      await api.updateMailbox(selectedAutoReplyMailboxId, {
        autoReplyEnabled,
        autoReplySubject,
        autoReplyBody,
        vacationResponder: vacationConfig,
      });

      showToast(
        autoReplyEnabled
          ? 'Out-of-office auto-reply enabled and scheduled!'
          : 'Out-of-office auto-reply disabled',
        'success'
      );
      await refreshAll();
    } catch (err: any) {
      showToast(err.message || 'Failed to save auto-reply settings', 'error');
    } finally {
      setIsSavingAutoReply(false);
    }
  };

  // Preset message templates for auto-reply
  const applyPresetTemplate = (type: 'vacation' | 'conference' | 'sabbatical' | 'parental') => {
    switch (type) {
      case 'vacation':
        setAutoReplySubject('Out of Office: Annual Sabbatical & Studio Break');
        setAutoReplyBody(
          `Hello,\n\nThank you for reaching out. I am currently out of the office on annual leave with no access to email until ${autoReplyEndDate}.\n\nFor urgent project inquiries or emergency deliverables, please reach out to our primary team at concierge@mailoo.email.\n\nWarm regards,\nAlex Vance`
        );
        break;
      case 'conference':
        setAutoReplySubject('Attending Architecture Summit (Delayed Response)');
        setAutoReplyBody(
          `Hello,\n\nI am currently attending the International Architecture & Design Summit through ${autoReplyEndDate}. I will have intermittent email access throughout the day.\n\nIf your request requires immediate attention, please flag the subject as [URGENT] or contact our studio desk.\n\nBest,\nAlex Vance`
        );
        break;
      case 'sabbatical':
        setAutoReplySubject('Out of Office: Research & Design Residency');
        setAutoReplyBody(
          `Dear colleague,\n\nI am on dedicated research residency focusing on low-carbon timber construction through ${autoReplyEndDate}. Email is checked weekly.\n\nFor urgent administrative matters, our operations team will assist you.\n\nSincerely,\nAlex Vance`
        );
        break;
      case 'parental':
        setAutoReplySubject('Out of Office: Parental Leave');
        setAutoReplyBody(
          `Hello,\n\nI am currently on parental leave and will not be monitoring inbox communications. During my absence, please direct all questions regarding ongoing projects to our team.\n\nWarm regards.`
        );
        break;
    }
    showToast('Applied message template', 'info');
  };

  const selectedMailboxObj = mailboxes.find((m) => m.id === selectedAutoReplyMailboxId) || mailboxes[0];

  return (
    <div id="mailboxes-management-view" className="flex-1 bg-[#0A0A0B] overflow-y-auto p-6 sm:p-8 text-[#E4E4E7]">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#27272A] pb-6">
          <div>
            <div className="flex items-center gap-2 text-[#A1A1AA] text-xs font-mono-code font-semibold tracking-wider uppercase mb-1">
              <Mail className="w-4 h-4 text-white" />
              <span>Mailbox Directory & Routing</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Mailboxes, Aliases & Out-of-Office Auto-Replies
            </h1>
            <p className="text-xs text-[#A1A1AA] mt-1 max-w-2xl">
              Manage sovereign inboxes, shared team mailboxes, forwarding aliases, and automated out-of-office vacation responders.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="create-mailbox-btn"
              onClick={() => {
                setMailboxDomainId(domains[0]?.id || '');
                setIsAddMailboxOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold bg-white hover:bg-[#E4E4E7] text-black shadow-sm transition-all shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Mailbox</span>
            </button>
            <button
              id="create-alias-btn"
              onClick={() => {
                setAliasDomainId(domains[0]?.id || '');
                setAliasTargetMailboxId(mailboxes[0]?.id || '');
                setIsAddAliasOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold bg-[#18181B] hover:bg-[#27272A] text-white border border-[#27272A] transition-all shrink-0 cursor-pointer"
            >
              <Repeat className="w-4 h-4" />
              <span>New Alias</span>
            </button>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-2 border-b border-[#27272A]">
          <button
            id="tab-mailboxes-btn"
            onClick={() => setActiveTab('mailboxes')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'mailboxes'
                ? 'border-white text-white'
                : 'border-transparent text-[#71717A] hover:text-[#E4E4E7]'
            }`}
          >
            Mailboxes ({mailboxes.length})
          </button>
          <button
            id="tab-aliases-btn"
            onClick={() => setActiveTab('aliases')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'aliases'
                ? 'border-white text-white'
                : 'border-transparent text-[#71717A] hover:text-[#E4E4E7]'
            }`}
          >
            Forwarding Aliases ({aliases.length})
          </button>
          <button
            id="tab-autoreply-btn"
            onClick={() => setActiveTab('autoreply')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'autoreply'
                ? 'border-white text-white'
                : 'border-transparent text-[#71717A] hover:text-[#E4E4E7]'
            }`}
          >
            <CalendarRange className="w-3.5 h-3.5" />
            <span>Auto-Reply & Out of Office</span>
            {mailboxes.some((m) => m.autoReplyEnabled) && (
              <span className="w-2 h-2 rounded-full bg-amber-400 ml-1"></span>
            )}
          </button>
        </div>

        {/* Tab 1: Mailboxes */}
        {activeTab === 'mailboxes' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3">
              {mailboxes.map((mb) => {
                const usedPercent = Math.min(100, Math.round((mb.usedMb / mb.quotaMb) * 100));
                return (
                  <div
                    key={mb.id}
                    id={`mailbox-card-${mb.id}`}
                    className="p-5 rounded-lg border border-[#27272A] bg-[#0F0F12] hover:border-[#3F3F46] transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm"
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="w-10 h-10 rounded-md bg-[#18181B] border border-[#27272A] flex items-center justify-center font-bold text-white shrink-0">
                        {mb.type === 'shared' ? <Users className="w-5 h-5" /> : <Mail className="w-5 h-5" />}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-white">{mb.name}</span>
                          <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-[#18181B] border border-[#27272A] text-[#A1A1AA] uppercase font-semibold">
                            {mb.type}
                          </span>
                          {mb.autoReplyEnabled && (
                            <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Auto-Reply Active
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-[#D4D4D8] font-mono-code">
                          {mb.emailAddress}
                        </div>
                        <div className="text-[11px] text-[#71717A] flex items-center gap-2 pt-0.5">
                          <span>Quota: {(mb.quotaMb / 1024).toFixed(0)} GB</span>
                          <span>•</span>
                          <span>{(mb.usedMb / 1024).toFixed(2)} GB used ({usedPercent}%)</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          setSelectedAutoReplyMailboxId(mb.id);
                          setActiveTab('autoreply');
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-[#18181B] hover:bg-[#27272A] text-[#A1A1AA] hover:text-white border border-[#27272A] transition-colors cursor-pointer"
                      >
                        <CalendarRange className="w-3.5 h-3.5" />
                        <span>Auto-Reply</span>
                      </button>

                      <button
                        onClick={() => {
                          setEditingMailbox(mb);
                          setEditSignature(mb.signature || '');
                          setEditAutoReply(mb.autoReplyEnabled);
                          setEditAutoReplySubject(mb.autoReplySubject || '');
                          setEditAutoReplyBody(mb.autoReplyBody || '');
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-[#18181B] hover:bg-[#27272A] text-white border border-[#27272A] transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Signature</span>
                      </button>

                      <button
                        onClick={() => handleDeleteMailbox(mb.id, mb.emailAddress)}
                        className="p-2 rounded-md text-[#71717A] hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="Delete mailbox"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2: Aliases */}
        {activeTab === 'aliases' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3">
              {aliases.length === 0 ? (
                <div className="p-12 text-center text-[#71717A] space-y-2 border border-dashed border-[#27272A] rounded-lg">
                  <Repeat className="w-8 h-8 mx-auto text-[#71717A]" />
                  <div className="text-sm font-medium text-white">No Forwarding Aliases Created</div>
                  <p className="text-xs text-[#71717A]">Create unlimited zero-overhead email aliases that route into your primary mailboxes.</p>
                </div>
              ) : (
                aliases.map((alias) => (
                  <div
                    key={alias.id}
                    className="p-4 rounded-lg border border-[#27272A] bg-[#0F0F12] flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-md bg-[#18181B] border border-[#27272A] text-white">
                        <Repeat className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono-code font-bold text-xs text-white">{alias.aliasAddress}</span>
                          <span className="text-[#71717A] text-xs">→</span>
                          <span className="font-mono-code text-xs text-[#E4E4E7]">{alias.targetEmail}</span>
                        </div>
                        <div className="text-[11px] text-[#71717A] mt-0.5">{alias.description}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleToggleAlias(alias)}
                        className={`text-xs px-2.5 py-1 rounded-full font-mono-code border transition-colors cursor-pointer ${
                          alias.isEnabled
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-[#18181B] text-[#71717A] border-[#27272A]'
                        }`}
                      >
                        {alias.isEnabled ? 'Active' : 'Disabled'}
                      </button>

                      <button
                        onClick={() => handleDeleteAlias(alias.id, alias.aliasAddress)}
                        className="p-1.5 text-[#71717A] hover:text-rose-400 cursor-pointer"
                        title="Delete alias"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Dedicated Auto-Reply & Out-of-Office */}
        {activeTab === 'autoreply' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Mailbox Selector */}
            <div className="p-5 rounded-xl bg-[#0F0F12] border border-[#27272A] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-sm text-white flex items-center gap-2">
                    <CalendarRange className="w-4 h-4 text-amber-400" />
                    <span>Out-of-Office & Vacation Auto-Responder</span>
                  </h3>
                  <p className="text-xs text-[#71717A] mt-0.5">
                    Automatically reply to inbound messages with custom dates and personalized notifications when away from the studio.
                  </p>
                </div>

                {/* Mailbox Picker */}
                <div className="flex items-center gap-2 shrink-0">
                  <label className="text-xs font-mono-code text-[#71717A]">Target Mailbox:</label>
                  <select
                    value={selectedAutoReplyMailboxId}
                    onChange={(e) => setSelectedAutoReplyMailboxId(e.target.value)}
                    className="bg-[#18181B] border border-[#27272A] rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-white"
                  >
                    {mailboxes.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.emailAddress} {m.autoReplyEnabled ? '(Active)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Auto-Responder Settings Form */}
            <form onSubmit={handleSaveDedicatedAutoReply} className="space-y-6">
              {/* Toggle Switch Card */}
              <div className="p-5 rounded-xl bg-[#0F0F12] border border-[#27272A] flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="font-semibold text-sm text-white flex items-center gap-2">
                    <span>Enable Out-of-Office Auto-Responder</span>
                    {autoReplyEnabled ? (
                      <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                        ON
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-[#18181B] text-[#71717A] border border-[#27272A]">
                        OFF
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#71717A]">
                    When active, Mailoo will send automated responses to inbound senders during your absence.
                  </p>
                </div>

                <button
                  type="button"
                  id="toggle-autoreply-switch"
                  onClick={() => setAutoReplyEnabled(!autoReplyEnabled)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    autoReplyEnabled ? 'bg-white' : 'bg-[#27272A]'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-black shadow-lg ring-0 transition duration-200 ease-in-out ${
                      autoReplyEnabled ? 'translate-x-5 bg-black' : 'translate-x-0 bg-[#71717A]'
                    }`}
                  />
                </button>
              </div>

              {/* Date Range Configuration */}
              <div className="p-5 rounded-xl bg-[#0F0F12] border border-[#27272A] space-y-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#A1A1AA]" />
                  <h4 className="text-xs font-semibold text-white uppercase tracking-wider font-mono-code">
                    Active Date Range Schedule
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono-code text-[#71717A] flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Start Date:</span>
                    </label>
                    <input
                      type="date"
                      value={autoReplyStartDate}
                      onChange={(e) => setAutoReplyStartDate(e.target.value)}
                      className="w-full bg-[#18181B] border border-[#27272A] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-white"
                      disabled={!autoReplyEnabled}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-mono-code text-[#71717A] flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>End Date (Return Date):</span>
                    </label>
                    <input
                      type="date"
                      value={autoReplyEndDate}
                      onChange={(e) => setAutoReplyEndDate(e.target.value)}
                      className="w-full bg-[#18181B] border border-[#27272A] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-white"
                      disabled={!autoReplyEnabled}
                    />
                  </div>
                </div>
              </div>

              {/* Custom Message Content */}
              <div className="p-5 rounded-xl bg-[#0F0F12] border border-[#27272A] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#A1A1AA]" />
                    <h4 className="text-xs font-semibold text-white uppercase tracking-wider font-mono-code">
                      Auto-Response Subject & Body
                    </h4>
                  </div>

                  {/* Preset Template Buttons */}
                  <div className="flex items-center gap-1.5 overflow-x-auto">
                    <span className="text-[10px] font-mono-code text-[#71717A] mr-1 hidden sm:inline">
                      Templates:
                    </span>
                    <button
                      type="button"
                      onClick={() => applyPresetTemplate('vacation')}
                      className="px-2 py-1 rounded bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] text-[11px] text-[#A1A1AA] hover:text-white transition-colors cursor-pointer"
                    >
                      Vacation
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPresetTemplate('conference')}
                      className="px-2 py-1 rounded bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] text-[11px] text-[#A1A1AA] hover:text-white transition-colors cursor-pointer"
                    >
                      Conference
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPresetTemplate('sabbatical')}
                      className="px-2 py-1 rounded bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] text-[11px] text-[#A1A1AA] hover:text-white transition-colors cursor-pointer"
                    >
                      Sabbatical
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono-code text-[#71717A]">Subject Line:</label>
                    <input
                      type="text"
                      value={autoReplySubject}
                      onChange={(e) => setAutoReplySubject(e.target.value)}
                      placeholder="e.g. Out of Office: Thank you for reaching out"
                      className="w-full bg-[#18181B] border border-[#27272A] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-white font-medium"
                      disabled={!autoReplyEnabled}
                      required={autoReplyEnabled}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-mono-code text-[#71717A]">Message Body:</label>
                    <textarea
                      rows={6}
                      value={autoReplyBody}
                      onChange={(e) => setAutoReplyBody(e.target.value)}
                      placeholder="Write your custom out-of-office message..."
                      className="w-full bg-[#18181B] border border-[#27272A] rounded-lg p-3 text-xs text-[#E4E4E7] focus:outline-none focus:border-white leading-relaxed font-sans"
                      disabled={!autoReplyEnabled}
                      required={autoReplyEnabled}
                    />
                  </div>
                </div>

                {/* Additional Settings / Scoping */}
                <div className="pt-3 border-t border-[#27272A] space-y-2.5">
                  <label className="flex items-center gap-2.5 text-xs text-[#D4D4D8] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoReplyOnlyContacts}
                      onChange={(e) => setAutoReplyOnlyContacts(e.target.checked)}
                      className="w-4 h-4 accent-white rounded"
                      disabled={!autoReplyEnabled}
                    />
                    <span>Only send auto-reply to people in my Address Book Contacts</span>
                  </label>

                  <div className="flex items-center gap-2 text-[11px] text-[#71717A] bg-[#141418] p-2.5 rounded-md border border-[#27272A]">
                    <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>
                      Rate Limiter Active: Mailoo automatically sends at most one auto-reply per sender every 24 hours to prevent email loops.
                    </span>
                  </div>
                </div>
              </div>

              {/* Submit / Save Bar */}
              <div className="flex items-center justify-between gap-4">
                <div className="text-xs text-[#71717A]">
                  Changes apply immediately for mailbox <span className="text-white font-mono-code">{selectedMailboxObj?.emailAddress}</span>.
                </div>

                <button
                  type="submit"
                  id="save-autoreply-btn"
                  disabled={isSavingAutoReply}
                  className="px-6 py-2.5 rounded-lg text-xs font-semibold bg-white hover:bg-[#E4E4E7] text-black shadow-md flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingAutoReply ? 'Saving Settings...' : 'Save Auto-Reply'}</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Add Mailbox Modal */}
      {isAddMailboxOpen && (
        <div
          id="add-mailbox-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs"
        >
          <div className="w-full max-w-md bg-[#0F0F12] border border-[#27272A] rounded-lg shadow-2xl overflow-hidden text-[#E4E4E7]">
            <div className="px-6 py-4 border-b border-[#27272A] bg-[#18181B] flex items-center justify-between">
              <h3 className="font-semibold text-sm text-white">Create New Mailbox</h3>
              <button onClick={() => setIsAddMailboxOpen(false)} className="text-[#71717A] hover:text-white cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleCreateMailbox} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-mono-code text-[#71717A]">Select Domain:</label>
                <select
                  value={mailboxDomainId}
                  onChange={(e) => setMailboxDomainId(e.target.value)}
                  className="w-full bg-[#18181B] border border-[#27272A] rounded px-3 py-2 text-xs text-white"
                >
                  {domains.map((d) => (
                    <option key={d.id} value={d.id}>
                      @{d.domainName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono-code text-[#71717A]">Username Prefix:</label>
                  <input
                    type="text"
                    placeholder="e.g. alex or support"
                    value={mailboxUsername}
                    onChange={(e) => setMailboxUsername(e.target.value)}
                    className="w-full bg-[#18181B] border border-[#27272A] rounded px-3 py-2 text-xs text-white"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-mono-code text-[#71717A]">Display Name:</label>
                  <input
                    type="text"
                    placeholder="e.g. Alex Vance"
                    value={mailboxFullName}
                    onChange={(e) => setMailboxFullName(e.target.value)}
                    className="w-full bg-[#18181B] border border-[#27272A] rounded px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono-code text-[#71717A]">Mailbox Type:</label>
                  <select
                    value={mailboxType}
                    onChange={(e) => setMailboxType(e.target.value as any)}
                    className="w-full bg-[#18181B] border border-[#27272A] rounded px-3 py-2 text-xs text-white"
                  >
                    <option value="individual">Individual</option>
                    <option value="shared">Shared Studio Team</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-mono-code text-[#71717A]">Storage Quota:</label>
                  <select
                    value={mailboxQuota}
                    onChange={(e) => setMailboxQuota(Number(e.target.value))}
                    className="w-full bg-[#18181B] border border-[#27272A] rounded px-3 py-2 text-xs text-white"
                  >
                    <option value={10000}>10 GB</option>
                    <option value={25000}>25 GB (Recommended)</option>
                    <option value={50000}>50 GB</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddMailboxOpen(false)}
                  className="px-4 py-2 rounded-md text-xs text-[#A1A1AA] hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !mailboxUsername.trim()}
                  className="px-4 py-2 rounded-md text-xs font-semibold bg-white hover:bg-[#E4E4E7] text-black transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Creating...' : 'Create Mailbox'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Alias Modal */}
      {isAddAliasOpen && (
        <div
          id="add-alias-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs"
        >
          <div className="w-full max-w-md bg-[#0F0F12] border border-[#27272A] rounded-lg shadow-2xl overflow-hidden text-[#E4E4E7]">
            <div className="px-6 py-4 border-b border-[#27272A] bg-[#18181B] flex items-center justify-between">
              <h3 className="font-semibold text-sm text-white">Create Forwarding Alias</h3>
              <button onClick={() => setIsAddAliasOpen(false)} className="text-[#71717A] hover:text-white cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleCreateAlias} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-mono-code text-[#71717A]">Alias Prefix:</label>
                <input
                  type="text"
                  placeholder="e.g. press, billing, newsletter"
                  value={aliasPrefix}
                  onChange={(e) => setAliasPrefix(e.target.value)}
                  className="w-full bg-[#18181B] border border-[#27272A] rounded px-3 py-2 text-xs text-white"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono-code text-[#71717A]">Destination Mailbox:</label>
                <select
                  value={aliasTargetMailboxId}
                  onChange={(e) => setAliasTargetMailboxId(e.target.value)}
                  className="w-full bg-[#18181B] border border-[#27272A] rounded px-3 py-2 text-xs text-white"
                >
                  {mailboxes.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.emailAddress} ({m.name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono-code text-[#71717A]">Description:</label>
                <input
                  type="text"
                  placeholder="e.g. Media and interview inquiries"
                  value={aliasDescription}
                  onChange={(e) => setAliasDescription(e.target.value)}
                  className="w-full bg-[#18181B] border border-[#27272A] rounded px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddAliasOpen(false)}
                  className="px-4 py-2 rounded-md text-xs text-[#A1A1AA] hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !aliasPrefix.trim()}
                  className="px-4 py-2 rounded-md text-xs font-semibold bg-white hover:bg-[#E4E4E7] text-black transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Creating...' : 'Create Alias'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Mailbox Settings Modal */}
      {editingMailbox && (
        <div
          id="edit-mailbox-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs"
        >
          <div className="w-full max-w-lg bg-[#0F0F12] border border-[#27272A] rounded-lg shadow-2xl overflow-hidden text-[#E4E4E7]">
            <div className="px-6 py-4 border-b border-[#27272A] bg-[#18181B] flex items-center justify-between">
              <h3 className="font-semibold text-sm text-white">
                Mailbox Settings: {editingMailbox.emailAddress}
              </h3>
              <button onClick={() => setEditingMailbox(null)} className="text-[#71717A] hover:text-white cursor-pointer">✕</button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-mono-code text-[#71717A] font-semibold">Email Signature:</label>
                <textarea
                  rows={4}
                  value={editSignature}
                  onChange={(e) => setEditSignature(e.target.value)}
                  placeholder="—&#10;Your Name&#10;Title • Studio Name"
                  className="w-full bg-[#18181B] border border-[#27272A] rounded p-2.5 text-white font-mono-code text-xs"
                />
              </div>

              <div className="p-3 rounded-md bg-[#18181B] border border-[#27272A] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-white">Auto-Responder (Out of Office)</div>
                  <input
                    type="checkbox"
                    checked={editAutoReply}
                    onChange={(e) => setEditAutoReply(e.target.checked)}
                    className="w-4 h-4 accent-white rounded cursor-pointer"
                  />
                </div>

                {editAutoReply && (
                  <div className="space-y-2 pt-2 border-t border-[#27272A]">
                    <input
                      type="text"
                      placeholder="Auto-reply Subject..."
                      value={editAutoReplySubject}
                      onChange={(e) => setEditAutoReplySubject(e.target.value)}
                      className="w-full bg-[#0A0A0B] border border-[#27272A] rounded px-2.5 py-1.5 text-white text-xs"
                    />
                    <textarea
                      rows={3}
                      placeholder="Auto-reply message body..."
                      value={editAutoReplyBody}
                      onChange={(e) => setEditAutoReplyBody(e.target.value)}
                      className="w-full bg-[#0A0A0B] border border-[#27272A] rounded px-2.5 py-1.5 text-white text-xs"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-3.5 bg-[#18181B] border-t border-[#27272A] flex items-center justify-end gap-2">
              <button
                onClick={() => setEditingMailbox(null)}
                className="px-4 py-2 rounded-md text-xs text-[#A1A1AA] hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveMailboxSettings}
                className="px-4 py-2 rounded-md text-xs font-semibold bg-white hover:bg-[#E4E4E7] text-black cursor-pointer"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
