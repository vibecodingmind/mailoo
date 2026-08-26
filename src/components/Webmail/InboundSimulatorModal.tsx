import React, { useState } from 'react';
import { X, Sparkles, Send, ShieldCheck, Mail, Building, FileCheck } from 'lucide-react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';

interface InboundSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSimulated: () => void;
}

export const InboundSimulatorModal: React.FC<InboundSimulatorModalProps> = ({
  isOpen,
  onClose,
  onSimulated,
}) => {
  const { mailboxes, selectedMailbox, showToast } = useAuth();

  const [targetMailboxId, setTargetMailboxId] = useState<string>(
    selectedMailbox?.id || mailboxes[0]?.id || ''
  );
  const [selectedPreset, setSelectedPreset] = useState<
    'client_inquiry' | 'security_alert' | 'invoice_receipt' | 'custom'
  >('client_inquiry');
  const [customFromName, setCustomFromName] = useState('Helena Lind');
  const [customFromAddress, setCustomFromAddress] = useState('helena@lind-architects.no');
  const [customSubject, setCustomSubject] = useState('Fjord House Timber Specifications');
  const [customBody, setCustomBody] = useState(
    'Hi Alex,\n\nWe completed the structural calculations for the timber roof grid. All deflection tolerances are well within Eurocode 5 standards.\n\nBest,\nHelena'
  );
  const [isSimulating, setIsSimulating] = useState(false);

  if (!isOpen) return null;

  const presets = [
    {
      id: 'client_inquiry',
      title: 'High-Value Client Inquiry',
      subtitle: 'From Klara Sörensen (Scandic Capital Group)',
      icon: <Building className="w-4 h-4 text-amber-400" />,
      desc: 'Simulates a VIP commercial architecture proposal inquiry.',
    },
    {
      id: 'security_alert',
      title: 'Mailoo Security Bulletin',
      subtitle: 'From alerts@mailoo.email',
      icon: <ShieldCheck className="w-4 h-4 text-emerald-400" />,
      desc: 'Simulates cryptographic cipher rotation report (100% DKIM pass).',
    },
    {
      id: 'invoice_receipt',
      title: 'Vendor Invoice with PDF Attachment',
      subtitle: 'From billing@klim-type.co.nz',
      icon: <FileCheck className="w-4 h-4 text-sky-400" />,
      desc: 'Simulates font foundry license receipt with real downloadable PDF attachment.',
    },
    {
      id: 'custom',
      title: 'Custom External Sender',
      subtitle: 'Configure your own sender & message body',
      icon: <Mail className="w-4 h-4 text-purple-400" />,
      desc: 'Test custom inbound headers and body text.',
    },
  ];

  const handleSimulate = async () => {
    if (!targetMailboxId) {
      showToast('Please select a destination mailbox', 'error');
      return;
    }

    setIsSimulating(true);
    try {
      if (selectedPreset === 'custom') {
        await api.simulateInbound({
          mailboxId: targetMailboxId,
          fromName: customFromName,
          fromAddress: customFromAddress,
          subject: customSubject,
          bodyText: customBody,
        });
      } else {
        await api.simulateInbound({
          mailboxId: targetMailboxId,
          preset: selectedPreset as 'client_inquiry' | 'security_alert' | 'invoice_receipt',
        });
      }

      showToast('Simulated incoming message delivered to inbox (SPF/DKIM verified)', 'success');
      onSimulated();
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Simulation failed', 'error');
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div
      id="inbound-simulator-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs"
    >
      <div className="w-full max-w-lg bg-[#0F0F12] border border-[#27272A] rounded-lg shadow-2xl overflow-hidden text-[#E4E4E7]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#27272A] flex items-center justify-between bg-[#18181B]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-[#27272A] text-white border border-[#3F3F46]/50">
              <Sparkles className="w-4 h-4 text-neutral-300" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-white">Inbound Mail Simulator</h3>
              <p className="text-[11px] text-[#71717A]">
                Test domain MX routing, spam filter, and cryptographic verification
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#71717A] hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Target Mailbox */}
          <div className="space-y-1">
            <label className="text-xs font-mono-code text-[#71717A]">Target Mailbox:</label>
            <select
              id="simulate-target-mailbox"
              value={targetMailboxId}
              onChange={(e) => setTargetMailboxId(e.target.value)}
              className="w-full bg-[#18181B] border border-[#27272A] rounded-md px-3 py-2 text-xs text-[#E4E4E7] focus:outline-none focus:border-[#3F3F46]"
            >
              {mailboxes.map((mb) => (
                <option key={mb.id} value={mb.id}>
                  {mb.emailAddress} ({mb.name || 'Mailbox'})
                </option>
              ))}
            </select>
          </div>

          {/* Preset Selector Cards */}
          <div className="space-y-2">
            <label className="text-xs font-mono-code text-[#71717A]">Select Test Scenario:</label>
            <div className="space-y-2">
              {presets.map((p) => {
                const isSelected = selectedPreset === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPreset(p.id as any)}
                    className={`p-3 rounded-md border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[#18181B] border-white/60 shadow-sm'
                        : 'bg-[#0A0A0B] border-[#27272A] hover:bg-[#18181B] hover:border-[#3F3F46]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded bg-[#18181B] border border-[#27272A]">{p.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-white">{p.title}</span>
                          <span className="text-[10px] font-mono-code text-[#71717A]">
                            {p.subtitle}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#A1A1AA] mt-0.5">{p.desc}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Custom form if chosen */}
          {selectedPreset === 'custom' && (
            <div className="space-y-2.5 pt-2 border-t border-[#27272A] text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[#71717A] font-mono-code">Sender Name:</label>
                  <input
                    type="text"
                    value={customFromName}
                    onChange={(e) => setCustomFromName(e.target.value)}
                    className="w-full bg-[#18181B] border border-[#27272A] rounded px-2.5 py-1.5 text-white mt-1"
                  />
                </div>
                <div>
                  <label className="text-[#71717A] font-mono-code">Sender Email:</label>
                  <input
                    type="text"
                    value={customFromAddress}
                    onChange={(e) => setCustomFromAddress(e.target.value)}
                    className="w-full bg-[#18181B] border border-[#27272A] rounded px-2.5 py-1.5 text-white mt-1"
                  />
                </div>
              </div>

              <div>
                <label className="text-[#71717A] font-mono-code">Subject:</label>
                <input
                  type="text"
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  className="w-full bg-[#18181B] border border-[#27272A] rounded px-2.5 py-1.5 text-white mt-1"
                />
              </div>

              <div>
                <label className="text-[#71717A] font-mono-code">Body:</label>
                <textarea
                  rows={3}
                  value={customBody}
                  onChange={(e) => setCustomBody(e.target.value)}
                  className="w-full bg-[#18181B] border border-[#27272A] rounded px-2.5 py-1.5 text-white mt-1"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-[#18181B] border-t border-[#27272A] flex items-center justify-between">
          <div className="text-[11px] font-mono-code text-[#71717A]">
            Ingress: mail.mailoo.email (MX 10)
          </div>
          <button
            id="trigger-inbound-simulation-btn"
            onClick={handleSimulate}
            disabled={isSimulating}
            className="flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold bg-white hover:bg-[#E4E4E7] text-black shadow-sm transition-all disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isSimulating ? 'Injecting Message...' : 'Trigger Inbound Email'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
