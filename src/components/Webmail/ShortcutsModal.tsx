import React from 'react';
import { Keyboard, X, Command } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'C', desc: 'Compose new email' },
    { key: 'R', desc: 'Reply to selected message thread' },
    { key: 'Delete / ⌫', desc: 'Move selected thread to Trash' },
    { key: 'E', desc: 'Archive selected thread' },
    { key: 'S', desc: 'Star / unstar selected thread' },
    { key: 'J / ↓', desc: 'Navigate to next thread in inbox' },
    { key: 'K / ↑', desc: 'Navigate to previous thread in inbox' },
    { key: '/ or ⌘K', desc: 'Focus full-text search bar' },
    { key: '?', desc: 'Open this keyboard shortcuts cheat sheet' },
    { key: 'Esc', desc: 'Close modals / active overlays' },
  ];

  return (
    <div
      id="keyboard-shortcuts-modal-backdrop"
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        id="keyboard-shortcuts-modal"
        className="w-full max-w-md bg-[#0F0F12] border border-[#27272A] rounded-xl shadow-2xl overflow-hidden flex flex-col text-[#E4E4E7]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-[#27272A] flex items-center justify-between bg-[#18181B]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#27272A] border border-[#3F3F46] flex items-center justify-center text-white">
              <Keyboard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Keyboard Shortcuts</h3>
              <p className="text-[11px] text-[#71717A]">Power actions for webmail navigation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#71717A] hover:text-white p-1 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-2.5 max-h-[70vh] overflow-y-auto">
          {shortcuts.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between py-1.5 px-3 rounded bg-[#18181B]/60 border border-[#27272A]"
            >
              <span className="text-xs text-[#D4D4D8]">{item.desc}</span>
              <kbd className="px-2 py-1 rounded bg-[#0A0A0B] border border-[#3F3F46] text-[11px] font-mono-code font-bold text-white shadow-xs">
                {item.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="px-6 py-3 bg-[#18181B] border-t border-[#27272A] flex items-center justify-between text-xs text-[#71717A]">
          <span className="font-mono-code text-[11px]">Press ? anytime to toggle</span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded text-xs text-white hover:bg-[#27272A] cursor-pointer"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
