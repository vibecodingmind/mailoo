import React, { useState } from 'react';
import {
  Inbox,
  Star,
  Clock,
  Send,
  FileText,
  Archive,
  AlertOctagon,
  Trash2,
  Tag,
  Plus,
  ChevronDown,
  Folder,
  Edit2,
  Bookmark,
  Briefcase,
  Layers,
  FileSignature,
  Keyboard,
  Sun,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import type { MailFolder, CustomFolder } from '../../types.js';

interface FolderSidebarProps {
  currentFolder: MailFolder;
  onSelectFolder: (folder: MailFolder) => void;
  selectedLabel: string | null;
  onSelectLabel: (label: string | null) => void;
  onOpenCompose: () => void;
  unreadCounts: Record<string, number>;
  customFolders: CustomFolder[];
  onOpenCreateFolder: () => void;
  onOpenEditFolder: (folder: CustomFolder) => void;
  onDeleteFolder: (folderId: string) => void;
  onDropThreadOnFolder: (threadId: string, targetFolderId: string) => void;
  onOpenSignatures?: () => void;
  onOpenShortcuts?: () => void;
  onOpenVacation?: () => void;
}

export const FolderSidebar: React.FC<FolderSidebarProps> = ({
  currentFolder,
  onSelectFolder,
  selectedLabel,
  onSelectLabel,
  onOpenCompose,
  unreadCounts,
  customFolders = [],
  onOpenCreateFolder,
  onOpenEditFolder,
  onDeleteFolder,
  onDropThreadOnFolder,
  onOpenSignatures,
  onOpenShortcuts,
  onOpenVacation,
}) => {
  const { mailboxes, selectedMailbox, setSelectedMailbox, organization } = useAuth();
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);

  const systemFolders: { id: MailFolder; label: string; icon: React.ReactNode }[] = [
    { id: 'inbox', label: 'Inbox', icon: <Inbox className="w-4 h-4" /> },
    { id: 'starred', label: 'Starred', icon: <Star className="w-4 h-4" /> },
    { id: 'snoozed', label: 'Snoozed', icon: <Clock className="w-4 h-4" /> },
    { id: 'sent', label: 'Sent', icon: <Send className="w-4 h-4" /> },
    { id: 'drafts', label: 'Drafts', icon: <FileText className="w-4 h-4" /> },
    { id: 'archive', label: 'Archive', icon: <Archive className="w-4 h-4" /> },
    { id: 'spam', label: 'Spam', icon: <AlertOctagon className="w-4 h-4" /> },
    { id: 'trash', label: 'Trash', icon: <Trash2 className="w-4 h-4" /> },
  ];

  const labels = [
    { name: 'Architecture', color: 'bg-blue-500' },
    { name: 'Security', color: 'bg-purple-500' },
    { name: 'Priority', color: 'bg-emerald-500' },
    { name: 'Invoices', color: 'bg-amber-500' },
  ];

  const usedStorageMb = selectedMailbox ? selectedMailbox.usedMb : organization?.currentStorageMb || 2400;
  const maxStorageMb = selectedMailbox ? selectedMailbox.quotaMb : (organization?.maxStorageGb || 50) * 1024;
  const storagePercent = Math.min(100, Math.round((usedStorageMb / maxStorageMb) * 100));

  const handleDragOver = (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverFolder !== folderId) {
      setDragOverFolder(folderId);
    }
  };

  const handleDragLeave = (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    if (dragOverFolder === folderId) {
      setDragOverFolder(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetFolderId: string) => {
    e.preventDefault();
    setDragOverFolder(null);
    const threadId =
      e.dataTransfer.getData('text/plain') ||
      e.dataTransfer.getData('application/monogram-thread-id');

    if (threadId) {
      onDropThreadOnFolder(threadId, targetFolderId);
    }
  };

  const renderFolderIcon = (iconName?: string, color?: string) => {
    const style = color ? { color } : undefined;
    switch (iconName) {
      case 'tag':
        return <Tag className="w-4 h-4 shrink-0" style={style} />;
      case 'bookmark':
        return <Bookmark className="w-4 h-4 shrink-0" style={style} />;
      case 'briefcase':
        return <Briefcase className="w-4 h-4 shrink-0" style={style} />;
      case 'star':
        return <Star className="w-4 h-4 shrink-0" style={style} />;
      case 'archive':
        return <Archive className="w-4 h-4 shrink-0" style={style} />;
      default:
        return <Folder className="w-4 h-4 shrink-0" style={style} />;
    }
  };

  return (
    <aside
      id="webmail-folder-sidebar"
      className="w-64 border-r border-[#27272A] bg-[#0F0F12] flex flex-col p-4 select-none text-[#E4E4E7] h-full shrink-0"
    >
      {/* Primary Compose Button */}
      <button
        id="sidebar-compose-button"
        onClick={onOpenCompose}
        className="w-full bg-white text-black font-semibold py-2.5 rounded-md text-sm mb-4 hover:bg-[#E4E4E7] transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
      >
        <Send className="w-4 h-4" />
        <span>Compose Message</span>
      </button>

      {/* Mailbox Switcher Box */}
      <div className="mb-4 pb-3 border-b border-[#27272A]">
        <div className="text-[10px] uppercase font-bold tracking-widest text-[#52525B] mb-1.5 px-1 font-mono-code">
          Active Mailbox
        </div>
        <div className="relative">
          <select
            id="mailbox-selector-dropdown"
            value={selectedMailbox?.id || ''}
            onChange={(e) => {
              const mb = mailboxes.find((m) => m.id === e.target.value);
              if (mb) setSelectedMailbox(mb);
            }}
            className="w-full bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] rounded-md px-2.5 py-1.5 text-xs text-[#E4E4E7] focus:outline-none focus:border-[#3F3F46] appearance-none pr-8 cursor-pointer font-medium"
          >
            {mailboxes.map((mb) => (
              <option key={mb.id} value={mb.id}>
                {mb.emailAddress} {mb.type === 'shared' ? '(Shared)' : ''}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-[#71717A] absolute right-2.5 top-2.5 pointer-events-none" />
        </div>
      </div>

      {/* Navigation: System Folders & Custom Folders */}
      <nav className="flex-1 space-y-4 overflow-y-auto pr-1">
        {/* System Mail Folders */}
        <div className="space-y-0.5">
          {systemFolders.map((f) => {
            const isActive = currentFolder === f.id && !selectedLabel;
            const isDragTarget = dragOverFolder === f.id;
            const unread = unreadCounts[f.id] || 0;

            return (
              <button
                key={f.id}
                id={`folder-btn-${f.id}`}
                onClick={() => {
                  onSelectLabel(null);
                  onSelectFolder(f.id);
                }}
                onDragOver={(e) => handleDragOver(e, f.id)}
                onDragLeave={(e) => handleDragLeave(e, f.id)}
                onDrop={(e) => handleDrop(e, f.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-all cursor-pointer ${
                  isDragTarget
                    ? 'bg-blue-600/30 border border-blue-500 text-white scale-[1.02]'
                    : isActive
                    ? 'bg-[#27272A] text-white font-medium'
                    : 'text-[#A1A1AA] hover:text-white hover:bg-[#18181B]'
                }`}
              >
                <span className="flex items-center gap-3">
                  {f.icon}
                  <span>{f.label}</span>
                </span>
                {unread > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-mono-code font-bold ${
                      isActive ? 'bg-[#3F3F46] text-white' : 'bg-[#27272A] text-[#A1A1AA]'
                    }`}
                  >
                    {unread}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Custom Email Folders Section */}
        <div className="pt-2 border-t border-[#27272A]">
          <div className="flex items-center justify-between px-3 py-1 text-[10px] uppercase font-bold tracking-widest text-[#52525B] font-mono-code">
            <span>Custom Folders</span>
            <button
              id="create-custom-folder-btn"
              onClick={onOpenCreateFolder}
              className="p-1 text-[#71717A] hover:text-white hover:bg-[#27272A] rounded transition-colors cursor-pointer"
              title="Create Custom Folder"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-0.5 mt-1">
            {customFolders.length === 0 ? (
              <div className="px-3 py-2 text-[11px] text-[#71717A] italic">
                No custom folders yet.
              </div>
            ) : (
              customFolders.map((cf) => {
                const isActive = currentFolder === cf.id && !selectedLabel;
                const isDragTarget = dragOverFolder === cf.id;
                const unread = unreadCounts[cf.id] || 0;

                return (
                  <div
                    key={cf.id}
                    id={`custom-folder-${cf.id}`}
                    onDragOver={(e) => handleDragOver(e, cf.id)}
                    onDragLeave={(e) => handleDragLeave(e, cf.id)}
                    onDrop={(e) => handleDrop(e, cf.id)}
                    className={`group relative flex items-center justify-between px-3 py-1.5 rounded-md text-xs sm:text-sm transition-all cursor-pointer ${
                      isDragTarget
                        ? 'bg-blue-600/30 border border-blue-500 text-white scale-[1.02]'
                        : isActive
                        ? 'bg-[#27272A] text-white font-medium'
                        : 'text-[#A1A1AA] hover:text-white hover:bg-[#18181B]'
                    }`}
                    onClick={() => {
                      onSelectLabel(null);
                      onSelectFolder(cf.id);
                    }}
                  >
                    <span className="flex items-center gap-2.5 truncate min-w-0 pr-2">
                      {renderFolderIcon(cf.icon, cf.color)}
                      <span className="truncate">{cf.name}</span>
                    </span>

                    {/* Unread count and Folder Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      {unread > 0 && (
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-mono-code font-bold ${
                            isActive ? 'bg-[#3F3F46] text-white' : 'bg-[#27272A] text-[#A1A1AA]'
                          }`}
                        >
                          {unread}
                        </span>
                      )}

                      {/* Edit / Delete action buttons on hover */}
                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenEditFolder(cf);
                          }}
                          className="p-1 text-[#71717A] hover:text-white rounded hover:bg-[#27272A] transition-colors"
                          title="Rename Folder"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteFolder(cf.id);
                          }}
                          className="p-1 text-[#71717A] hover:text-rose-400 rounded hover:bg-[#27272A] transition-colors"
                          title="Delete Folder"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Labels Section */}
        <div className="pt-2 border-t border-[#27272A]">
          <div className="px-3 py-1 text-[10px] uppercase font-bold tracking-widest text-[#52525B] font-mono-code">
            Labels
          </div>
          <div className="space-y-0.5 mt-1">
            {labels.map((lbl) => {
              const isSelected = selectedLabel === lbl.name;
              return (
                <button
                  key={lbl.name}
                  id={`label-filter-${lbl.name}`}
                  onClick={() => {
                    if (isSelected) {
                      onSelectLabel(null);
                    } else {
                      onSelectLabel(lbl.name);
                    }
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-1.5 text-xs sm:text-sm rounded-md transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#27272A] text-white font-medium'
                      : 'text-[#A1A1AA] hover:text-white hover:bg-[#18181B]'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${lbl.color}`}></span>
                  <span>{lbl.name}</span>
                </button>
              );
            })}
          </div>
        </div>
        {/* Quick Utilities: Signatures, Shortcuts & Vacation */}
        <div className="pt-2 border-t border-[#27272A] space-y-0.5">
          <button
            id="sidebar-signatures-btn"
            onClick={onOpenSignatures}
            className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-[#A1A1AA] hover:text-white hover:bg-[#18181B] rounded-md transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-2.5">
              <FileSignature className="w-3.5 h-3.5 text-neutral-300 group-hover:text-white transition-colors" />
              <span>Email Signatures</span>
            </div>
            <span className="text-[10px] font-mono-code text-[#71717A] bg-[#27272A] px-1.5 py-0.5 rounded">
              Manage
            </span>
          </button>

          <button
            id="sidebar-vacation-btn"
            onClick={onOpenVacation}
            className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-[#A1A1AA] hover:text-white hover:bg-[#18181B] rounded-md transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-2.5">
              <Sun className="w-3.5 h-3.5 text-amber-400 group-hover:text-amber-300 transition-colors" />
              <span>Vacation Responder</span>
            </div>
            <span className="text-[10px] font-mono-code text-[#71717A] bg-[#27272A] px-1.5 py-0.5 rounded">
              Auto
            </span>
          </button>

          <button
            id="sidebar-shortcuts-btn"
            onClick={onOpenShortcuts}
            className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-[#A1A1AA] hover:text-white hover:bg-[#18181B] rounded-md transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-2.5">
              <Keyboard className="w-3.5 h-3.5 text-neutral-300 group-hover:text-white transition-colors" />
              <span>Keyboard Shortcuts</span>
            </div>
            <kbd className="text-[10px] font-mono-code text-[#71717A] bg-[#27272A] px-1.5 py-0.5 rounded">
              ?
            </kbd>
          </button>
        </div>
      </nav>

      {/* Storage Quota Usage Meter */}
      <div className="mt-auto pt-4 border-t border-[#27272A]">
        <div className="px-1 mb-2 flex justify-between text-[11px] text-[#A1A1AA]">
          <span>Storage</span>
          <span>{storagePercent}%</span>
        </div>
        <div className="h-1.5 bg-[#27272A] rounded-full overflow-hidden">
          <div
            className="h-full bg-white transition-all duration-500 rounded-full"
            style={{ width: `${Math.max(4, storagePercent)}%` }}
          ></div>
        </div>
        <div className="flex items-center justify-between text-[10px] text-[#71717A] mt-1.5 px-1 font-mono-code">
          <span>{(usedStorageMb / 1024).toFixed(1)} GB</span>
          <span>{(maxStorageMb / 1024).toFixed(0)} GB</span>
        </div>
      </div>
    </aside>
  );
};
