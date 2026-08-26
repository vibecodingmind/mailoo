import React, { useState, useEffect } from 'react';
import {
  PenTool,
  Plus,
  Trash2,
  Edit2,
  Check,
  Star,
  Sparkles,
  AlertCircle,
  X,
  FileSignature,
  Eye,
} from 'lucide-react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import type { EmailSignature } from '../../types.js';

interface SignaturesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignaturesUpdated?: () => void;
}

export const SignaturesModal: React.FC<SignaturesModalProps> = ({
  isOpen,
  onClose,
  onSignaturesUpdated,
}) => {
  const { selectedMailbox, showToast } = useAuth();
  const [signatures, setSignatures] = useState<EmailSignature[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingSigId, setEditingSigId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const fetchSignatures = async () => {
    setIsLoading(true);
    try {
      const res = await api.getSignatures(selectedMailbox?.id);
      setSignatures(res.signatures || []);
    } catch (err: any) {
      showToast(err.message || 'Failed to load signatures', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSignatures();
      setShowCreateForm(false);
      resetForm();
    }
  }, [isOpen, selectedMailbox?.id]);

  const resetForm = () => {
    setName('');
    setContent('');
    setIsDefault(false);
    setEditingSigId(null);
  };

  const handleStartCreate = () => {
    resetForm();
    setShowCreateForm(true);
  };

  const handleStartEdit = (sig: EmailSignature) => {
    setName(sig.name);
    setContent(sig.content);
    setIsDefault(sig.isDefault);
    setEditingSigId(sig.id);
    setShowCreateForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Please enter a name for the signature', 'error');
      return;
    }
    if (!content.trim()) {
      showToast('Signature content cannot be empty', 'error');
      return;
    }

    setIsSaving(true);
    try {
      if (editingSigId) {
        await api.updateSignature(editingSigId, {
          name: name.trim(),
          content: content.trim(),
          isDefault,
        });
        showToast('Signature updated successfully', 'success');
      } else {
        await api.createSignature({
          name: name.trim(),
          content: content.trim(),
          isDefault,
          mailboxId: selectedMailbox?.id,
        });
        showToast('New custom signature created', 'success');
      }

      resetForm();
      setShowCreateForm(false);
      await fetchSignatures();
      if (onSignaturesUpdated) onSignaturesUpdated();
    } catch (err: any) {
      showToast(err.message || 'Failed to save signature', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, sigName: string) => {
    if (!confirm(`Are you sure you want to delete signature "${sigName}"?`)) return;
    try {
      await api.deleteSignature(id);
      showToast('Signature deleted', 'success');
      await fetchSignatures();
      if (onSignaturesUpdated) onSignaturesUpdated();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete signature', 'error');
    }
  };

  const handleSetDefault = async (sig: EmailSignature) => {
    try {
      await api.updateSignature(sig.id, { isDefault: true });
      showToast(`"${sig.name}" set as default signature`, 'success');
      await fetchSignatures();
      if (onSignaturesUpdated) onSignaturesUpdated();
    } catch (err: any) {
      showToast('Failed to set default signature', 'error');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="signatures-settings-modal-backdrop"
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div
        id="signatures-settings-modal"
        className="w-full max-w-2xl bg-[#0F0F12] border border-[#27272A] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-[#E4E4E7]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#27272A] flex items-center justify-between bg-[#18181B]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#27272A] border border-[#3F3F46] flex items-center justify-center text-white">
              <FileSignature className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Email Signatures Settings</h3>
              <p className="text-[11px] text-[#A1A1AA]">
                Manage custom signatures for {selectedMailbox?.emailAddress || 'all mailboxes'}
              </p>
            </div>
          </div>
          <button
            id="close-signatures-modal-btn"
            onClick={onClose}
            className="text-[#71717A] hover:text-white p-1 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!showCreateForm ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono-code">
                    Saved Signatures ({signatures.length})
                  </h4>
                  <p className="text-xs text-[#71717A] mt-0.5">
                    Select a default signature to automatically append to outgoing messages and replies.
                  </p>
                </div>
                <button
                  id="add-new-signature-btn"
                  onClick={handleStartCreate}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-white hover:bg-[#E4E4E7] text-black shadow-sm transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Signature</span>
                </button>
              </div>

              {isLoading ? (
                <div className="p-8 text-center text-xs text-[#71717A]">Loading signatures...</div>
              ) : signatures.length === 0 ? (
                <div className="p-8 border border-dashed border-[#27272A] rounded-lg text-center space-y-2">
                  <PenTool className="w-6 h-6 text-[#71717A] mx-auto" />
                  <div className="text-xs font-medium text-[#A1A1AA]">No custom signatures saved</div>
                  <p className="text-[11px] text-[#71717A]">
                    Create your first professional email signature to append to new drafts.
                  </p>
                  <button
                    onClick={handleStartCreate}
                    className="mt-2 text-xs text-white underline cursor-pointer hover:text-[#A1A1AA]"
                  >
                    + Create Signature Now
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {signatures.map((sig) => (
                    <div
                      key={sig.id}
                      id={`signature-card-${sig.id}`}
                      className={`p-4 rounded-lg border transition-all ${
                        sig.isDefault
                          ? 'border-[#3F3F46] bg-[#18181B]/90'
                          : 'border-[#27272A] bg-[#0A0A0B]/60 hover:border-[#3F3F46]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-white">{sig.name}</span>
                            {sig.isDefault && (
                              <span className="text-[10px] font-mono-code font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                                <Check className="w-3 h-3" />
                                <span>Default</span>
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-[#A1A1AA] font-mono-code whitespace-pre-wrap bg-[#0F0F12] p-3 rounded border border-[#27272A] mt-2 leading-relaxed">
                            {sig.content}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {!sig.isDefault && (
                            <button
                              id={`set-default-sig-${sig.id}`}
                              onClick={() => handleSetDefault(sig)}
                              className="px-2 py-1 rounded text-[11px] text-[#A1A1AA] hover:text-white hover:bg-[#27272A] transition-colors border border-[#27272A] cursor-pointer"
                              title="Set as default signature"
                            >
                              Set Default
                            </button>
                          )}
                          <button
                            id={`edit-sig-${sig.id}`}
                            onClick={() => handleStartEdit(sig)}
                            className="p-1.5 text-[#71717A] hover:text-white hover:bg-[#27272A] rounded transition-colors cursor-pointer"
                            title="Edit signature"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            id={`delete-sig-${sig.id}`}
                            onClick={() => handleDelete(sig.id, sig.name)}
                            className="p-1.5 text-[#71717A] hover:text-rose-400 hover:bg-[#27272A] rounded transition-colors cursor-pointer"
                            title="Delete signature"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Create / Edit Form */
            <form onSubmit={handleSave} className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
                <div className="flex items-center gap-2">
                  <PenTool className="w-4 h-4 text-white" />
                  <h4 className="text-sm font-semibold text-white">
                    {editingSigId ? 'Edit Email Signature' : 'Create New Email Signature'}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="text-xs text-[#71717A] hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">
                  Signature Label / Name <span className="text-rose-400">*</span>
                </label>
                <input
                  id="signature-name-input"
                  type="text"
                  placeholder="e.g. Executive Studio, Mobile Minimal, Formal Contract"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#18181B] border border-[#27272A] rounded-md px-3 py-2 text-xs text-[#E4E4E7] placeholder-[#71717A] focus:outline-none focus:border-[#3F3F46]"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-[#A1A1AA]">
                    Signature Content <span className="text-rose-400">*</span>
                  </label>
                  <span className="text-[10px] text-[#71717A] font-mono-code">
                    Plain text & line breaks
                  </span>
                </div>
                <textarea
                  id="signature-content-input"
                  rows={6}
                  placeholder={`—\nAlex Vance | Principal Architect\nAtelier Nordic Architecture & Design AS\nhttps://atelier-nordic.com`}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full bg-[#0A0A0B] border border-[#27272A] rounded-md p-3 text-xs font-mono-code text-[#E4E4E7] placeholder-[#71717A] focus:outline-none focus:border-[#3F3F46] leading-relaxed resize-y"
                  required
                />
              </div>

              {/* Live Preview Box */}
              {content.trim() && (
                <div className="space-y-1.5">
                  <div className="text-[11px] font-mono-code uppercase text-[#71717A] font-semibold flex items-center gap-1.5">
                    <Eye className="w-3 h-3" />
                    <span>Live Outgoing Preview:</span>
                  </div>
                  <div className="p-3 bg-[#18181B] border border-[#27272A] rounded-md text-xs text-[#D4D4D8] whitespace-pre-wrap leading-relaxed font-sans">
                    <div className="text-[#71717A] italic text-[11px] mb-2">[Email body content above...]</div>
                    {content}
                  </div>
                </div>
              )}

              <div className="pt-2">
                <label className="flex items-center gap-2 text-xs text-[#E4E4E7] cursor-pointer">
                  <input
                    id="signature-default-checkbox"
                    type="checkbox"
                    checked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                    className="rounded bg-[#18181B] border-[#27272A] text-white focus:ring-0"
                  />
                  <span>Set as default signature for new messages and replies</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#27272A]">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-1.5 rounded-md text-xs font-medium text-[#A1A1AA] hover:text-white hover:bg-[#18181B] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="save-signature-submit-btn"
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-semibold bg-white hover:bg-[#E4E4E7] text-black shadow-sm transition-all cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Saving...' : editingSigId ? 'Update Signature' : 'Save Signature'}</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 bg-[#18181B] border-t border-[#27272A] flex items-center justify-between text-xs text-[#71717A]">
          <span className="font-mono-code text-[11px]">Signatures are synced securely with your mailbox profile</span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded text-xs text-white hover:bg-[#27272A] cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
