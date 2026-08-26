import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FolderSidebar } from './FolderSidebar.js';
import { ThreadList } from './ThreadList.js';
import { ThreadDetail } from './ThreadDetail.js';
import { ComposerModal } from './ComposerModal.js';
import { InboundSimulatorModal } from './InboundSimulatorModal.js';
import { FolderModal } from './FolderModal.js';
import { SignaturesModal } from './SignaturesModal.js';
import { ShortcutsModal } from './ShortcutsModal.js';
import { VacationResponderModal } from './VacationResponderModal.js';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import type { Thread, MailFolder, CustomFolder } from '../../types.js';
import { MailOpen, Send } from 'lucide-react';

interface WebmailLayoutProps {
  isComposeOpen: boolean;
  onCloseCompose: () => void;
  onOpenCompose: () => void;
  isSimulateOpen: boolean;
  onCloseSimulate: () => void;
}

export const WebmailLayout: React.FC<WebmailLayoutProps> = ({
  isComposeOpen,
  onCloseCompose,
  onOpenCompose,
  isSimulateOpen,
  onCloseSimulate,
}) => {
  const { selectedMailbox, showToast } = useAuth();

  const [currentFolder, setCurrentFolder] = useState<MailFolder>('inbox');
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [activeThread, setActiveThread] = useState<Thread | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  // Custom Folders State
  const [customFolders, setCustomFolders] = useState<CustomFolder[]>([]);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<CustomFolder | null>(null);

  // Settings & Helpers Modals
  const [isSignaturesOpen, setIsSignaturesOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isVacationOpen, setIsVacationOpen] = useState(false);

  // Dynamic composer reply prefill state
  const [composerPrefill, setComposerPrefill] = useState<{
    to: string;
    subject: string;
    body: string;
  } | null>(null);

  const fetchCustomFolders = useCallback(async () => {
    try {
      const res = await api.getCustomFolders(selectedMailbox?.id);
      setCustomFolders(res.folders || []);
    } catch (err) {
      console.error('[Webmail] Failed to fetch custom folders', err);
    }
  }, [selectedMailbox?.id]);

  const fetchThreads = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.getThreads({
        mailboxId: selectedMailbox?.id,
        folder: currentFolder,
        search: searchQuery,
      });

      setThreads(res.threads || []);

      // Compute unread counts for current view
      const counts: Record<string, number> = {
        inbox: (res.threads || []).filter((t) => !t.isArchived && !t.isTrash && t.unreadCount > 0).length,
      };
      setUnreadCounts(counts);

      // Keep selection or pick first
      if (res.threads && res.threads.length > 0) {
        if (!selectedThreadId || !res.threads.some((t) => t.id === selectedThreadId)) {
          setSelectedThreadId(res.threads[0].id);
        }
      } else {
        setSelectedThreadId(null);
        setActiveThread(null);
      }
    } catch (err) {
      console.error('[Webmail] Failed to fetch threads', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedMailbox?.id, currentFolder, searchQuery, selectedThreadId]);

  useEffect(() => {
    fetchCustomFolders();
  }, [fetchCustomFolders]);

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  // Fetch full active thread messages when selectedThreadId changes
  const fetchActiveThreadDetail = useCallback(async (threadId: string) => {
    try {
      const res = await api.getThread(threadId);
      setActiveThread(res.thread);
      // Mark thread as read in list state
      setThreads((prev) =>
        prev.map((t) => (t.id === threadId ? { ...t, unreadCount: 0 } : t))
      );
    } catch (err) {
      console.error('Failed to get thread detail', err);
    }
  }, []);

  useEffect(() => {
    if (!selectedThreadId) {
      setActiveThread(null);
      return;
    }
    fetchActiveThreadDetail(selectedThreadId);
  }, [selectedThreadId, fetchActiveThreadDetail]);

  const handleToggleStar = async (threadId?: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const targetId = threadId || selectedThreadId;
    if (!targetId) return;

    const thread = threads.find((t) => t.id === targetId);
    if (!thread) return;

    const newStarred = !thread.isStarred;
    setThreads((prev) =>
      prev.map((t) => (t.id === targetId ? { ...t, isStarred: newStarred } : t))
    );
    if (activeThread?.id === targetId) {
      setActiveThread({ ...activeThread, isStarred: newStarred });
    }

    try {
      await api.updateThread(targetId, { isStarred: newStarred });
    } catch (err) {
      console.error('Failed to toggle star', err);
    }
  };

  const handleArchive = async (threadId?: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const targetId = threadId || selectedThreadId;
    if (!targetId) return;

    try {
      await api.updateThread(targetId, { isArchived: true });
      showToast('Archived thread', 'info');
      fetchThreads();
    } catch (err: any) {
      showToast(err.message || 'Failed to archive', 'error');
    }
  };

  const handleTrash = async (threadId?: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const targetId = threadId || selectedThreadId;
    if (!targetId) return;

    try {
      await api.updateThread(targetId, { isTrash: true });
      showToast('Moved thread to Trash', 'info');
      fetchThreads();
    } catch (err: any) {
      showToast(err.message || 'Failed to trash', 'error');
    }
  };

  const handleMoveThread = async (threadId: string, targetFolder: string) => {
    try {
      await api.moveThread(threadId, targetFolder);
      showToast(`Moved thread to ${targetFolder}`, 'success');
      fetchThreads();
      if (selectedThreadId === threadId) {
        fetchActiveThreadDetail(threadId);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to move thread', 'error');
    }
  };

  const handleSnoozeThread = async (threadId: string, until: string, label: string) => {
    try {
      await api.snoozeThread(threadId, until);
      showToast(`Thread snoozed until ${label}`, 'success');
      fetchThreads();
      if (selectedThreadId === threadId) {
        fetchActiveThreadDetail(threadId);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to snooze thread', 'error');
    }
  };

  const handleUnsnoozeThread = async (threadId: string) => {
    try {
      await api.unsnoozeThread(threadId);
      showToast('Thread returned to Inbox', 'success');
      fetchThreads();
      if (selectedThreadId === threadId) {
        fetchActiveThreadDetail(threadId);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to unsnooze thread', 'error');
    }
  };

  // Custom Folder Handlers
  const handleSaveCustomFolder = async (folderData: { name: string; color: string; icon: string }) => {
    if (editingFolder) {
      await api.updateCustomFolder(editingFolder.id, folderData);
      showToast(`Updated folder "${folderData.name}"`, 'success');
    } else {
      await api.createCustomFolder({
        ...folderData,
        mailboxId: selectedMailbox?.id,
      });
      showToast(`Created folder "${folderData.name}"`, 'success');
    }
    fetchCustomFolders();
  };

  const handleDeleteCustomFolder = async (folderId: string) => {
    if (!confirm('Are you sure you want to delete this custom folder? Messages in this folder will return to Inbox.')) {
      return;
    }
    try {
      await api.deleteCustomFolder(folderId);
      showToast('Folder deleted', 'info');
      if (currentFolder === folderId) {
        setCurrentFolder('inbox');
      }
      fetchCustomFolders();
      fetchThreads();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete folder', 'error');
    }
  };

  // Quick action: Trigger Reply
  const handleReplyToSelected = useCallback(() => {
    if (!activeThread) {
      showToast('Select an email thread first to reply', 'info');
      return;
    }
    const lastMsg = activeThread.messages?.[activeThread.messages.length - 1];
    const replyTo = lastMsg ? lastMsg.from.address : '';
    const subj = activeThread.subject.startsWith('Re:')
      ? activeThread.subject
      : `Re: ${activeThread.subject}`;
    const bodyQuote = lastMsg
      ? `\n\n--- On ${new Date(lastMsg.createdAt).toLocaleString()}, ${lastMsg.from.name || lastMsg.from.address} wrote:\n> ${lastMsg.bodyText.replace(/\n/g, '\n> ')}`
      : '';

    setComposerPrefill({
      to: replyTo,
      subject: subj,
      body: bodyQuote,
    });
    onOpenCompose();
  }, [activeThread, onOpenCompose, showToast]);

  // Global Keyboard Shortcut Listener
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // If user is currently typing in an input, textarea, or contentEditable element, ignore shortcuts
      const activeEl = document.activeElement;
      const isTyping =
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          (activeEl as HTMLElement).isContentEditable);

      // Handle search shortcut (Ctrl+K or ⌘+K) everywhere
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        const searchInput = document.getElementById('thread-search-input');
        if (searchInput) {
          searchInput.focus();
        }
        return;
      }

      // If user is typing, only allow Escape
      if (isTyping) {
        if (e.key === 'Escape') {
          (activeEl as HTMLElement).blur();
        }
        return;
      }

      // Ignore if compose modal or simulator modal is already open
      if (isComposeOpen || isSimulateOpen || isFolderModalOpen || isSignaturesOpen) {
        if (e.key === 'Escape') {
          if (isComposeOpen) onCloseCompose();
          if (isSimulateOpen) onCloseSimulate();
          if (isFolderModalOpen) setIsFolderModalOpen(false);
          if (isSignaturesOpen) setIsSignaturesOpen(false);
        }
        return;
      }

      // '/' to focus search
      if (e.key === '/') {
        e.preventDefault();
        const searchInput = document.getElementById('thread-search-input');
        if (searchInput) searchInput.focus();
        return;
      }

      // '?' to open shortcuts help
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setIsShortcutsOpen((prev) => !prev);
        return;
      }

      // 'c' or 'C' -> Compose
      if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        setComposerPrefill(null);
        onOpenCompose();
        return;
      }

      // 'r' or 'R' -> Reply
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        handleReplyToSelected();
        return;
      }

      // 'Delete' or 'Backspace' -> Trash
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedThreadId) {
          e.preventDefault();
          handleTrash(selectedThreadId);
        }
        return;
      }

      // 'e' or 'E' -> Archive
      if (e.key === 'e' || e.key === 'E') {
        if (selectedThreadId) {
          e.preventDefault();
          handleArchive(selectedThreadId);
        }
        return;
      }

      // 's' or 'S' -> Star
      if (e.key === 's' || e.key === 'S') {
        if (selectedThreadId) {
          e.preventDefault();
          handleToggleStar(selectedThreadId);
        }
        return;
      }

      // 'j' or 'ArrowDown' -> Select next thread
      if (e.key === 'j' || e.key === 'J' || e.key === 'ArrowDown') {
        e.preventDefault();
        if (threads.length > 0) {
          const currentIndex = threads.findIndex((t) => t.id === selectedThreadId);
          const nextIndex = currentIndex < threads.length - 1 ? currentIndex + 1 : 0;
          setSelectedThreadId(threads[nextIndex].id);
        }
        return;
      }

      // 'k' or 'ArrowUp' -> Select prev thread
      if (e.key === 'k' || e.key === 'K' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (threads.length > 0) {
          const currentIndex = threads.findIndex((t) => t.id === selectedThreadId);
          const prevIndex = currentIndex > 0 ? currentIndex - 1 : threads.length - 1;
          setSelectedThreadId(threads[prevIndex].id);
        }
        return;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [
    isComposeOpen,
    isSimulateOpen,
    isFolderModalOpen,
    isSignaturesOpen,
    selectedThreadId,
    threads,
    onOpenCompose,
    onCloseCompose,
    onCloseSimulate,
    handleReplyToSelected,
  ]);

  return (
    <div id="monogram-webmail-container" className="flex-1 flex overflow-hidden h-[calc(100vh-4rem)]">
      {/* 1. Folders Sidebar */}
      <FolderSidebar
        currentFolder={currentFolder}
        onSelectFolder={(f) => {
          setCurrentFolder(f);
          setSelectedThreadId(null);
        }}
        selectedLabel={selectedLabel}
        onSelectLabel={setSelectedLabel}
        onOpenCompose={() => {
          setComposerPrefill(null);
          onOpenCompose();
        }}
        unreadCounts={unreadCounts}
        customFolders={customFolders}
        onOpenCreateFolder={() => {
          setEditingFolder(null);
          setIsFolderModalOpen(true);
        }}
        onOpenEditFolder={(folder) => {
          setEditingFolder(folder);
          setIsFolderModalOpen(true);
        }}
        onDeleteFolder={handleDeleteCustomFolder}
        onDropThreadOnFolder={handleMoveThread}
        onOpenSignatures={() => setIsSignaturesOpen(true)}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        onOpenVacation={() => setIsVacationOpen(true)}
      />

      {/* 2. Threads List Pane with Full-text Search */}
      <ThreadList
        threads={threads}
        selectedThreadId={selectedThreadId}
        onSelectThread={setSelectedThreadId}
        currentFolder={currentFolder}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onToggleStar={handleToggleStar}
        onArchiveThread={handleArchive}
        onTrashThread={handleTrash}
        onMoveThread={handleMoveThread}
        onSnoozeThread={handleSnoozeThread}
        onUnsnoozeThread={handleUnsnoozeThread}
        customFolders={customFolders}
        onRefresh={fetchThreads}
        isLoading={isLoading}
      />

      {/* 3. Thread Detail / Reading Pane */}
      {activeThread ? (
        <ThreadDetail
          thread={activeThread}
          onArchive={() => handleArchive(activeThread.id)}
          onTrash={() => handleTrash(activeThread.id)}
          onToggleStar={() => handleToggleStar(activeThread.id)}
          onReportSpam={() => {
            fetchThreads();
            setSelectedThreadId(null);
          }}
          onMoveThread={(target) => handleMoveThread(activeThread.id, target)}
          customFolders={customFolders}
          onReplySuccess={fetchThreads}
          onRefreshThread={() => fetchActiveThreadDetail(activeThread.id)}
        />
      ) : (
        <div className="flex-1 bg-[#0A0A0B] flex flex-col items-center justify-center p-8 text-[#71717A] space-y-4">
          <div className="w-16 h-16 rounded-md bg-[#0F0F12] border border-[#27272A] flex items-center justify-center text-[#71717A] shadow-inner">
            <MailOpen className="w-8 h-8" />
          </div>
          <div className="text-center space-y-1 max-w-sm">
            <h3 className="text-base font-semibold text-[#E4E4E7]">
              No Message Selected
            </h3>
            <p className="text-xs text-[#71717A] leading-relaxed">
              Select an email thread from the inbox, or press <kbd className="px-1.5 py-0.5 rounded bg-[#18181B] border border-[#27272A] text-white font-mono-code">C</kbd> to compose a new encrypted message.
            </p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => {
                setComposerPrefill(null);
                onOpenCompose();
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold bg-white hover:bg-[#E4E4E7] text-black shadow-sm transition-all cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Compose Message (C)</span>
            </button>
          </div>
        </div>
      )}

      {/* Custom Folder Create/Edit Modal */}
      <FolderModal
        isOpen={isFolderModalOpen}
        onClose={() => {
          setIsFolderModalOpen(false);
          setEditingFolder(null);
        }}
        onSave={handleSaveCustomFolder}
        editingFolder={editingFolder}
      />

      {/* Email Signatures Management Modal */}
      <SignaturesModal
        isOpen={isSignaturesOpen}
        onClose={() => setIsSignaturesOpen(false)}
      />

      {/* Keyboard Shortcuts Cheat Sheet */}
      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      {/* Vacation Auto-Responder Modal */}
      <VacationResponderModal
        isOpen={isVacationOpen}
        onClose={() => setIsVacationOpen(false)}
      />

      {/* Floating Composer Modal */}
      <ComposerModal
        isOpen={isComposeOpen}
        onClose={() => {
          onCloseCompose();
          setComposerPrefill(null);
        }}
        onSent={fetchThreads}
        initialTo={composerPrefill?.to}
        initialSubject={composerPrefill?.subject}
        initialBody={composerPrefill?.body}
      />

      {/* Inbound Simulator Modal */}
      <InboundSimulatorModal
        isOpen={isSimulateOpen}
        onClose={onCloseSimulate}
        onSimulated={fetchThreads}
      />
    </div>
  );
};
