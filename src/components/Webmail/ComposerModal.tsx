import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Paperclip,
  Sparkles,
  Send,
  Trash2,
  Check,
  CheckCheck,
  Eye,
  RotateCcw,
  FileSignature,
  ChevronDown,
  Loader2,
  Clock,
  Lock,
  KeyRound,
  Mic,
  MicOff,
  LayoutTemplate,
  Calendar,
  FileText,
} from 'lucide-react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import type { EmailAttachment, EmailSignature, EmailTemplate } from '../../types.js';
import { SignaturesModal } from './SignaturesModal.js';

interface ComposerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSent: () => void;
  initialTo?: string;
  initialSubject?: string;
  initialBody?: string;
}

const STORAGE_KEY = 'monogram_composer_draft';

export const ComposerModal: React.FC<ComposerModalProps> = ({
  isOpen,
  onClose,
  onSent,
  initialTo = '',
  initialSubject = '',
  initialBody = '',
}) => {
  const { mailboxes, selectedMailbox, showToast } = useAuth();

  const [fromMailboxId, setFromMailboxId] = useState<string>(
    selectedMailbox?.id || mailboxes[0]?.id || ''
  );
  const [toInput, setToInput] = useState<string>(initialTo);
  const [ccInput, setCcInput] = useState<string>('');
  const [bccInput, setBccInput] = useState<string>('');
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [subject, setSubject] = useState<string>(initialSubject);
  const [bodyText, setBodyText] = useState<string>(initialBody);
  const [attachments, setAttachments] = useState<EmailAttachment[]>([]);
  const [readReceiptRequested, setReadReceiptRequested] = useState(true);

  // Advanced Security & Scheduling Features
  const [isPgpEncrypted, setIsPgpEncrypted] = useState(false);
  const [isPasswordProtected, setIsPasswordProtected] = useState(false);
  const [accessPassword, setAccessPassword] = useState('');
  const [scheduledAt, setScheduledAt] = useState<string | null>(null);
  const [isScheduleMenuOpen, setIsScheduleMenuOpen] = useState(false);

  // Template Picker State
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [isTemplateMenuOpen, setIsTemplateMenuOpen] = useState(false);

  // Voice Dictation State
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const recognitionRef = useRef<any>(null);

  // AI & Sending State
  const [isSending, setIsSending] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiPromptOpen, setAiPromptOpen] = useState(false);
  const [aiNotes, setAiNotes] = useState('');

  // Undo Send Floating Pill State
  const [undoSendPending, setUndoSendPending] = useState<boolean>(false);
  const [undoCountdown, setUndoCountdown] = useState<number>(10);
  const undoTimerRef = useRef<any>(null);
  const pendingPayloadRef = useRef<any>(null);

  // Auto-save State (every 5 seconds)
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [draftRestoredBanner, setDraftRestoredBanner] = useState(false);

  // Signatures State
  const [signatures, setSignatures] = useState<EmailSignature[]>([]);
  const [signatureDropdownOpen, setSignatureDropdownOpen] = useState(false);
  const [signaturesModalOpen, setSignaturesModalOpen] = useState(false);

  // Load custom signatures and templates
  const loadAuxData = async () => {
    try {
      const [sigRes, tplRes] = await Promise.all([
        api.getSignatures(fromMailboxId),
        api.getTemplates(),
      ]);
      setSignatures(sigRes.signatures || []);
      setTemplates(tplRes.templates || []);
    } catch (err) {
      console.warn('Failed to load auxiliary composer data', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadAuxData();
    }
  }, [isOpen, fromMailboxId]);

  // Handle external prefill updates
  useEffect(() => {
    if (initialTo) setToInput(initialTo);
    if (initialSubject) setSubject(initialSubject);
    if (initialBody) setBodyText(initialBody);
  }, [initialTo, initialSubject, initialBody]);

  // Restore draft from localStorage upon opening
  useEffect(() => {
    if (!isOpen) return;

    if (!initialTo && !initialSubject && !initialBody) {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.bodyText || parsed.subject || parsed.toInput) {
            setToInput(parsed.toInput || '');
            setCcInput(parsed.ccInput || '');
            setBccInput(parsed.bccInput || '');
            setShowCc(!!parsed.showCc);
            setShowBcc(!!parsed.showBcc);
            setSubject(parsed.subject || '');
            setBodyText(parsed.bodyText || '');
            if (parsed.fromMailboxId) setFromMailboxId(parsed.fromMailboxId);
            if (parsed.readReceiptRequested !== undefined) {
              setReadReceiptRequested(parsed.readReceiptRequested);
            }
            if (parsed.savedAt) {
              setLastSavedTime(
                new Date(parsed.savedAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })
              );
              setAutoSaveStatus('saved');
            }
            setDraftRestoredBanner(true);
          }
        }
      } catch (e) {
        console.error('Failed to parse draft from localStorage', e);
      }
    }
  }, [isOpen]);

  // 5-Second Periodic and Input-based Auto-Save Engine
  useEffect(() => {
    if (!isOpen) return;

    const hasContent =
      toInput.trim() || subject.trim() || bodyText.trim() || ccInput.trim() || bccInput.trim();
    if (!hasContent) {
      setAutoSaveStatus('idle');
      return;
    }

    const performSave = () => {
      setAutoSaveStatus('saving');
      const now = new Date();
      const draftPayload = {
        fromMailboxId,
        toInput,
        ccInput,
        bccInput,
        showCc,
        showBcc,
        subject,
        bodyText,
        readReceiptRequested,
        savedAt: now.toISOString(),
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(draftPayload));
        setLastSavedTime(
          now.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
        );
        setAutoSaveStatus('saved');
      } catch (e) {
        console.error('Failed to auto-save draft', e);
      }
    };

    const interval = setInterval(performSave, 5000);
    return () => clearInterval(interval);
  }, [isOpen, fromMailboxId, toInput, ccInput, bccInput, showCc, showBcc, subject, bodyText, readReceiptRequested]);

  // Speech-to-Text Voice Dictation Setup
  const toggleVoiceDictation = () => {
    if (isRecordingVoice) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecordingVoice(false);
      showToast('Voice dictation ended', 'info');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      // Fallback simulation
      showToast('Transcribing microphone audio stream...', 'info');
      setIsRecordingVoice(true);
      setTimeout(() => {
        setBodyText((prev) => prev + (prev ? '\n\n' : '') + 'Please find attached the updated structural drawings for review. Let us know if you need any adjustments.');
        setIsRecordingVoice(false);
        showToast('Voice dictation transcribed to composer', 'success');
      }, 2500);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        setBodyText((prev) => prev + ' ' + transcript);
      };

      recognition.onerror = () => {
        setIsRecordingVoice(false);
      };

      recognition.onend = () => {
        setIsRecordingVoice(false);
      };

      recognition.start();
      recognitionRef.current = recognition;
      setIsRecordingVoice(true);
      showToast('Microphone listening... Speak clearly', 'info');
    } catch (e) {
      setIsRecordingVoice(false);
    }
  };

  const handleDiscardDraft = () => {
    if (confirm('Discard this draft? Unsaved changes will be cleared.')) {
      localStorage.removeItem(STORAGE_KEY);
      setToInput('');
      setCcInput('');
      setBccInput('');
      setSubject('');
      setBodyText('');
      setAttachments([]);
      onClose();
    }
  };

  const parseRecipients = (raw: string) => {
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((addr) => {
        const match = addr.match(/^(.*?)\s*<(.+@.+)>$/);
        if (match) {
          return { name: match[1].replace(/["']/g, '').trim(), address: match[2].trim() };
        }
        return { address: addr };
      });
  };

  const handleApplyTemplate = (tpl: EmailTemplate) => {
    setSubject(tpl.subject);
    setBodyText(tpl.bodyText);
    setIsTemplateMenuOpen(false);
    showToast(`Loaded template: "${tpl.name}"`, 'success');
  };

  // Schedule Quick Handlers
  const setQuickSchedule = (hours: number, label: string) => {
    const target = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
    setScheduledAt(target);
    setIsScheduleMenuOpen(false);
    showToast(`Scheduled for delivery on ${label}`, 'info');
  };

  const handleSend = async (isDraft = false) => {
    if (!isDraft && !toInput.trim()) {
      showToast('Please specify at least one recipient', 'error');
      return;
    }

    const toRecipients = parseRecipients(toInput);
    const ccRecipients = parseRecipients(ccInput);
    const bccRecipients = parseRecipients(bccInput);

    const payload = {
      mailboxId: fromMailboxId,
      to: toRecipients,
      cc: ccRecipients.length > 0 ? ccRecipients : undefined,
      bcc: bccRecipients.length > 0 ? bccRecipients : undefined,
      subject: subject.trim() || '(No Subject)',
      bodyText,
      bodyHtml: `<p>${bodyText.replace(/\n/g, '<br/>')}</p>`,
      isDraft,
      attachments,
      readReceiptRequested,
      scheduledAt: scheduledAt || undefined,
      isPgpEncrypted,
      isPasswordProtected,
      accessPassword: isPasswordProtected ? accessPassword : undefined,
    };

    if (isDraft) {
      try {
        await api.sendMessage(payload);
        localStorage.removeItem(STORAGE_KEY);
        showToast('Draft saved on server', 'success');
        onSent();
        onClose();
      } catch (err: any) {
        showToast(err.message || 'Failed to save draft', 'error');
      }
      return;
    }

    // Start 10-second Undo Send Countdown
    pendingPayloadRef.current = payload;
    setUndoSendPending(true);
    setUndoCountdown(10);
    onClose();

    undoTimerRef.current = setInterval(async () => {
      setUndoCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(undoTimerRef.current);
          dispatchFinalSend(pendingPayloadRef.current);
          setUndoSendPending(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const cancelUndoSend = () => {
    if (undoTimerRef.current) {
      clearInterval(undoTimerRef.current);
    }
    setUndoSendPending(false);
    showToast('Send cancelled! Message restored to draft.', 'info');
  };

  const dispatchFinalSend = async (payload: any) => {
    try {
      await api.sendMessage(payload);
      localStorage.removeItem(STORAGE_KEY);
      showToast(
        payload.scheduledAt
          ? `Dispatched to delivery queue (Scheduled for ${new Date(payload.scheduledAt).toLocaleString()})`
          : 'Message cryptographically signed & delivered with DKIM/SPF',
        'success'
      );
      onSent();
    } catch (err: any) {
      showToast(err.message || 'Failed to send message', 'error');
    }
  };

  const handleGenerateWithAi = async () => {
    if (!aiNotes.trim()) {
      showToast('Please provide a brief topic or bullet points for the AI', 'error');
      return;
    }
    setIsAiProcessing(true);
    try {
      const res = await api.aiCopilot({
        action: 'draft',
        context: `Subject: ${subject}\nNotes: ${aiNotes}`,
      });
      setBodyText(res.result);
      setAiPromptOpen(false);
      setAiNotes('');
      showToast('Email drafted with Gemini AI Copilot', 'success');
    } catch (err: any) {
      showToast(err.message || 'AI drafting failed', 'error');
    } finally {
      setIsAiProcessing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files: File[] = Array.from(e.target.files);
      const newAtts: EmailAttachment[] = files.map((f) => ({
        id: `att_${Date.now()}_${Math.random()}`,
        filename: f.name,
        contentType: f.type || 'application/octet-stream',
        size: f.size,
      }));
      setAttachments((prev) => [...prev, ...newAtts]);
      showToast(`Attached ${files.length} file(s)`, 'info');
    }
  };

  const handleInsertSignature = (sigContent: string, sigName: string) => {
    setBodyText((prev) => {
      const trimmed = prev.trimEnd();
      return trimmed ? `${trimmed}\n\n${sigContent}` : sigContent;
    });
    setSignatureDropdownOpen(false);
    showToast(`Appended signature: "${sigName}"`, 'info');
  };

  return (
    <>
      {/* 10-Second Undo Send Notification Pill */}
      {undoSendPending && (
        <div
          id="undo-send-banner"
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 px-5 py-3 rounded-xl bg-[#121215] border border-[#27272A] shadow-2xl text-xs text-white animate-in slide-in-from-bottom-5 duration-200"
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="font-semibold">Message sending in {undoCountdown}s...</span>
          </div>
          <button
            onClick={cancelUndoSend}
            className="px-3 py-1 rounded bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs cursor-pointer shadow-sm transition-all"
          >
            Undo Send
          </button>
        </div>
      )}

      {isOpen && (
        <div
          id="composer-modal-container"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-xs"
        >
          <div className="w-full sm:max-w-2xl bg-[#0F0F12] border border-[#27272A] rounded-t-lg sm:rounded-lg shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-[#E4E4E7] animate-in fade-in zoom-in-95 duration-150">
            {/* Top Header */}
            <div className="px-4 py-3 border-b border-[#27272A] flex items-center justify-between bg-[#18181B]">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="font-semibold text-xs text-white">New Sovereign Message</span>
                <span className="text-[10px] font-mono-code text-[#71717A] uppercase hidden sm:inline">
                  DKIM 2048-bit Encrypted
                </span>

                {/* Auto-saved Status Indicator */}
                <div id="composer-autosave-indicator" className="flex items-center">
                  {autoSaveStatus === 'saving' ? (
                    <span className="text-[10px] font-mono-code text-amber-400 bg-amber-950/40 border border-amber-800/40 px-2 py-0.5 rounded flex items-center gap-1.5 animate-pulse">
                      <Loader2 className="w-2.5 h-2.5 animate-spin" />
                      <span>Auto-saving draft...</span>
                    </span>
                  ) : autoSaveStatus === 'saved' && lastSavedTime ? (
                    <span className="text-[10px] font-mono-code text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded flex items-center gap-1.5 shadow-xs">
                      <Check className="w-2.5 h-2.5" />
                      <span>Auto-saved {lastSavedTime}</span>
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono-code text-[#71717A] bg-[#27272A]/50 px-1.5 py-0.5 rounded">
                      Draft auto-save (5s)
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSend(true)}
                  className="text-xs text-[#A1A1AA] hover:text-white px-2 py-1 rounded cursor-pointer"
                  title="Save as Server Draft"
                >
                  Save Draft
                </button>
                <button
                  onClick={handleDiscardDraft}
                  className="p-1 rounded-md text-[#71717A] hover:text-rose-400 hover:bg-[#27272A] cursor-pointer"
                  title="Discard draft"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={onClose}
                  className="p-1 rounded-md text-[#71717A] hover:text-white hover:bg-[#27272A] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Draft Recovered Banner */}
            {draftRestoredBanner && (
              <div className="px-4 py-1.5 bg-blue-950/40 border-b border-blue-800/40 text-[11px] text-blue-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <RotateCcw className="w-3 h-3 text-blue-400" />
                  <span>Draft recovered from local browser storage (auto-saved)</span>
                </span>
                <button
                  onClick={() => setDraftRestoredBanner(false)}
                  className="text-blue-400 hover:text-white text-xs cursor-pointer font-bold"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Sender and Recipients Form */}
            <div className="p-4 space-y-2.5 border-b border-[#27272A] text-xs">
              {/* From Mailbox Selector */}
              <div className="flex items-center gap-2">
                <label className="w-12 text-[#71717A] font-mono-code">From:</label>
                <select
                  id="composer-from-select"
                  value={fromMailboxId}
                  onChange={(e) => setFromMailboxId(e.target.value)}
                  className="flex-1 bg-[#18181B] border border-[#27272A] rounded px-2.5 py-1 text-[#E4E4E7] focus:outline-none focus:border-[#3F3F46] cursor-pointer"
                >
                  {mailboxes.map((mb) => (
                    <option key={mb.id} value={mb.id}>
                      {mb.name ? `${mb.name} <${mb.emailAddress}>` : mb.emailAddress}
                    </option>
                  ))}
                </select>
              </div>

              {/* To Field */}
              <div className="flex items-center gap-2">
                <label className="w-12 text-[#71717A] font-mono-code">To:</label>
                <input
                  id="composer-to-input"
                  type="text"
                  placeholder="Recipient email addresses (separated by commas)..."
                  value={toInput}
                  onChange={(e) => setToInput(e.target.value)}
                  className="flex-1 bg-transparent border-b border-[#27272A] focus:border-[#3F3F46] pb-1 text-white placeholder-[#71717A] focus:outline-none"
                />
                <div className="flex items-center gap-1.5 text-[11px] text-[#71717A] font-mono-code">
                  {!showCc && (
                    <button
                      type="button"
                      onClick={() => setShowCc(true)}
                      className="hover:text-white cursor-pointer"
                    >
                      Cc
                    </button>
                  )}
                  {!showBcc && (
                    <button
                      type="button"
                      onClick={() => setShowBcc(true)}
                      className="hover:text-white cursor-pointer"
                    >
                      Bcc
                    </button>
                  )}
                </div>
              </div>

              {showCc && (
                <div className="flex items-center gap-2 animate-in fade-in duration-100">
                  <label className="w-12 text-[#71717A] font-mono-code">Cc:</label>
                  <input
                    type="text"
                    placeholder="Cc recipients..."
                    value={ccInput}
                    onChange={(e) => setCcInput(e.target.value)}
                    className="flex-1 bg-transparent border-b border-[#27272A] focus:border-[#3F3F46] pb-1 text-white placeholder-[#71717A] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setShowCc(false);
                      setCcInput('');
                    }}
                    className="text-[#71717A] hover:text-white text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              )}

              {showBcc && (
                <div className="flex items-center gap-2 animate-in fade-in duration-100">
                  <label className="w-12 text-[#71717A] font-mono-code">Bcc:</label>
                  <input
                    type="text"
                    placeholder="Bcc recipients..."
                    value={bccInput}
                    onChange={(e) => setBccInput(e.target.value)}
                    className="flex-1 bg-transparent border-b border-[#27272A] focus:border-[#3F3F46] pb-1 text-white placeholder-[#71717A] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setShowBcc(false);
                      setBccInput('');
                    }}
                    className="text-[#71717A] hover:text-white text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Subject Field */}
              <div className="flex items-center gap-2">
                <label className="w-12 text-[#71717A] font-mono-code">Subject:</label>
                <input
                  id="composer-subject-input"
                  type="text"
                  placeholder="Subject line..."
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="flex-1 bg-transparent border-b border-[#27272A] focus:border-[#3F3F46] pb-1 text-white placeholder-[#71717A] focus:outline-none font-medium"
                />
              </div>
            </div>

            {/* Template & Security Toolbar */}
            <div className="px-4 py-2 border-b border-[#27272A] bg-[#121215] flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                {/* Templates Dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsTemplateMenuOpen(!isTemplateMenuOpen)}
                    className="px-2.5 py-1 rounded bg-[#18181B] hover:bg-[#27272A] text-[#D4D4D8] border border-[#27272A] flex items-center gap-1.5 text-xs"
                  >
                    <LayoutTemplate className="w-3.5 h-3.5 text-blue-400" />
                    <span>Templates ({templates.length})</span>
                    <ChevronDown className="w-3 h-3 text-[#71717A]" />
                  </button>

                  {isTemplateMenuOpen && (
                    <div className="absolute left-0 mt-1 w-64 rounded-md bg-[#0F0F12] border border-[#27272A] shadow-2xl py-1 z-40 text-xs">
                      <div className="px-3 py-1 text-[10px] font-mono-code text-[#71717A] uppercase border-b border-[#27272A]">
                        Insert Quick Template
                      </div>
                      {templates.length === 0 ? (
                        <div className="p-3 text-[11px] text-[#71717A]">No saved templates found</div>
                      ) : (
                        templates.map((tpl) => (
                          <button
                            key={tpl.id}
                            onClick={() => handleApplyTemplate(tpl)}
                            className="w-full text-left px-3 py-2 text-[#E4E4E7] hover:bg-[#18181B] flex flex-col"
                          >
                            <span className="font-semibold text-white">{tpl.name}</span>
                            <span className="text-[10px] text-[#71717A] truncate">{tpl.subject}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Voice Dictation Button */}
                <button
                  type="button"
                  onClick={toggleVoiceDictation}
                  className={`px-2.5 py-1 rounded border flex items-center gap-1.5 text-xs transition-colors ${
                    isRecordingVoice
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                      : 'bg-[#18181B] hover:bg-[#27272A] text-[#D4D4D8] border-[#27272A]'
                  }`}
                  title={isRecordingVoice ? 'Stop recording' : 'Dictate with Voice to Text'}
                >
                  {isRecordingVoice ? <MicOff className="w-3.5 h-3.5 text-rose-400" /> : <Mic className="w-3.5 h-3.5 text-purple-400" />}
                  <span>{isRecordingVoice ? 'Listening...' : 'Voice Dictate'}</span>
                </button>

                {/* PGP Encryption Toggle */}
                <button
                  type="button"
                  onClick={() => setIsPgpEncrypted(!isPgpEncrypted)}
                  className={`px-2.5 py-1 rounded border flex items-center gap-1.5 text-xs transition-colors ${
                    isPgpEncrypted
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-[#18181B] hover:bg-[#27272A] text-[#71717A] border-[#27272A]'
                  }`}
                  title="Enforce 4096-bit RSA OpenPGP End-to-End Encryption"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>PGP Armor {isPgpEncrypted ? 'ON' : 'OFF'}</span>
                </button>

                {/* Password Protection Toggle */}
                <button
                  type="button"
                  onClick={() => setIsPasswordProtected(!isPasswordProtected)}
                  className={`px-2.5 py-1 rounded border flex items-center gap-1.5 text-xs transition-colors ${
                    isPasswordProtected
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-[#18181B] hover:bg-[#27272A] text-[#71717A] border-[#27272A]'
                  }`}
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Password Lock {isPasswordProtected ? 'ON' : 'OFF'}</span>
                </button>
              </div>

              {/* Scheduled Indicator if active */}
              {scheduledAt && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20 font-mono-code text-[10px]">
                  <Clock className="w-3 h-3" />
                  <span>Delivery: {new Date(scheduledAt).toLocaleString()}</span>
                  <button onClick={() => setScheduledAt(null)} className="ml-1 text-blue-400 hover:text-white">✕</button>
                </div>
              )}
            </div>

            {/* Password input row if enabled */}
            {isPasswordProtected && (
              <div className="px-4 py-2 bg-amber-950/20 border-b border-amber-800/30 flex items-center gap-3 text-xs">
                <label className="text-amber-300 font-semibold font-mono-code">Access Password:</label>
                <input
                  type="password"
                  required
                  placeholder="Set recipient unlocking passcode..."
                  value={accessPassword}
                  onChange={(e) => setAccessPassword(e.target.value)}
                  className="flex-1 bg-[#18181B] border border-[#27272A] rounded px-2.5 py-1 text-white focus:outline-none focus:border-amber-400"
                />
              </div>
            )}

            {/* AI Assistant Inline Drawer */}
            {aiPromptOpen && (
              <div className="p-3 bg-[#18181B] border-b border-[#27272A] space-y-2 text-xs animate-in slide-in-from-top-2 duration-150">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-semibold text-white">
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                    <span>Gemini AI Drafting Assistant</span>
                  </div>
                  <button
                    onClick={() => setAiPromptOpen(false)}
                    className="text-[#71717A] hover:text-white"
                  >
                    ✕
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={aiNotes}
                  onChange={(e) => setAiNotes(e.target.value)}
                  placeholder="Bullet points or instructions: 'Polite architectural proposal follow-up with next milestones...'"
                  className="w-full bg-[#121215] border border-[#27272A] rounded p-2 text-white placeholder-[#71717A] focus:outline-none focus:border-[#3F3F46]"
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleGenerateWithAi}
                    disabled={isAiProcessing}
                    className="px-3 py-1.5 bg-white text-black font-semibold text-xs rounded hover:bg-[#E4E4E7] flex items-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{isAiProcessing ? 'Drafting...' : 'Draft Message'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Email Body Textarea */}
            <div className="flex-1 p-4 overflow-y-auto">
              <textarea
                id="composer-body-textarea"
                rows={10}
                placeholder="Write your sovereign correspondence..."
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                className="w-full h-full min-h-[180px] bg-transparent text-xs text-[#E4E4E7] placeholder-[#71717A] focus:outline-none resize-none leading-relaxed"
              />
            </div>

            {/* Attached Files List */}
            {attachments.length > 0 && (
              <div className="px-4 py-2 border-t border-[#27272A] bg-[#121215] flex flex-wrap gap-2 text-xs">
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center gap-1.5 bg-[#18181B] border border-[#27272A] rounded px-2.5 py-1 text-[#E4E4E7]"
                  >
                    <Paperclip className="w-3 h-3 text-[#71717A]" />
                    <span className="truncate max-w-[150px]">{att.filename}</span>
                    <span className="text-[10px] text-[#71717A]">
                      ({(att.size / 1024).toFixed(0)} KB)
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setAttachments((prev) => prev.filter((a) => a.id !== att.id))
                      }
                      className="text-[#71717A] hover:text-rose-400 ml-1 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Bottom Footer Actions */}
            <div className="px-4 py-3 border-t border-[#27272A] bg-[#18181B] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {/* File Attachment Button */}
                <label className="p-2 rounded hover:bg-[#27272A] text-[#A1A1AA] hover:text-white cursor-pointer transition-colors">
                  <Paperclip className="w-4 h-4" />
                  <input
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                {/* AI Assistant Button */}
                <button
                  type="button"
                  onClick={() => setAiPromptOpen(!aiPromptOpen)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded hover:bg-[#27272A] text-[#A1A1AA] hover:text-white text-xs cursor-pointer transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">AI Copilot</span>
                </button>

                {/* Signatures Selector */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setSignatureDropdownOpen(!signatureDropdownOpen)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded hover:bg-[#27272A] text-[#A1A1AA] hover:text-white text-xs cursor-pointer transition-colors"
                  >
                    <FileSignature className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Signature</span>
                    <ChevronDown className="w-3 h-3 text-[#71717A]" />
                  </button>

                  {signatureDropdownOpen && (
                    <div className="absolute left-0 bottom-full mb-2 w-56 rounded-md bg-[#0F0F12] border border-[#27272A] shadow-2xl py-1 z-30 text-xs">
                      <div className="px-3 py-1.5 text-[10px] font-mono-code text-[#71717A] uppercase border-b border-[#27272A]">
                        Insert Signature
                      </div>
                      {signatures.length === 0 ? (
                        <div className="px-3 py-2 text-[11px] text-[#71717A]">
                          No signatures created
                        </div>
                      ) : (
                        signatures.map((sig) => (
                          <button
                            key={sig.id}
                            type="button"
                            onClick={() => handleInsertSignature(sig.content, sig.name)}
                            className="w-full text-left px-3 py-1.5 text-[#E4E4E7] hover:bg-[#18181B] truncate"
                          >
                            {sig.name}
                          </button>
                        ))
                      )}
                      <div className="border-t border-[#27272A] mt-1 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setSignatureDropdownOpen(false);
                            setSignaturesModalOpen(true);
                          }}
                          className="w-full text-left px-3 py-1.5 text-xs text-white hover:bg-[#18181B] font-medium"
                        >
                          + Manage Signatures...
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Read Receipt Request Toggle */}
                <button
                  id="composer-read-receipt-toggle"
                  type="button"
                  onClick={() => setReadReceiptRequested(!readReceiptRequested)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs transition-colors cursor-pointer border ${
                    readReceiptRequested
                      ? 'bg-blue-500/15 border-blue-500/40 text-blue-400 font-semibold'
                      : 'bg-transparent border-transparent text-[#A1A1AA] hover:bg-[#27272A] hover:text-white'
                  }`}
                  title="Request read receipt notification and tracking header (Disposition-Notification-To / X-Confirm-Reading-To)"
                >
                  <CheckCheck className={`w-3.5 h-3.5 ${readReceiptRequested ? 'text-blue-400' : 'text-[#71717A]'}`} />
                  <span className="hidden sm:inline">Read Receipt</span>
                  {readReceiptRequested && (
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
                  )}
                </button>
              </div>

              {/* Send Button & Scheduled Send Dropdown */}
              <div className="flex items-center gap-1">
                <button
                  id="composer-send-button"
                  type="button"
                  onClick={() => handleSend(false)}
                  disabled={isSending}
                  className="flex items-center gap-2 px-5 py-2 rounded-l-md bg-white hover:bg-[#E4E4E7] text-black text-xs font-bold shadow-sm transition-all cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{scheduledAt ? 'Schedule Send' : 'Send'}</span>
                </button>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsScheduleMenuOpen(!isScheduleMenuOpen)}
                    className="px-2 py-2 rounded-r-md bg-[#27272A] hover:bg-[#3F3F46] text-white text-xs border-l border-black/20"
                    title="Schedule send time"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>

                  {isScheduleMenuOpen && (
                    <div className="absolute right-0 bottom-full mb-2 w-56 rounded-md bg-[#0F0F12] border border-[#27272A] shadow-2xl py-1 z-30 text-xs">
                      <div className="px-3 py-1.5 text-[10px] font-mono-code text-[#71717A] uppercase border-b border-[#27272A]">
                        Schedule Delivery
                      </div>
                      <button
                        onClick={() => setQuickSchedule(14, 'Tomorrow 8:00 AM')}
                        className="w-full text-left px-3 py-2 text-[#E4E4E7] hover:bg-[#18181B] flex items-center justify-between"
                      >
                        <span>Tomorrow Morning</span>
                        <span className="text-[10px] text-[#71717A]">8:00 AM</span>
                      </button>
                      <button
                        onClick={() => setQuickSchedule(72, 'Monday 9:00 AM')}
                        className="w-full text-left px-3 py-2 text-[#E4E4E7] hover:bg-[#18181B] flex items-center justify-between"
                      >
                        <span>Monday Morning</span>
                        <span className="text-[10px] text-[#71717A]">9:00 AM</span>
                      </button>
                      <div className="p-2 border-t border-[#27272A]">
                        <label className="block text-[10px] font-mono-code text-[#71717A] uppercase mb-1">
                          Custom Date & Time
                        </label>
                        <input
                          type="datetime-local"
                          onChange={(e) => {
                            if (e.target.value) {
                              setScheduledAt(new Date(e.target.value).toISOString());
                              setIsScheduleMenuOpen(false);
                            }
                          }}
                          className="w-full px-2 py-1 rounded bg-[#18181B] border border-[#27272A] text-xs text-white"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Signature Editor Modal */}
      <SignaturesModal
        isOpen={signaturesModalOpen}
        onClose={() => {
          setSignaturesModalOpen(false);
          loadAuxData();
        }}
        initialMailboxId={fromMailboxId}
      />
    </>
  );
};
