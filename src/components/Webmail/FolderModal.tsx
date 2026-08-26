import React, { useState, useEffect } from 'react';
import { Folder, Tag, Bookmark, Briefcase, Star, Archive, X, Check } from 'lucide-react';
import type { CustomFolder } from '../../types.js';

interface FolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (folderData: { name: string; color: string; icon: string }) => Promise<void>;
  editingFolder: CustomFolder | null;
}

const COLOR_OPTIONS = [
  { name: 'Blue', value: '#3b82f6', class: 'bg-blue-500' },
  { name: 'Purple', value: '#a855f7', class: 'bg-purple-500' },
  { name: 'Emerald', value: '#10b981', class: 'bg-emerald-500' },
  { name: 'Amber', value: '#f59e0b', class: 'bg-amber-500' },
  { name: 'Rose', value: '#f43f5e', class: 'bg-rose-500' },
  { name: 'Cyan', value: '#06b6d4', class: 'bg-cyan-500' },
  { name: 'Indigo', value: '#6366f1', class: 'bg-indigo-500' },
  { name: 'Zinc', value: '#71717a', class: 'bg-zinc-500' },
];

const ICON_OPTIONS = [
  { id: 'folder', label: 'Folder', icon: Folder },
  { id: 'tag', label: 'Tag', icon: Tag },
  { id: 'bookmark', label: 'Bookmark', icon: Bookmark },
  { id: 'briefcase', label: 'Projects', icon: Briefcase },
  { id: 'star', label: 'Star', icon: Star },
  { id: 'archive', label: 'Archive', icon: Archive },
];

export const FolderModal: React.FC<FolderModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingFolder,
}) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [icon, setIcon] = useState('folder');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingFolder) {
      setName(editingFolder.name);
      setColor(editingFolder.color || '#3b82f6');
      setIcon(editingFolder.icon || 'folder');
    } else {
      setName('');
      setColor('#3b82f6');
      setIcon('folder');
    }
  }, [editingFolder, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await onSave({
        name: name.trim(),
        color,
        icon,
      });
      onClose();
    } catch (err) {
      console.error('Failed to save folder', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="custom-folder-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs"
    >
      <div className="w-full max-w-md bg-[#0F0F12] border border-[#27272A] rounded-lg shadow-2xl overflow-hidden text-[#E4E4E7] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#27272A] bg-[#18181B] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Folder className="w-4 h-4 text-white" />
            <h3 className="font-semibold text-sm text-white">
              {editingFolder ? 'Rename Custom Folder' : 'New Custom Folder'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#71717A] hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Folder Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#A1A1AA]">
              Folder Name
            </label>
            <input
              id="custom-folder-name-input"
              type="text"
              required
              autoFocus
              placeholder="e.g. Legal & Contracts, Q4 Invoices..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#18181B] border border-[#27272A] rounded-md px-3 py-2 text-xs text-white placeholder-[#71717A] focus:outline-none focus:border-white"
            />
          </div>

          {/* Color Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-[#A1A1AA]">
              Folder Color Accent
            </label>
            <div className="flex flex-wrap gap-2.5">
              {COLOR_OPTIONS.map((c) => {
                const isSelected = color === c.value;
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setColor(c.value)}
                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                      c.class
                    } ${isSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0F0F12] scale-110' : 'opacity-70 hover:opacity-100'}`}
                    title={c.name}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Icon Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-[#A1A1AA]">
              Icon
            </label>
            <div className="grid grid-cols-3 gap-2">
              {ICON_OPTIONS.map((item) => {
                const ItemIcon = item.icon;
                const isSelected = icon === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setIcon(item.id)}
                    className={`flex items-center gap-2 p-2 rounded-md border text-xs transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#18181B] border-white text-white font-medium'
                        : 'bg-[#18181B]/50 border-[#27272A] text-[#71717A] hover:text-[#E4E4E7] hover:border-[#3F3F46]'
                    }`}
                  >
                    <ItemIcon className="w-3.5 h-3.5" style={{ color }} />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-[#27272A]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md text-xs font-semibold text-[#71717A] hover:text-white cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="save-custom-folder-btn"
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="px-4 py-2 rounded-md text-xs font-semibold bg-white hover:bg-[#E4E4E7] text-black shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Saving...' : editingFolder ? 'Save Changes' : 'Create Folder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
