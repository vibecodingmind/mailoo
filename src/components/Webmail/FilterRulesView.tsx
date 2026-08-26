import React, { useState, useEffect } from 'react';
import {
  SlidersHorizontal,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Shield,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  Search,
  Filter,
  ArrowRight,
  Tag,
  Folder,
  Star,
  Eye,
  Ban,
} from 'lucide-react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import type { FilterRule, BlockedSender } from '../../types.js';

export const FilterRulesView: React.FC = () => {
  const { selectedMailbox, showToast } = useAuth();
  const [activeTab, setActiveTab] = useState<'filters' | 'blocklist'>('filters');
  const [filterRules, setFilterRules] = useState<FilterRule[]>([]);
  const [blockedSenders, setBlockedSenders] = useState<BlockedSender[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Filter Rule Modal State
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<FilterRule | null>(null);
  const [ruleFormData, setRuleFormData] = useState({
    name: '',
    conditionField: 'from' as 'from' | 'to' | 'subject' | 'body',
    matchType: 'contains' as 'contains' | 'equals' | 'starts_with' | 'regex',
    matchValue: '',
    applyLabel: '',
    star: false,
    markAsRead: false,
    moveToFolder: '',
  });

  // Blocked Sender Modal State
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [blockFormData, setBlockFormData] = useState({
    pattern: '',
    type: 'block' as 'block' | 'allow',
    reason: '',
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [rulesRes, sendersRes] = await Promise.all([
        api.getFilterRules(selectedMailbox?.id),
        api.getBlockedSenders(),
      ]);
      setFilterRules(rulesRes.filterRules || []);
      setBlockedSenders(sendersRes.senders || []);
    } catch (err: any) {
      showToast(err.message || 'Failed to load filter configurations', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedMailbox?.id]);

  // Save Filter Rule
  const handleSaveFilter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleFormData.name || !ruleFormData.matchValue) {
      showToast('Name and match value are required', 'error');
      return;
    }

    const actions: FilterRule['actions'] = {};
    if (ruleFormData.applyLabel) actions.applyLabel = ruleFormData.applyLabel.trim();
    if (ruleFormData.star) actions.markStar = true;
    if (ruleFormData.markAsRead) actions.markRead = true;
    if (ruleFormData.moveToFolder) actions.moveToFolder = ruleFormData.moveToFolder;

    try {
      if (editingRule) {
        await api.updateFilterRule(editingRule.id, {
          name: ruleFormData.name,
          conditionField: ruleFormData.conditionField,
          matchType: ruleFormData.matchType,
          matchValue: ruleFormData.matchValue,
          actions,
        });
        showToast('Filter rule updated', 'success');
      } else {
        await api.createFilterRule({
          name: ruleFormData.name,
          conditionField: ruleFormData.conditionField,
          matchType: ruleFormData.matchType,
          matchValue: ruleFormData.matchValue,
          actions,
          mailboxId: selectedMailbox?.id,
        });
        showToast('Filter rule created', 'success');
      }
      setIsFilterModalOpen(false);
      fetchData();
    } catch (err: any) {
      showToast(err.message || 'Failed to save filter rule', 'error');
    }
  };

  const toggleRuleEnabled = async (rule: FilterRule) => {
    try {
      await api.updateFilterRule(rule.id, { isEnabled: !rule.isEnabled });
      setFilterRules((prev) =>
        prev.map((r) => (r.id === rule.id ? { ...r, isEnabled: !r.isEnabled } : r))
      );
      showToast(`Filter rule ${!rule.isEnabled ? 'enabled' : 'disabled'}`, 'info');
    } catch (err: any) {
      showToast('Failed to update rule status', 'error');
    }
  };

  const handleDeleteRule = async (id: string, name: string) => {
    if (confirm(`Delete filter rule "${name}"?`)) {
      try {
        await api.deleteFilterRule(id);
        showToast('Filter rule deleted', 'success');
        fetchData();
      } catch (err: any) {
        showToast('Failed to delete filter rule', 'error');
      }
    }
  };

  // Blocked Sender Handlers
  const handleSaveBlockedSender = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockFormData.pattern) {
      showToast('Pattern / domain is required', 'error');
      return;
    }
    try {
      await api.addBlockedSender(blockFormData);
      showToast(
        blockFormData.type === 'block' ? 'Sender added to Blocklist' : 'Sender added to Allowlist',
        'success'
      );
      setIsBlockModalOpen(false);
      fetchData();
    } catch (err: any) {
      showToast(err.message || 'Failed to save sender rule', 'error');
    }
  };

  const handleDeleteBlockedSender = async (id: string) => {
    try {
      await api.deleteBlockedSender(id);
      showToast('Sender entry removed', 'success');
      fetchData();
    } catch (err: any) {
      showToast('Failed to remove sender rule', 'error');
    }
  };

  return (
    <div id="filters-view" className="flex-1 flex flex-col h-full bg-[#09090B] text-[#E4E4E7] overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-[#27272A] bg-[#0F0F12] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-white/10 flex items-center justify-center text-white">
            <SlidersHorizontal className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white tracking-tight">Ingress Filters & Security Firewall</h1>
            <p className="text-xs text-[#A1A1AA]">
              Set up automated routing, label tagging, spam defense, and sender allow/block rules
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="p-2 rounded-md bg-[#18181B] hover:bg-[#27272A] text-[#A1A1AA] hover:text-white border border-[#27272A] transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          {activeTab === 'filters' ? (
            <button
              onClick={() => {
                setEditingRule(null);
                setRuleFormData({
                  name: '',
                  conditionField: 'from',
                  matchType: 'contains',
                  matchValue: '',
                  applyLabel: '',
                  star: false,
                  markAsRead: false,
                  moveToFolder: '',
                });
                setIsFilterModalOpen(true);
              }}
              className="px-3.5 py-1.5 rounded-md bg-white hover:bg-[#E4E4E7] text-black text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all hover:scale-[1.02]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Ingress Rule</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setBlockFormData({ pattern: '', type: 'block', reason: '' });
                setIsBlockModalOpen(true);
              }}
              className="px-3.5 py-1.5 rounded-md bg-white hover:bg-[#E4E4E7] text-black text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all hover:scale-[1.02]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Sender Rule</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 py-3 border-b border-[#27272A] bg-[#121215] flex items-center gap-2">
        <button
          onClick={() => setActiveTab('filters')}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            activeTab === 'filters'
              ? 'bg-white text-black font-semibold'
              : 'bg-[#18181B] text-[#A1A1AA] hover:text-white border border-[#27272A]'
          }`}
        >
          Custom Ingress Mail Filters ({filterRules.length})
        </button>
        <button
          onClick={() => setActiveTab('blocklist')}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            activeTab === 'blocklist'
              ? 'bg-white text-black font-semibold'
              : 'bg-[#18181B] text-[#A1A1AA] hover:text-white border border-[#27272A]'
          }`}
        >
          Blocklist & Allowlist Manager ({blockedSenders.length})
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'filters' ? (
          <div className="space-y-3">
            {filterRules.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 border border-dashed border-[#27272A] rounded-lg p-8 text-center bg-[#0F0F12]">
                <SlidersHorizontal className="w-8 h-8 text-[#71717A] mb-3" />
                <h3 className="text-sm font-semibold text-white">No filter rules configured</h3>
                <p className="text-xs text-[#71717A] max-w-sm mt-1">
                  Create automated rules to label client inquiries, prioritize architectural commissions, or move junk directly to spam.
                </p>
              </div>
            ) : (
              filterRules.map((rule) => (
                <div
                  key={rule.id}
                  id={`filter-rule-${rule.id}`}
                  className="bg-[#121215] border border-[#27272A] hover:border-[#3F3F46] rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => toggleRuleEnabled(rule)}
                      className={`w-5 h-5 rounded mt-0.5 flex items-center justify-center border transition-colors ${
                        rule.isEnabled
                          ? 'bg-white text-black border-white'
                          : 'bg-[#18181B] border-[#3F3F46] text-transparent'
                      }`}
                      title={rule.isEnabled ? 'Disable filter rule' : 'Enable filter rule'}
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </button>

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-white">{rule.name}</h3>
                        <span className="text-[10px] font-mono-code uppercase px-1.5 py-0.5 rounded bg-[#18181B] text-[#A1A1AA] border border-[#27272A]">
                          IF {rule.conditionField.toUpperCase()} {rule.matchType.replace('_', ' ').toUpperCase()} "{rule.matchValue}"
                        </span>
                      </div>

                      {/* Action Badges */}
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span className="text-xs text-[#71717A] flex items-center gap-1">
                          <ArrowRight className="w-3 h-3" /> Then:
                        </span>
                        {rule.actions.applyLabel && (
                          <span className="text-[11px] font-medium bg-blue-500/10 text-blue-300 border border-blue-500/20 px-2 py-0.5 rounded flex items-center gap-1">
                            <Tag className="w-3 h-3" />
                            Apply Label: {rule.actions.applyLabel}
                          </span>
                        )}
                        {rule.actions.star && (
                          <span className="text-[11px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2 py-0.5 rounded flex items-center gap-1">
                            <Star className="w-3 h-3 fill-amber-300" />
                            Star Message
                          </span>
                        )}
                        {rule.actions.moveToFolder && (
                          <span className="text-[11px] font-medium bg-purple-500/10 text-purple-300 border border-purple-500/20 px-2 py-0.5 rounded flex items-center gap-1">
                            <Folder className="w-3 h-3" />
                            Move to {rule.actions.moveToFolder}
                          </span>
                        )}
                        {rule.actions.markAsRead && (
                          <span className="text-[11px] font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2 py-0.5 rounded flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            Mark as Read
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center">
                    <button
                      onClick={() => {
                        setEditingRule(rule);
                        setRuleFormData({
                          name: rule.name,
                          conditionField: rule.conditionField,
                          matchType: rule.matchType,
                          matchValue: rule.matchValue,
                          applyLabel: rule.actions.applyLabel || '',
                          star: !!rule.actions.star,
                          markAsRead: !!rule.actions.markAsRead,
                          moveToFolder: rule.actions.moveToFolder || '',
                        });
                        setIsFilterModalOpen(true);
                      }}
                      className="p-1.5 rounded hover:bg-[#27272A] text-[#71717A] hover:text-white transition-colors"
                      title="Edit rule"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteRule(rule.id, rule.name)}
                      className="p-1.5 rounded hover:bg-rose-500/10 text-[#71717A] hover:text-rose-400 transition-colors"
                      title="Delete rule"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {blockedSenders.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 border border-dashed border-[#27272A] rounded-lg p-8 text-center bg-[#0F0F12]">
                <Ban className="w-8 h-8 text-[#71717A] mb-3" />
                <h3 className="text-sm font-semibold text-white">No Blocked or Allowed Senders</h3>
                <p className="text-xs text-[#71717A] max-w-sm mt-1">
                  Add specific email addresses or entire domain patterns (`*@bad-domain.com`) to instantly bypass or block incoming emails.
                </p>
              </div>
            ) : (
              <div className="bg-[#121215] border border-[#27272A] rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#18181B] text-[#A1A1AA] uppercase font-mono-code text-[10px] border-b border-[#27272A]">
                    <tr>
                      <th className="px-4 py-3">Rule Type</th>
                      <th className="px-4 py-3">Sender Pattern / Domain</th>
                      <th className="px-4 py-3">Reason / Description</th>
                      <th className="px-4 py-3">Added Date</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#27272A]">
                    {blockedSenders.map((sender) => (
                      <tr key={sender.id} className="hover:bg-[#18181B]/50 transition-colors">
                        <td className="px-4 py-3">
                          {sender.type === 'block' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-medium text-[11px]">
                              <ShieldAlert className="w-3 h-3" />
                              Blocked (Drop)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium text-[11px]">
                              <ShieldCheck className="w-3 h-3" />
                              Allowed (Bypass Spam)
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono-code text-white font-medium">
                          {sender.pattern}
                        </td>
                        <td className="px-4 py-3 text-[#A1A1AA]">{sender.reason || '—'}</td>
                        <td className="px-4 py-3 text-[#71717A]">
                          {new Date(sender.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleDeleteBlockedSender(sender.id)}
                            className="p-1 rounded hover:bg-rose-500/10 text-[#71717A] hover:text-rose-400 transition-colors"
                            title="Delete sender rule"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filter Rule Create / Edit Modal */}
      {isFilterModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#121215] border border-[#27272A] rounded-xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-[#27272A]">
              <h2 className="text-sm font-semibold text-white">
                {editingRule ? 'Edit Ingress Filter' : 'Create Ingress Filter Rule'}
              </h2>
              <button
                onClick={() => setIsFilterModalOpen(false)}
                className="text-[#71717A] hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveFilter} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#A1A1AA] mb-1">Rule Name *</label>
                <input
                  type="text"
                  required
                  value={ruleFormData.name}
                  onChange={(e) => setRuleFormData({ ...ruleFormData, name: e.target.value })}
                  placeholder="e.g. Auto-Tag Architectural Commissions"
                  className="w-full px-3 py-1.5 rounded-md bg-[#18181B] border border-[#27272A] text-xs text-white focus:outline-none focus:border-white"
                />
              </div>

              <div className="p-3 bg-[#18181B] rounded-lg border border-[#27272A] space-y-3">
                <span className="text-[11px] font-semibold text-[#E4E4E7] uppercase font-mono-code">Condition</span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-[#A1A1AA] mb-1">Field</label>
                    <select
                      value={ruleFormData.conditionField}
                      onChange={(e: any) => setRuleFormData({ ...ruleFormData, conditionField: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-md bg-[#121215] border border-[#27272A] text-xs text-white"
                    >
                      <option value="from">Sender (From)</option>
                      <option value="to">Recipient (To)</option>
                      <option value="subject">Subject Line</option>
                      <option value="body">Email Body Text</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-[#A1A1AA] mb-1">Match Type</label>
                    <select
                      value={ruleFormData.matchType}
                      onChange={(e: any) => setRuleFormData({ ...ruleFormData, matchType: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-md bg-[#121215] border border-[#27272A] text-xs text-white"
                    >
                      <option value="contains">Contains</option>
                      <option value="equals">Exact Match</option>
                      <option value="starts_with">Starts With</option>
                      <option value="regex">Regular Expression</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-[#A1A1AA] mb-1">Match Value *</label>
                  <input
                    type="text"
                    required
                    value={ruleFormData.matchValue}
                    onChange={(e) => setRuleFormData({ ...ruleFormData, matchValue: e.target.value })}
                    placeholder="e.g. commission, invoice, @scandic-group.se"
                    className="w-full px-3 py-1.5 rounded-md bg-[#121215] border border-[#27272A] text-xs text-white font-mono-code focus:outline-none focus:border-white"
                  />
                </div>
              </div>

              <div className="p-3 bg-[#18181B] rounded-lg border border-[#27272A] space-y-3">
                <span className="text-[11px] font-semibold text-[#E4E4E7] uppercase font-mono-code">Actions</span>

                <div>
                  <label className="block text-xs text-[#A1A1AA] mb-1">Apply Label / Tag</label>
                  <input
                    type="text"
                    value={ruleFormData.applyLabel}
                    onChange={(e) => setRuleFormData({ ...ruleFormData, applyLabel: e.target.value })}
                    placeholder="e.g. Architectural Commissions, Invoices, Urgent"
                    className="w-full px-3 py-1.5 rounded-md bg-[#121215] border border-[#27272A] text-xs text-white focus:outline-none focus:border-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="filter-star"
                      checked={ruleFormData.star}
                      onChange={(e) => setRuleFormData({ ...ruleFormData, star: e.target.checked })}
                      className="rounded bg-[#121215] border-[#27272A]"
                    />
                    <label htmlFor="filter-star" className="text-xs text-[#E4E4E7] cursor-pointer">
                      Star thread
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="filter-read"
                      checked={ruleFormData.markAsRead}
                      onChange={(e) => setRuleFormData({ ...ruleFormData, markAsRead: e.target.checked })}
                      className="rounded bg-[#121215] border-[#27272A]"
                    />
                    <label htmlFor="filter-read" className="text-xs text-[#E4E4E7] cursor-pointer">
                      Mark as read
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-[#A1A1AA] mb-1">Move directly to Folder</label>
                  <select
                    value={ruleFormData.moveToFolder}
                    onChange={(e) => setRuleFormData({ ...ruleFormData, moveToFolder: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-md bg-[#121215] border border-[#27272A] text-xs text-white"
                  >
                    <option value="">Keep in Inbox</option>
                    <option value="archive">Archive</option>
                    <option value="spam">Spam</option>
                    <option value="trash">Trash</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#27272A]">
                <button
                  type="button"
                  onClick={() => setIsFilterModalOpen(false)}
                  className="px-3 py-1.5 rounded-md bg-[#18181B] hover:bg-[#27272A] text-xs font-medium text-[#A1A1AA] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-md bg-white hover:bg-[#E4E4E7] text-xs font-semibold text-black shadow-sm"
                >
                  {editingRule ? 'Save Rule' : 'Create Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Blocked Sender Modal */}
      {isBlockModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#121215] border border-[#27272A] rounded-xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-[#27272A]">
              <h2 className="text-sm font-semibold text-white">Add Block / Allow Sender Rule</h2>
              <button
                onClick={() => setIsBlockModalOpen(false)}
                className="text-[#71717A] hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBlockedSender} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#A1A1AA] mb-1">Rule Policy</label>
                <select
                  value={blockFormData.type}
                  onChange={(e: any) => setBlockFormData({ ...blockFormData, type: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-md bg-[#18181B] border border-[#27272A] text-xs text-white"
                >
                  <option value="block">Blocklist (Drop & Flag as Phishing/Spam)</option>
                  <option value="allow">Allowlist (Always Trust & Deliver to Primary)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#A1A1AA] mb-1">Sender Email or Domain Pattern *</label>
                <input
                  type="text"
                  required
                  value={blockFormData.pattern}
                  onChange={(e) => setBlockFormData({ ...blockFormData, pattern: e.target.value })}
                  placeholder="e.g. *@spam-promos.com or baduser@domain.com"
                  className="w-full px-3 py-1.5 rounded-md bg-[#18181B] border border-[#27272A] text-xs text-white font-mono-code focus:outline-none focus:border-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#A1A1AA] mb-1">Reason / Reference Note</label>
                <input
                  type="text"
                  value={blockFormData.reason}
                  onChange={(e) => setBlockFormData({ ...blockFormData, reason: e.target.value })}
                  placeholder="Unsolicited cold outreach or verified VIP partner"
                  className="w-full px-3 py-1.5 rounded-md bg-[#18181B] border border-[#27272A] text-xs text-white focus:outline-none focus:border-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#27272A]">
                <button
                  type="button"
                  onClick={() => setIsBlockModalOpen(false)}
                  className="px-3 py-1.5 rounded-md bg-[#18181B] hover:bg-[#27272A] text-xs font-medium text-[#A1A1AA] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-md bg-white hover:bg-[#E4E4E7] text-xs font-semibold text-black shadow-sm"
                >
                  Add Sender Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
