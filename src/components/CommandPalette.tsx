import React, { useEffect, useMemo, useState } from 'react';
import {
  Search,
  Inbox,
  Globe,
  Mail,
  Shield,
  CreditCard,
  Users,
  Paperclip,
  Contact as ContactIcon,
  FileText,
  SlidersHorizontal,
  Activity,
  Award,
  Send,
  Sparkles,
  LogOut,
  Moon,
} from 'lucide-react';
import type { AppView } from '../context/AuthContext.js';

interface CommandItem {
  id: string;
  label: string;
  hint: string;
  icon: React.ReactNode;
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: AppView) => void;
  onCompose: () => void;
  onSimulate: () => void;
  onToggleTheme: () => void;
  onLogout: () => void;
  onOpenStatus?: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onCompose,
  onSimulate,
  onToggleTheme,
  onLogout,
  onOpenStatus,
}) => {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const items: CommandItem[] = useMemo(
    () => [
      { id: 'compose', label: 'Compose message', hint: 'C', icon: <Send className="w-4 h-4" />, action: onCompose },
      { id: 'webmail', label: 'Go to Webmail', hint: 'Inbox', icon: <Inbox className="w-4 h-4" />, action: () => onNavigate('webmail') },
      { id: 'contacts', label: 'Contacts', hint: 'People', icon: <ContactIcon className="w-4 h-4" />, action: () => onNavigate('contacts') },
      { id: 'templates', label: 'Templates', hint: 'Snippets', icon: <FileText className="w-4 h-4" />, action: () => onNavigate('templates') },
      { id: 'filters', label: 'Filter rules', hint: 'Automation', icon: <SlidersHorizontal className="w-4 h-4" />, action: () => onNavigate('filters') },
      { id: 'attachments', label: 'Attachments', hint: 'Files', icon: <Paperclip className="w-4 h-4" />, action: () => onNavigate('attachments') },
      { id: 'domains', label: 'Domains & DNS', hint: 'MX SPF DKIM', icon: <Globe className="w-4 h-4" />, action: () => onNavigate('domains') },
      { id: 'mailboxes', label: 'Mailboxes & aliases', hint: 'Users', icon: <Mail className="w-4 h-4" />, action: () => onNavigate('mailboxes') },
      { id: 'deliverability', label: 'Deliverability', hint: 'Inbox placement', icon: <Activity className="w-4 h-4" />, action: () => onNavigate('deliverability') },
      { id: 'bimi', label: 'BIMI brand', hint: 'Logo', icon: <Award className="w-4 h-4" />, action: () => onNavigate('bimi') },
      { id: 'team', label: 'Team', hint: 'RBAC', icon: <Users className="w-4 h-4" />, action: () => onNavigate('team') },
      { id: 'security', label: 'Security & PGP', hint: '2FA', icon: <Shield className="w-4 h-4" />, action: () => onNavigate('security') },
      { id: 'billing', label: 'Billing', hint: 'Plans', icon: <CreditCard className="w-4 h-4" />, action: () => onNavigate('billing') },
      {
        id: 'status',
        label: 'System status',
        hint: 'Public',
        icon: <Activity className="w-4 h-4" />,
        action: () => onOpenStatus?.(),
      },
      { id: 'simulate', label: 'Simulate inbound mail', hint: 'Demo', icon: <Sparkles className="w-4 h-4" />, action: onSimulate },
      { id: 'theme', label: 'Toggle theme', hint: 'Midnight', icon: <Moon className="w-4 h-4" />, action: onToggleTheme },
      { id: 'logout', label: 'Sign out', hint: 'Session', icon: <LogOut className="w-4 h-4" />, action: onLogout },
    ],
    [onCompose, onLogout, onNavigate, onOpenStatus, onSimulate, onToggleTheme]
  );

  const filtered = items.filter((item) => {
    const hay = `${item.label} ${item.hint} ${item.id}`.toLowerCase();
    return hay.includes(query.trim().toLowerCase());
  });

  useEffect(() => {
    setActiveIndex(0);
  }, [query, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, Math.max(filtered.length - 1, 0)));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && filtered[activeIndex]) {
        e.preventDefault();
        filtered[activeIndex].action();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeIndex, filtered, isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      id="mailoo-command-palette-backdrop"
      className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-start justify-center pt-[15vh] p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[#0F0F12] border border-[#27272A] rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[#27272A]">
          <Search className="w-4 h-4 text-[#71717A]" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Jump to inbox, domains, billing…"
            className="w-full bg-transparent text-sm text-white focus:outline-none"
          />
          <kbd className="text-[10px] font-mono-code text-[#71717A] border border-[#27272A] px-1.5 py-0.5 rounded">ESC</kbd>
        </div>
        <div className="max-h-80 overflow-y-auto py-1">
          {filtered.length === 0 && (
            <div className="px-4 py-8 text-center text-xs text-[#71717A]">No matching commands</div>
          )}
          {filtered.map((item, idx) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                item.action();
                onClose();
              }}
              className={`w-full flex items-center justify-between px-4 py-2.5 text-left text-xs ${
                idx === activeIndex ? 'bg-[#18181B] text-white' : 'text-[#A1A1AA] hover:bg-[#18181B] hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <span className="text-[#71717A]">{item.icon}</span>
                {item.label}
              </span>
              <span className="font-mono-code text-[10px] text-[#52525B]">{item.hint}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
