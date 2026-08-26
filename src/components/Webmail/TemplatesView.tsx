import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  Plus,
  Edit2,
  Trash2,
  Copy,
  Check,
  Sparkles,
  Tag,
  RefreshCw,
  X,
  Code,
} from 'lucide-react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import type { EmailTemplate } from '../../types.js';

interface TemplatesViewProps {
  onInsertTemplate?: (template: EmailTemplate) => void;
}

export const TemplatesView: React.FC<TemplatesViewProps> = ({ onInsertTemplate }) => {
  const { selectedMailbox, showToast } = useAuth();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    category: 'Client Inquiries',
    subject: '',
    bodyText: '',
    variables: ['client_name', 'project_title', 'sender_name'],
  });

  const categories = ['all', 'Client Inquiries', 'Engineering & Construction', 'Contracts & Billing', 'General'];

  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      const res = await api.getTemplates(selectedMailbox?.id);
      setTemplates(res.templates || []);
    } catch (err: any) {
      showToast(err.message || 'Failed to load templates', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [selectedMailbox?.id]);

  const openCreateModal = () => {
    setEditingTemplate(null);
    setFormData({
      name: '',
      category: 'Client Inquiries',
      subject: '',
      bodyText: '',
      variables: ['recipient_name', 'sender_name'],
    });
    setIsModalOpen(true);
  };

  const openEditModal = (tmpl: EmailTemplate) => {
    setEditingTemplate(tmpl);
    setFormData({
      name: tmpl.name,
      category: tmpl.category,
      subject: tmpl.subject,
      bodyText: tmpl.bodyText,
      variables: tmpl.variables || [],
    });
    setIsModalOpen(true);
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.bodyText) {
      showToast('Template name and body content are required', 'error');
      return;
    }

    try {
      if (editingTemplate) {
        await api.updateTemplate(editingTemplate.id, formData);
        showToast('Template updated successfully', 'success');
      } else {
        await api.createTemplate({ ...formData, mailboxId: selectedMailbox?.id });
        showToast('Template created successfully', 'success');
      }
      setIsModalOpen(false);
      fetchTemplates();
    } catch (err: any) {
      showToast(err.message || 'Failed to save template', 'error');
    }
  };

  const handleDeleteTemplate = async (id: string, name: string) => {
    if (confirm(`Delete template "${name}"?`)) {
      try {
        await api.deleteTemplate(id);
        showToast('Template deleted', 'success');
        fetchTemplates();
      } catch (err: any) {
        showToast(err.message || 'Failed to delete template', 'error');
      }
    }
  };

  const handleCopyBody = (tmpl: EmailTemplate) => {
    navigator.clipboard.writeText(tmpl.bodyText);
    setCopiedId(tmpl.id);
    showToast('Template body copied to clipboard', 'info');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredTemplates = templates.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.subject.toLowerCase().includes(search.toLowerCase()) ||
      t.bodyText.toLowerCase().includes(search.toLowerCase());
    if (selectedCategory !== 'all') return matchesSearch && t.category === selectedCategory;
    return matchesSearch;
  });

  return (
    <div id="templates-view" className="flex-1 flex flex-col h-full bg-[#09090B] text-[#E4E4E7] overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-[#27272A] bg-[#0F0F12] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-white/10 flex items-center justify-center text-white">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white tracking-tight">Email Templates & Canned Responses</h1>
            <p className="text-xs text-[#A1A1AA]">
              Standardize studio correspondence, proposals, and fee schedules with dynamic variable tags
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchTemplates}
            className="p-2 rounded-md bg-[#18181B] hover:bg-[#27272A] text-[#A1A1AA] hover:text-white border border-[#27272A] transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={openCreateModal}
            className="px-3.5 py-1.5 rounded-md bg-white hover:bg-[#E4E4E7] text-black text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all hover:scale-[1.02]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Template</span>
          </button>
        </div>
      </div>

      {/* Filter / Search */}
      <div className="px-6 py-3.5 border-b border-[#27272A] bg-[#121215] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors ${
                selectedCategory === cat
                  ? 'bg-white text-black font-semibold'
                  : 'bg-[#18181B] text-[#A1A1AA] hover:text-white border border-[#27272A]'
              }`}
            >
              {cat === 'all' ? 'All Categories' : cat}
            </button>
          ))}
        </div>

        <div className="relative min-w-[260px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates..."
            className="w-full pl-9 pr-3 py-1.5 rounded-md bg-[#18181B] border border-[#27272A] text-xs text-[#E4E4E7] placeholder-[#71717A] focus:outline-none focus:border-white transition-colors"
          />
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 text-[#71717A]">
            <RefreshCw className="w-6 h-6 animate-spin mb-2" />
            <p className="text-xs">Loading template library...</p>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 border border-dashed border-[#27272A] rounded-lg p-8 text-center bg-[#0F0F12]">
            <FileText className="w-8 h-8 text-[#71717A] mb-3" />
            <h3 className="text-sm font-semibold text-white">No templates found</h3>
            <p className="text-xs text-[#71717A] max-w-sm mt-1">
              Create reusable responses with dynamic placeholders to speed up your daily client and contractor workflows.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((tmpl) => (
              <div
                key={tmpl.id}
                id={`template-card-${tmpl.id}`}
                className="bg-[#121215] border border-[#27272A] hover:border-[#3F3F46] rounded-lg p-4 flex flex-col justify-between transition-all group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-[10px] font-mono-code uppercase px-2 py-0.5 rounded bg-[#18181B] text-[#A1A1AA] border border-[#27272A]">
                      {tmpl.category}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(tmpl)}
                        className="p-1 rounded hover:bg-[#27272A] text-[#71717A] hover:text-white transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteTemplate(tmpl.id, tmpl.name)}
                        className="p-1 rounded hover:bg-rose-500/10 text-[#71717A] hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-sm font-semibold text-white group-hover:text-neutral-200 transition-colors">
                    {tmpl.name}
                  </h3>
                  {tmpl.subject && (
                    <p className="text-xs text-[#A1A1AA] mt-1 font-medium truncate">
                      Sub: {tmpl.subject}
                    </p>
                  )}

                  <div className="mt-3 p-2.5 rounded bg-[#18181B] border border-[#27272A]/80 font-mono-code text-[11px] text-[#D4D4D8] leading-relaxed line-clamp-4 whitespace-pre-wrap">
                    {tmpl.bodyText}
                  </div>

                  {tmpl.variables && tmpl.variables.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {tmpl.variables.map((v) => (
                        <span
                          key={v}
                          className="text-[10px] font-mono-code bg-[#27272A] text-neutral-300 px-1.5 py-0.5 rounded"
                        >
                          {`{{${v}}}`}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-[#27272A] flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleCopyBody(tmpl)}
                    className="flex-1 py-1 rounded bg-[#18181B] hover:bg-[#27272A] text-xs font-medium text-[#A1A1AA] hover:text-white border border-[#27272A] flex items-center justify-center gap-1.5 transition-colors"
                  >
                    {copiedId === tmpl.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Text</span>
                      </>
                    )}
                  </button>

                  {onInsertTemplate && (
                    <button
                      onClick={() => onInsertTemplate(tmpl)}
                      className="px-3 py-1 rounded bg-white hover:bg-[#E4E4E7] text-black text-xs font-semibold shadow-sm transition-colors"
                    >
                      Use in Composer
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#121215] border border-[#27272A] rounded-xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-[#27272A]">
              <h2 className="text-sm font-semibold text-white">
                {editingTemplate ? 'Edit Email Template' : 'Create Email Template'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[#71717A] hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTemplate} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#A1A1AA] mb-1">Template Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Architectural Commission Feasibility Reply"
                  className="w-full px-3 py-1.5 rounded-md bg-[#18181B] border border-[#27272A] text-xs text-white placeholder-[#71717A] focus:outline-none focus:border-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#A1A1AA] mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-md bg-[#18181B] border border-[#27272A] text-xs text-white focus:outline-none focus:border-white"
                  >
                    <option value="Client Inquiries">Client Inquiries</option>
                    <option value="Engineering & Construction">Engineering & Construction</option>
                    <option value="Contracts & Billing">Contracts & Billing</option>
                    <option value="General">General</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#A1A1AA] mb-1">Subject Header</label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="Re: Architectural Commission: {{project_title}}"
                    className="w-full px-3 py-1.5 rounded-md bg-[#18181B] border border-[#27272A] text-xs text-white placeholder-[#71717A] focus:outline-none focus:border-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#A1A1AA] mb-1">
                  Body Content (Supports {'{{variable}}'} placeholders) *
                </label>
                <textarea
                  rows={6}
                  required
                  value={formData.bodyText}
                  onChange={(e) => setFormData({ ...formData, bodyText: e.target.value })}
                  placeholder={`Dear {{recipient_name}},\n\nThank you for reaching out regarding {{project_title}}. We would be delighted to review the feasibility study.\n\nWarm regards,\n{{sender_name}}`}
                  className="w-full p-3 rounded-md bg-[#18181B] border border-[#27272A] text-xs font-mono-code text-white placeholder-[#71717A] focus:outline-none focus:border-white"
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-[#71717A] bg-[#18181B] p-2.5 rounded border border-[#27272A]">
                <div className="flex items-center gap-1.5">
                  <Code className="w-3.5 h-3.5" />
                  <span>Available tags:</span>
                </div>
                <div className="flex items-center gap-1 font-mono-code text-neutral-300">
                  <span>{'{{client_name}}'}</span>
                  <span>{'{{project_title}}'}</span>
                  <span>{'{{sender_name}}'}</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#27272A]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 rounded-md bg-[#18181B] hover:bg-[#27272A] text-xs font-medium text-[#A1A1AA] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-md bg-white hover:bg-[#E4E4E7] text-xs font-semibold text-black shadow-sm"
                >
                  {editingTemplate ? 'Save Changes' : 'Create Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
