import React, { useState, useEffect } from 'react';
import { Plane, Calendar, Clock, X, Check, Power } from 'lucide-react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import type { VacationResponder } from '../../types.js';

interface VacationResponderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VacationResponderModal: React.FC<VacationResponderModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { selectedMailbox, showToast } = useAuth();
  const [responder, setResponder] = useState<VacationResponder | null>(null);
  const [isEnabled, setIsEnabled] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [subject, setSubject] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [onlyContacts, setOnlyContacts] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && selectedMailbox) {
      loadResponder();
    }
  }, [isOpen, selectedMailbox?.id]);

  const loadResponder = async () => {
    if (!selectedMailbox) return;
    setIsLoading(true);
    try {
      const res = await api.getVacationResponder(selectedMailbox.id);
      const vr = (res as any).vacationResponder || (res as any).responder;
      if (vr) {
        setResponder(vr);
        setIsEnabled(vr.isEnabled);
        setStartDate(vr.startDate ? vr.startDate.split('T')[0] : '');
        setEndDate(vr.endDate ? vr.endDate.split('T')[0] : '');
        setSubject(vr.subject || 'Out of Office: Automated Architectural Response');
        setBodyText(
          vr.bodyText ||
            'Hello,\n\nThank you for reaching out. I am currently out of the office with limited email access. I will review and respond to inquiries upon my return.\n\nFor urgent studio inquiries, please contact studio@ateliernordic.com.\n\nBest regards,'
        );
        setOnlyContacts(vr.onlySendToContacts || false);
      }
    } catch (err: any) {
      console.warn('Failed to load vacation responder', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMailbox) return;

    try {
      await api.updateVacationResponder(selectedMailbox.id, {
        isEnabled,
        startDate: startDate ? new Date(startDate).toISOString() : new Date().toISOString(),
        endDate: endDate ? new Date(endDate).toISOString() : new Date(Date.now() + 7 * 86400000).toISOString(),
        subject,
        bodyText,
        onlySendToContacts: onlyContacts,
      });
      showToast(
        isEnabled ? 'Out-of-office automated responder activated' : 'Vacation responder saved & disabled',
        'success'
      );
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to save vacation responder', 'error');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-[#0F0F12] border border-[#27272A] rounded-xl shadow-2xl overflow-hidden text-[#E4E4E7]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#27272A] bg-[#18181B] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Plane className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-white">Vacation & Out-of-Office Auto-Responder</h3>
              <p className="text-[10px] text-[#A1A1AA]">Automatic sovereign email response engine</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#71717A] hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4">
          {/* Active Switch */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-[#18181B] border border-[#27272A]">
            <div>
              <div className="text-xs font-semibold text-white">Enable Vacation Responder</div>
              <div className="text-[11px] text-[#71717A]">
                Automatically reply to incoming messages for {selectedMailbox?.emailAddress}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsEnabled(!isEnabled)}
              className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                isEnabled ? 'bg-emerald-500 text-black' : 'bg-[#27272A] text-[#71717A]'
              }`}
            >
              <Power className="w-3 h-3" />
              <span>{isEnabled ? 'ACTIVE' : 'OFF'}</span>
            </button>
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#A1A1AA] mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-1.5 rounded-md bg-[#18181B] border border-[#27272A] text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#A1A1AA] mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-1.5 rounded-md bg-[#18181B] border border-[#27272A] text-xs text-white"
              />
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-xs font-medium text-[#A1A1AA] mb-1">Auto-Response Subject</label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-1.5 rounded-md bg-[#18181B] border border-[#27272A] text-xs text-white focus:outline-none focus:border-white"
            />
          </div>

          {/* Body */}
          <div>
            <label className="block text-xs font-medium text-[#A1A1AA] mb-1">Response Message Body</label>
            <textarea
              rows={5}
              required
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              className="w-full p-3 rounded-md bg-[#18181B] border border-[#27272A] text-xs text-white focus:outline-none focus:border-white leading-relaxed"
            />
          </div>

          {/* Option */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="vacation-contacts-only"
              checked={onlyContacts}
              onChange={(e) => setOnlyContacts(e.target.checked)}
              className="rounded bg-[#18181B] border-[#27272A]"
            />
            <label htmlFor="vacation-contacts-only" className="text-xs text-[#A1A1AA] cursor-pointer">
              Only send auto-response to people in my Address Book contacts
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#27272A]">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-md bg-[#18181B] hover:bg-[#27272A] text-xs font-medium text-[#A1A1AA] hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-md bg-white hover:bg-[#E4E4E7] text-xs font-semibold text-black shadow-sm"
            >
              Save Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
