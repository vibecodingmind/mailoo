import React, { useState } from 'react';
import {
  Search,
  Star,
  ShieldCheck,
  Archive,
  Trash2,
  MailCheck,
  RefreshCw,
  FolderInput,
  GripVertical,
  ChevronRight,
  Folder,
  Clock,
  RotateCcw,
  Sparkles,
  Wand2,
} from 'lucide-react';
import type { Thread, MailFolder, CustomFolder } from '../../types.js';

interface ThreadListProps {
  threads: Thread[];
  selectedThreadId: string | null;
  onSelectThread: (id: string) => void;
  currentFolder: MailFolder;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onToggleStar: (threadId: string, e: React.MouseEvent) => void;
  onArchiveThread: (threadId: string, e: React.MouseEvent) => void;
  onTrashThread: (threadId: string, e: React.MouseEvent) => void;
  onMoveThread: (threadId: string, targetFolder: string) => void;
  onSnoozeThread?: (threadId: string, until: string, label: string) => void;
  onUnsnoozeThread?: (threadId: string) => void;
  onOpenSmartSort?: () => void;
  customFolders?: CustomFolder[];
  onRefresh: () => void;
  isLoading: boolean;
}

export const ThreadList: React.FC<ThreadListProps> = ({
  threads,
  selectedThreadId,
  onSelectThread,
  currentFolder,
  searchQuery,
  onSearchChange,
  onToggleStar,
  onArchiveThread,
  onTrashThread,
  onMoveThread,
  onSnoozeThread,
  onUnsnoozeThread,
  onOpenSmartSort,
  customFolders = [],
  onRefresh,
  isLoading,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'unread'>('all');
  const [activeMoveMenuThreadId, setActiveMoveMenuThreadId] = useState<string | null>(null);
  const [activeSnoozeMenuThreadId, setActiveSnoozeMenuThreadId] = useState<string | null>(null);

  const filteredThreads = threads.filter((t) => {
    if (filterType === 'unread') {
      return t.unreadCount > 0;
    }
    return true;
  });

  const formatTimestamp = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const handleDragStart = (e: React.DragEvent, threadId: string) => {
    e.dataTransfer.setData('text/plain', threadId);
    e.dataTransfer.setData('application/monogram-thread-id', threadId);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      id="webmail-thread-list-pane"
      className="w-full md:w-96 border-r border-[#27272A] bg-[#0A0A0B] flex flex-col h-full select-none shrink-0"
    >
      {/* Top Search & Filter Bar */}
      <div className="p-3 border-b border-[#27272A] space-y-2 bg-[#0F0F12]">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[#71717A] absolute left-3 top-2.5 pointer-events-none" />
          <input
            id="thread-search-input"
            type="text"
            placeholder="Search full-text subjects, bodies, senders (⌘K, /)..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-[#18181B] border border-[#27272A] rounded-md pl-8 pr-8 py-1.5 text-xs text-[#E4E4E7] placeholder-[#71717A] focus:outline-none focus:border-[#3F3F46]"
          />
          {searchQuery ? (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-2 text-xs text-[#71717A] hover:text-white cursor-pointer"
              title="Clear search"
            >
              ×
            </button>
          ) : (
            <kbd className="absolute right-2.5 top-2 px-1 py-0.5 text-[9px] font-mono-code text-[#71717A] bg-[#27272A] rounded border border-[#3F3F46]">
              /
            </kbd>
          )}
        </div>

        {/* Quick Filter Tabs, Token Pills & Refresh */}
        <div className="flex items-center justify-between text-xs flex-wrap gap-1">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                filterType === 'all' ? 'bg-[#27272A] text-white font-semibold' : 'text-[#A1A1AA] hover:text-white'
              }`}
            >
              All ({threads.length})
            </button>
            <button
              onClick={() => setFilterType('unread')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                filterType === 'unread' ? 'bg-[#27272A] text-white font-semibold' : 'text-[#A1A1AA] hover:text-white'
              }`}
            >
              Unread
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            {searchQuery && (
              <span className="text-[10px] font-mono-code text-neutral-300 bg-neutral-900 border border-neutral-700 px-1.5 py-0.5 rounded">
                Full-Text Index
              </span>
            )}
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="p-1 rounded-md text-[#71717A] hover:text-white hover:bg-[#18181B] transition-colors cursor-pointer"
              title="Check mail / refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Threads List Items */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#18181B]">
        {filteredThreads.length === 0 ? (
          <div className="p-8 text-center text-[#71717A] space-y-2">
            <div className="w-10 h-10 rounded-full bg-[#0F0F12] border border-[#27272A] flex items-center justify-center mx-auto text-[#71717A]">
              <MailCheck className="w-5 h-5" />
            </div>
            <div className="text-xs font-medium text-[#A1A1AA]">All caught up</div>
            <p className="text-[11px] text-[#71717A]">
              {searchQuery ? `No matching messages for "${searchQuery}"` : `No messages in ${currentFolder}.`}
            </p>
          </div>
        ) : (
          filteredThreads.map((thread) => {
            const isSelected = selectedThreadId === thread.id;
            const isUnread = thread.unreadCount > 0;
            const primarySender = thread.participants[0] || { name: 'Unknown', address: '' };
            const isMoveOpen = activeMoveMenuThreadId === thread.id;

            return (
              <div
                key={thread.id}
                id={`thread-item-${thread.id}`}
                draggable
                onDragStart={(e) => handleDragStart(e, thread.id)}
                onClick={() => {
                  setActiveMoveMenuThreadId(null);
                  onSelectThread(thread.id);
                }}
                className={`p-4 border-b border-[#18181B] cursor-pointer transition-colors relative group ${
                  isSelected
                    ? 'bg-[#18181B] border-l-2 border-l-white text-white'
                    : isUnread
                    ? 'bg-[#0F0F12] hover:bg-[#18181B] text-[#E4E4E7]'
                    : 'hover:bg-[#111114] text-[#A1A1AA]'
                }`}
              >
                {/* Header Row: Sender, Timestamp, Unread dot */}
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="opacity-0 group-hover:opacity-60 cursor-grab active:cursor-grabbing text-[#71717A] shrink-0">
                      <GripVertical className="w-3 h-3" />
                    </span>
                    {isUnread && <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0"></span>}
                    <span className={`text-xs truncate ${isUnread ? 'font-bold text-white' : 'font-medium text-[#E4E4E7]'}`}>
                      {primarySender.name || primarySender.address}
                    </span>
                    {thread.messageCount > 1 && (
                      <span className="text-[10px] font-mono-code bg-[#27272A] text-[#A1A1AA] px-1.5 py-0.5 rounded text-[9px] shrink-0">
                        {thread.messageCount}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-mono-code text-[#71717A] shrink-0">
                    {formatTimestamp(thread.lastMessageAt)}
                  </span>
                </div>

                {/* Subject Line */}
                <div className={`text-xs truncate mb-1 ${isUnread ? 'font-semibold text-white' : 'text-[#D4D4D8]'}`}>
                  {thread.subject || '(No Subject)'}
                </div>

                {/* Snippet Preview */}
                <div className="text-[11px] text-[#71717A] line-clamp-2 leading-relaxed mb-2 font-normal">
                  {thread.snippet}
                </div>

                {/* Footer: Tags, SPF/DKIM badge, Quick Action buttons */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    <span
                      title="Cryptographically Authenticated (SPF/DKIM 2048-bit Match)"
                      className="inline-flex items-center gap-1 text-[9px] font-mono-code bg-[#27272A] text-[#A1A1AA] border border-[#3F3F46]/40 px-1.5 py-0.5 rounded"
                    >
                      <ShieldCheck className="w-2.5 h-2.5 text-emerald-400" />
                      <span>DKIM</span>
                    </span>

                    {thread.isSnoozed && (
                      <span
                        title={`Snoozed until ${thread.snoozedUntil ? new Date(thread.snoozedUntil).toLocaleString() : 'later'}`}
                        className="inline-flex items-center gap-1 text-[9px] font-mono-code bg-blue-500/15 text-blue-400 border border-blue-500/30 px-1.5 py-0.5 rounded shrink-0"
                      >
                        <Clock className="w-2.5 h-2.5" />
                        <span>Snoozed</span>
                      </span>
                    )}

                    {thread.labels?.slice(0, 2).map((lbl) => (
                      <span
                        key={lbl}
                        className="text-[9px] font-mono-code bg-[#27272A] text-[#A1A1AA] px-1.5 py-0.5 rounded border border-[#3F3F46]/30"
                      >
                        {lbl}
                      </span>
                    ))}
                  </div>

                  {/* Hover Quick Actions */}
                  <div className="flex items-center gap-1 relative">
                    {/* Snooze Trigger */}
                    {thread.isSnoozed ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onUnsnoozeThread) onUnsnoozeThread(thread.id);
                        }}
                        className="p-1 text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
                        title="Unsnooze / Return to Inbox"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        id={`thread-snooze-btn-${thread.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMoveMenuThreadId(null);
                          setActiveSnoozeMenuThreadId(activeSnoozeMenuThreadId === thread.id ? null : thread.id);
                        }}
                        className="p-1 text-[#71717A] hover:text-blue-400 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                        title="Snooze conversation..."
                      >
                        <Clock className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Move-to Menu Trigger */}
                    <button
                      id={`thread-move-btn-${thread.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveSnoozeMenuThreadId(null);
                        setActiveMoveMenuThreadId(isMoveOpen ? null : thread.id);
                      }}
                      className="p-1 text-[#71717A] hover:text-white transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                      title="Move to folder..."
                    >
                      <FolderInput className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={(e) => onToggleStar(thread.id, e)}
                      className="p-1 text-[#71717A] hover:text-amber-400 transition-colors cursor-pointer"
                      title={thread.isStarred ? 'Unstar' : 'Star'}
                    >
                      <Star
                        className={`w-3.5 h-3.5 ${
                          thread.isStarred ? 'fill-amber-400 text-amber-400' : 'hover:text-amber-400'
                        }`}
                      />
                    </button>
                    <button
                      onClick={(e) => onArchiveThread(thread.id, e)}
                      className="p-1 text-[#71717A] hover:text-white transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                      title="Archive"
                    >
                      <Archive className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => onTrashThread(thread.id, e)}
                      className="p-1 text-[#71717A] hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Quick Snooze Dropdown Popover */}
                    {activeSnoozeMenuThreadId === thread.id && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-0 bottom-6 z-40 w-52 bg-[#0F0F12] border border-[#27272A] rounded-lg shadow-2xl py-1.5 text-xs text-[#E4E4E7] animate-in fade-in zoom-in-95 duration-100"
                      >
                        <div className="px-3 py-1 text-[10px] font-mono-code font-bold uppercase text-[#71717A] border-b border-[#27272A] flex items-center justify-between">
                          <span>Snooze until:</span>
                          <Clock className="w-3 h-3 text-blue-400" />
                        </div>
                        <div className="py-1">
                          <button
                            onClick={() => {
                              const until = new Date(Date.now() + 4 * 3600 * 1000).toISOString();
                              if (onSnoozeThread) onSnoozeThread(thread.id, until, 'Later Today (4h)');
                              setActiveSnoozeMenuThreadId(null);
                            }}
                            className="w-full px-3 py-1.5 text-left hover:bg-[#18181B] text-[#D4D4D8] hover:text-white flex items-center justify-between cursor-pointer"
                          >
                            <span>Later Today</span>
                            <span className="text-[10px] font-mono-code text-[#71717A]">+4 hrs</span>
                          </button>
                          <button
                            onClick={() => {
                              const d = new Date();
                              d.setDate(d.getDate() + 1);
                              d.setHours(9, 0, 0, 0);
                              if (onSnoozeThread) onSnoozeThread(thread.id, d.toISOString(), 'Tomorrow 9:00 AM');
                              setActiveSnoozeMenuThreadId(null);
                            }}
                            className="w-full px-3 py-1.5 text-left hover:bg-[#18181B] text-[#D4D4D8] hover:text-white flex items-center justify-between cursor-pointer"
                          >
                            <span>Tomorrow Morning</span>
                            <span className="text-[10px] font-mono-code text-[#71717A]">9:00 AM</span>
                          </button>
                          <button
                            onClick={() => {
                              const d = new Date();
                              const day = d.getDay();
                              const diff = day === 6 ? 7 : (6 - day);
                              d.setDate(d.getDate() + diff);
                              d.setHours(9, 0, 0, 0);
                              if (onSnoozeThread) onSnoozeThread(thread.id, d.toISOString(), 'This Weekend (Sat 9 AM)');
                              setActiveSnoozeMenuThreadId(null);
                            }}
                            className="w-full px-3 py-1.5 text-left hover:bg-[#18181B] text-[#D4D4D8] hover:text-white flex items-center justify-between cursor-pointer"
                          >
                            <span>This Weekend</span>
                            <span className="text-[10px] font-mono-code text-[#71717A]">Sat 9 AM</span>
                          </button>
                          <button
                            onClick={() => {
                              const d = new Date();
                              const day = d.getDay();
                              const diff = day === 0 ? 1 : (8 - day);
                              d.setDate(d.getDate() + diff);
                              d.setHours(9, 0, 0, 0);
                              if (onSnoozeThread) onSnoozeThread(thread.id, d.toISOString(), 'Next Week (Mon 9 AM)');
                              setActiveSnoozeMenuThreadId(null);
                            }}
                            className="w-full px-3 py-1.5 text-left hover:bg-[#18181B] text-[#D4D4D8] hover:text-white flex items-center justify-between cursor-pointer border-t border-[#27272A] mt-1 pt-1"
                          >
                            <span>Next Week</span>
                            <span className="text-[10px] font-mono-code text-[#71717A]">Mon 9 AM</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Move to Folder Dropdown Popover */}
                    {isMoveOpen && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-0 bottom-6 z-40 w-52 bg-[#0F0F12] border border-[#27272A] rounded-lg shadow-2xl py-1.5 text-xs text-[#E4E4E7] animate-in fade-in zoom-in-95 duration-100"
                      >
                        <div className="px-3 py-1 text-[10px] font-mono-code font-bold uppercase text-[#71717A] border-b border-[#27272A]">
                          Move thread to:
                        </div>
                        <div className="py-1 max-h-48 overflow-y-auto">
                          {/* System folders */}
                          {['inbox', 'archive', 'trash', 'spam'].map((folderKey) => (
                            <button
                              key={folderKey}
                              onClick={() => {
                                onMoveThread(thread.id, folderKey);
                                setActiveMoveMenuThreadId(null);
                              }}
                              className="w-full px-3 py-1.5 text-left capitalize hover:bg-[#18181B] text-[#D4D4D8] hover:text-white flex items-center justify-between cursor-pointer"
                            >
                              <span>{folderKey}</span>
                              <ChevronRight className="w-3 h-3 text-[#71717A]" />
                            </button>
                          ))}

                          {/* Custom folders */}
                          {customFolders.length > 0 && (
                            <>
                              <div className="px-3 py-1 text-[10px] font-mono-code uppercase text-[#71717A] border-t border-[#27272A] mt-1 pt-1">
                                Custom Folders
                              </div>
                              {customFolders.map((cf) => (
                                <button
                                  key={cf.id}
                                  onClick={() => {
                                    onMoveThread(thread.id, cf.id);
                                    setActiveMoveMenuThreadId(null);
                                  }}
                                  className="w-full px-3 py-1.5 text-left hover:bg-[#18181B] text-[#D4D4D8] hover:text-white flex items-center justify-between cursor-pointer truncate"
                                >
                                  <span className="flex items-center gap-2 truncate">
                                    <Folder className="w-3 h-3 shrink-0" style={{ color: cf.color }} />
                                    <span className="truncate">{cf.name}</span>
                                  </span>
                                  <ChevronRight className="w-3 h-3 text-[#71717A] shrink-0" />
                                </button>
                              ))}
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
