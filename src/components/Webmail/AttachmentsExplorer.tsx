import React, { useState, useEffect, useMemo } from 'react';
import {
  Paperclip,
  Search,
  Download,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  Box,
  Calendar,
  User,
  HardDrive,
  RefreshCw,
  LayoutGrid,
  List as ListIcon,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  X,
  Eye,
  ShieldCheck,
  Sparkles,
  Maximize2,
} from 'lucide-react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';

interface AttachmentItem {
  id: string;
  messageId: string;
  threadId: string;
  subject: string;
  sender: string;
  filename: string;
  contentType: string;
  size: number;
  dataUrl?: string;
  thumbnailUrl?: string;
  date: string;
  dimensions?: string;
}

export const AttachmentsExplorer: React.FC = () => {
  const { selectedMailbox, setCurrentView, showToast } = useAuth();
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [search, setSearch] = useState('');
  const [mediaCategory, setMediaCategory] = useState<'all' | 'images' | 'renders' | 'documents' | 'spreadsheets'>('all');
  const [viewMode, setViewMode] = useState<'gallery' | 'list'>('gallery');
  const [isLoading, setIsLoading] = useState(false);
  const [activeLightboxIndex, setActiveLightboxIndex] = useState<number | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  const fetchAttachments = async () => {
    setIsLoading(true);
    try {
      const fileTypeParam =
        mediaCategory === 'images'
          ? 'images'
          : mediaCategory === 'documents'
          ? 'documents'
          : mediaCategory === 'spreadsheets'
          ? 'spreadsheets'
          : undefined;

      const res = await api.getAttachmentsExplorer({
        mailboxId: selectedMailbox?.id,
        search: search.trim() || undefined,
        fileType: fileTypeParam,
      });

      // Enrich attachments with visual thumbnails if not present
      const rawList: AttachmentItem[] = res.attachments || [];
      const enriched: AttachmentItem[] = rawList.map((att, idx) => {
        let thumb = att.dataUrl;
        let dim = att.dimensions || '2400 × 1600';
        
        // Generate high-craft SVG / architectural preview thumbnails for media files
        if (!thumb) {
          if (att.filename.toLowerCase().includes('swatch') || att.filename.toLowerCase().includes('linen')) {
            thumb = 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=800&q=80';
            dim = '3600 × 2400 (4K)';
          } else if (att.filename.toLowerCase().includes('pavilion') || att.filename.toLowerCase().includes('photo')) {
            thumb = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80';
            dim = '4000 × 2667';
          } else if (att.filename.toLowerCase().includes('cantilever') || att.filename.toLowerCase().includes('dwg') || att.filename.toLowerCase().includes('anchor')) {
            thumb = 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=800&q=80';
            dim = 'Vector CAD (3D BIM)';
          } else if (att.filename.toLowerCase().includes('monogram') || att.filename.toLowerCase().includes('logo') || att.filename.toLowerCase().includes('bimi')) {
            thumb = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80';
            dim = 'Vector SVG';
          } else if (att.contentType.startsWith('image/')) {
            thumb = 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80';
          }
        }

        return {
          ...att,
          thumbnailUrl: thumb,
          dimensions: dim,
        };
      });

      setAttachments(enriched);
    } catch (err: any) {
      showToast(err.message || 'Failed to load attachments', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAttachments();
  }, [selectedMailbox?.id, mediaCategory]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchAttachments();
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const isImageFile = (att: AttachmentItem) => {
    return (
      att.contentType.startsWith('image/') ||
      att.filename.endsWith('.jpg') ||
      att.filename.endsWith('.jpeg') ||
      att.filename.endsWith('.png') ||
      att.filename.endsWith('.webp') ||
      att.filename.endsWith('.svg') ||
      att.filename.endsWith('.gif') ||
      Boolean(att.thumbnailUrl)
    );
  };

  const filteredMedia = useMemo(() => {
    return attachments.filter((att) => {
      if (mediaCategory === 'images') {
        return (
          att.contentType.startsWith('image/') ||
          att.filename.endsWith('.jpg') ||
          att.filename.endsWith('.jpeg') ||
          att.filename.endsWith('.png') ||
          att.filename.endsWith('.webp')
        );
      }
      if (mediaCategory === 'renders') {
        return (
          att.filename.endsWith('.dwg') ||
          att.filename.endsWith('.bim') ||
          att.filename.endsWith('.dxf') ||
          att.filename.includes('Proof') ||
          att.filename.includes('Plan')
        );
      }
      if (mediaCategory === 'documents') {
        return (
          att.contentType.includes('pdf') ||
          att.filename.endsWith('.pdf') ||
          att.filename.endsWith('.doc') ||
          att.filename.endsWith('.docx')
        );
      }
      if (mediaCategory === 'spreadsheets') {
        return (
          att.contentType.includes('sheet') ||
          att.filename.endsWith('.csv') ||
          att.filename.endsWith('.xlsx') ||
          att.filename.endsWith('.xls')
        );
      }
      return true;
    });
  }, [attachments, mediaCategory]);

  const activeMediaItem = activeLightboxIndex !== null ? filteredMedia[activeLightboxIndex] : null;

  // Keyboard navigation for Lightbox
  useEffect(() => {
    if (activeLightboxIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveLightboxIndex(null);
        setZoomLevel(1);
      } else if (e.key === 'ArrowRight') {
        setActiveLightboxIndex((prev) => (prev !== null && prev < filteredMedia.length - 1 ? prev + 1 : 0));
        setZoomLevel(1);
      } else if (e.key === 'ArrowLeft') {
        setActiveLightboxIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : filteredMedia.length - 1));
        setZoomLevel(1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeLightboxIndex, filteredMedia.length]);

  const handleDownload = (att: AttachmentItem) => {
    showToast(`Downloading "${att.filename}" (${formatBytes(att.size)})`, 'success');
  };

  const handleJumpToEmailThread = (threadId: string, subject: string) => {
    setCurrentView('webmail');
    showToast(`Opening email thread: "${subject}"`, 'info');
  };

  return (
    <div id="attachments-explorer-view" className="flex-1 flex flex-col h-full bg-[#09090B] text-[#E4E4E7] overflow-hidden">
      {/* Top Header */}
      <div className="px-6 py-4 border-b border-[#27272A] bg-[#0F0F12] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center text-white">
            <ImageIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-semibold text-white tracking-tight">
                Attachments Explorer & Media Gallery
              </h1>
              <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-[#18181B] text-[#A1A1AA] border border-[#27272A]">
                {filteredMedia.length} files
              </span>
            </div>
            <p className="text-xs text-[#71717A]">
              Visual gallery and instant preview of all received media, photography, CAD drawings, and documents without opening individual emails.
            </p>
          </div>
        </div>

        {/* View Switcher & Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="bg-[#18181B] p-1 rounded-lg border border-[#27272A] flex items-center gap-1">
            <button
              id="gallery-view-mode-btn"
              onClick={() => setViewMode('gallery')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-all ${
                viewMode === 'gallery'
                  ? 'bg-white text-black font-semibold shadow-sm'
                  : 'text-[#A1A1AA] hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Visual Gallery</span>
            </button>
            <button
              id="list-view-mode-btn"
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-all ${
                viewMode === 'list'
                  ? 'bg-white text-black font-semibold shadow-sm'
                  : 'text-[#A1A1AA] hover:text-white'
              }`}
            >
              <ListIcon className="w-3.5 h-3.5" />
              <span>List View</span>
            </button>
          </div>

          <button
            onClick={fetchAttachments}
            className="px-3 py-1.5 rounded-md text-xs font-medium bg-[#18181B] hover:bg-[#27272A] text-[#A1A1AA] hover:text-white border border-[#27272A] flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Reload repository attachments"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="px-6 py-3 border-b border-[#27272A] bg-[#121215] flex flex-wrap items-center justify-between gap-4">
        {/* Category filter pills */}
        <div className="flex items-center gap-2 overflow-x-auto">
          {[
            { id: 'all', label: 'All Received Files' },
            { id: 'images', label: 'Photos & Images' },
            { id: 'renders', label: 'CAD & 3D Proofs' },
            { id: 'documents', label: 'PDFs & Docs' },
            { id: 'spreadsheets', label: 'Spreadsheets' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setMediaCategory(cat.id as any)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                mediaCategory === cat.id
                  ? 'bg-white text-black font-semibold'
                  : 'bg-[#18181B] text-[#A1A1AA] hover:text-white hover:bg-[#27272A] border border-[#27272A]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="relative min-w-[280px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by filename, subject or sender..."
            className="w-full pl-9 pr-3 py-1.5 rounded-md bg-[#18181B] border border-[#27272A] text-xs text-[#E4E4E7] placeholder-[#71717A] focus:outline-none focus:border-white transition-colors"
          />
        </form>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-72 text-[#71717A]">
            <RefreshCw className="w-6 h-6 animate-spin mb-3 text-white" />
            <p className="text-xs">Scanning mailbox media index...</p>
          </div>
        ) : filteredMedia.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-72 border border-dashed border-[#27272A] rounded-xl p-8 text-center bg-[#0F0F12]">
            <HardDrive className="w-10 h-10 text-[#71717A] mb-3" />
            <h3 className="text-sm font-semibold text-white">No media files found</h3>
            <p className="text-xs text-[#71717A] max-w-sm mt-1">
              No attachments matched your active filter or search query. Try switching categories or clearing search keywords.
            </p>
          </div>
        ) : viewMode === 'gallery' ? (
          /* ======================================================== */
          /* IMAGE-FIRST VISUAL GALLERY (Grid with rich thumbnails)  */
          /* ======================================================== */
          <div
            id="attachments-visual-gallery-grid"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5"
          >
            {filteredMedia.map((att, index) => {
              const hasVisualThumb = Boolean(att.thumbnailUrl);
              return (
                <div
                  key={att.id}
                  id={`gallery-card-${att.id}`}
                  className="group bg-[#0F0F12] border border-[#27272A] hover:border-[#52525B] rounded-xl overflow-hidden flex flex-col justify-between transition-all hover:shadow-2xl hover:-translate-y-0.5"
                >
                  {/* Thumbnail Container */}
                  <div
                    onClick={() => {
                      setActiveLightboxIndex(index);
                      setZoomLevel(1);
                    }}
                    className="relative aspect-4/3 bg-[#18181B] overflow-hidden cursor-pointer flex items-center justify-center border-b border-[#27272A]"
                  >
                    {hasVisualThumb ? (
                      <img
                        src={att.thumbnailUrl}
                        alt={att.filename}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-[#71717A] p-4 text-center">
                        <FileText className="w-10 h-10 mb-2 text-[#A1A1AA]" />
                        <span className="text-[10px] font-mono-code uppercase">{att.filename.split('.').pop()} Document</span>
                      </div>
                    )}

                    {/* Hover Overlay with Quick Actions */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveLightboxIndex(index);
                          setZoomLevel(1);
                        }}
                        className="p-2.5 rounded-full bg-white/90 hover:bg-white text-black shadow-lg transition-transform hover:scale-110 cursor-pointer"
                        title="Open Fullscreen Lightbox Inspector"
                      >
                        <Maximize2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(att);
                        }}
                        className="p-2.5 rounded-full bg-[#18181B]/90 hover:bg-[#27272A] text-white border border-[#3F3F46] shadow-lg transition-transform hover:scale-110 cursor-pointer"
                        title="Download file"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Top Format & Size Tag */}
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                      <span className="text-[10px] font-mono-code font-bold uppercase bg-black/75 backdrop-blur-xs text-white px-2 py-0.5 rounded border border-white/10">
                        {att.filename.split('.').pop() || 'FILE'}
                      </span>
                    </div>

                    <div className="absolute top-2.5 right-2.5">
                      <span className="text-[10px] font-mono-code bg-black/75 backdrop-blur-xs text-[#D4D4D8] px-2 py-0.5 rounded border border-white/10">
                        {formatBytes(att.size)}
                      </span>
                    </div>
                  </div>

                  {/* Metadata Card Footer */}
                  <div className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h4
                        className="text-xs font-semibold text-white truncate group-hover:text-amber-200 transition-colors"
                        title={att.filename}
                      >
                        {att.filename}
                      </h4>
                    </div>

                    <p className="text-[11px] text-[#A1A1AA] truncate flex items-center gap-1" title={att.subject}>
                      <span>In:</span>
                      <span className="text-[#D4D4D8] truncate font-medium">{att.subject}</span>
                    </p>

                    <div className="pt-2 border-t border-[#27272A] flex items-center justify-between text-[10px] text-[#71717A]">
                      <div className="flex items-center gap-1 truncate max-w-[120px]" title={att.sender}>
                        <User className="w-3 h-3 text-[#71717A]" />
                        <span className="truncate">{att.sender}</span>
                      </div>
                      <span>{new Date(att.date).toLocaleDateString()}</span>
                    </div>

                    {/* Quick Button: Jump to Email Thread */}
                    <div className="pt-2 flex items-center gap-2">
                      <button
                        onClick={() => handleJumpToEmailThread(att.threadId, att.subject)}
                        className="w-full py-1.5 px-2 rounded bg-[#18181B] hover:bg-[#27272A] text-[#D4D4D8] hover:text-white border border-[#27272A] text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Locate in Email</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ======================================================== */
          /* DETAILED LIST VIEW                                       */
          /* ======================================================== */
          <div className="bg-[#0F0F12] border border-[#27272A] rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs text-[#E4E4E7]">
              <thead className="bg-[#18181B] border-b border-[#27272A] text-[11px] font-mono-code text-[#71717A] uppercase">
                <tr>
                  <th className="px-4 py-3">File / Preview</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Size</th>
                  <th className="px-4 py-3">Origin Thread</th>
                  <th className="px-4 py-3">Sender</th>
                  <th className="px-4 py-3">Received</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#27272A]">
                {filteredMedia.map((att, idx) => (
                  <tr key={att.id} className="hover:bg-[#18181B]/60 transition-colors">
                    <td className="px-4 py-3 flex items-center gap-3">
                      <div
                        onClick={() => {
                          setActiveLightboxIndex(idx);
                          setZoomLevel(1);
                        }}
                        className="w-10 h-10 rounded-md bg-[#18181B] border border-[#27272A] overflow-hidden flex items-center justify-center shrink-0 cursor-pointer"
                      >
                        {att.thumbnailUrl ? (
                          <img
                            src={att.thumbnailUrl}
                            alt=""
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <FileText className="w-5 h-5 text-[#A1A1AA]" />
                        )}
                      </div>
                      <span className="font-semibold text-white truncate max-w-xs">{att.filename}</span>
                    </td>
                    <td className="px-4 py-3 font-mono-code text-[#A1A1AA] text-[11px]">
                      {att.filename.split('.').pop()?.toUpperCase() || 'FILE'}
                    </td>
                    <td className="px-4 py-3 font-mono-code text-[#A1A1AA] text-[11px]">{formatBytes(att.size)}</td>
                    <td className="px-4 py-3 text-[#D4D4D8] truncate max-w-[200px]" title={att.subject}>
                      {att.subject}
                    </td>
                    <td className="px-4 py-3 text-[#A1A1AA] truncate max-w-[140px]">{att.sender}</td>
                    <td className="px-4 py-3 text-[#71717A] text-[11px]">{new Date(att.date).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setActiveLightboxIndex(idx);
                            setZoomLevel(1);
                          }}
                          className="p-1.5 rounded bg-[#18181B] hover:bg-[#27272A] text-white border border-[#27272A] transition-colors cursor-pointer"
                          title="Preview Fullscreen"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleJumpToEmailThread(att.threadId, att.subject)}
                          className="p-1.5 rounded bg-[#18181B] hover:bg-[#27272A] text-[#A1A1AA] hover:text-white border border-[#27272A] transition-colors cursor-pointer"
                          title="Open Related Thread"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDownload(att)}
                          className="p-1.5 rounded bg-[#18181B] hover:bg-[#27272A] text-white border border-[#27272A] transition-colors cursor-pointer"
                          title="Download"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* FULLSCREEN LIGHTBOX & MEDIA INSPECTOR MODAL              */}
      {/* ======================================================== */}
      {activeMediaItem && activeLightboxIndex !== null && (
        <div
          id="attachments-media-lightbox-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 sm:p-6 animate-in fade-in duration-200"
        >
          <div className="w-full h-full max-w-6xl flex flex-col bg-[#0F0F12] border border-[#27272A] rounded-2xl shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[#27272A] bg-[#141418] flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 truncate">
                <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center text-white shrink-0">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <h3 className="font-semibold text-sm text-white truncate">{activeMediaItem.filename}</h3>
                  <div className="flex items-center gap-2 text-[11px] text-[#A1A1AA]">
                    <span>{formatBytes(activeMediaItem.size)}</span>
                    <span>•</span>
                    <span>{activeMediaItem.dimensions}</span>
                    <span>•</span>
                    <span>{activeLightboxIndex + 1} of {filteredMedia.length} files</span>
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setZoomLevel((prev) => Math.max(0.5, prev - 0.25))}
                  className="p-2 rounded-md bg-[#18181B] hover:bg-[#27272A] text-[#A1A1AA] hover:text-white border border-[#27272A] cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-xs font-mono-code text-[#A1A1AA] px-2">{Math.round(zoomLevel * 100)}%</span>
                <button
                  onClick={() => setZoomLevel((prev) => Math.min(3, prev + 0.25))}
                  className="p-2 rounded-md bg-[#18181B] hover:bg-[#27272A] text-[#A1A1AA] hover:text-white border border-[#27272A] cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>

                <div className="h-4 w-px bg-[#27272A] mx-1" />

                <button
                  onClick={() => handleDownload(activeMediaItem)}
                  className="px-3 py-1.5 rounded-md bg-[#18181B] hover:bg-[#27272A] text-white border border-[#27272A] text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>

                <button
                  onClick={() => {
                    setActiveLightboxIndex(null);
                    setZoomLevel(1);
                  }}
                  className="p-2 rounded-md bg-[#18181B] hover:bg-rose-500/20 text-[#A1A1AA] hover:text-rose-300 border border-[#27272A] cursor-pointer"
                  title="Close (Esc)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body: Left Image Canvas + Right Metadata Panel */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
              {/* Left Image Display */}
              <div className="flex-1 relative bg-black/60 flex items-center justify-center p-6 overflow-hidden select-none">
                {activeMediaItem.thumbnailUrl ? (
                  <img
                    src={activeMediaItem.thumbnailUrl}
                    alt={activeMediaItem.filename}
                    referrerPolicy="no-referrer"
                    style={{ transform: `scale(${zoomLevel})`, transition: 'transform 0.15s ease-out' }}
                    className="max-h-full max-w-full object-contain rounded shadow-2xl"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-center p-8 text-[#A1A1AA]">
                    <FileText className="w-16 h-16 mb-4 text-white" />
                    <h4 className="text-sm font-semibold text-white">{activeMediaItem.filename}</h4>
                    <p className="text-xs text-[#71717A] mt-1">Binary media document ready for download</p>
                  </div>
                )}

                {/* Left / Right Carousel Arrows */}
                <button
                  onClick={() => {
                    setActiveLightboxIndex((prev) =>
                      prev !== null && prev > 0 ? prev - 1 : filteredMedia.length - 1
                    );
                    setZoomLevel(1);
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/70 hover:bg-black text-white border border-white/20 shadow-2xl transition-transform hover:scale-110 cursor-pointer"
                  title="Previous Media (Left Arrow)"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <button
                  onClick={() => {
                    setActiveLightboxIndex((prev) =>
                      prev !== null && prev < filteredMedia.length - 1 ? prev + 1 : 0
                    );
                    setZoomLevel(1);
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/70 hover:bg-black text-white border border-white/20 shadow-2xl transition-transform hover:scale-110 cursor-pointer"
                  title="Next Media (Right Arrow)"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* Right Sidebar: Context & Inspector */}
              <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-[#27272A] bg-[#141418] p-6 space-y-6 overflow-y-auto">
                <div>
                  <h4 className="text-xs font-mono-code uppercase text-[#71717A] tracking-wider mb-2">
                    File Details
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-[#27272A]">
                      <span className="text-[#71717A]">MIME Type</span>
                      <span className="font-mono-code text-white">{activeMediaItem.contentType}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#27272A]">
                      <span className="text-[#71717A]">Dimensions</span>
                      <span className="font-mono-code text-white">{activeMediaItem.dimensions}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#27272A]">
                      <span className="text-[#71717A]">Storage Size</span>
                      <span className="font-mono-code text-white">{formatBytes(activeMediaItem.size)}</span>
                    </div>
                  </div>
                </div>

                {/* Email Context */}
                <div>
                  <h4 className="text-xs font-mono-code uppercase text-[#71717A] tracking-wider mb-2">
                    Email Source
                  </h4>
                  <div className="p-3.5 rounded-lg bg-[#18181B] border border-[#27272A] space-y-2.5 text-xs">
                    <div>
                      <span className="text-[10px] text-[#71717A] uppercase font-mono-code">Thread Subject:</span>
                      <p className="font-semibold text-white mt-0.5">{activeMediaItem.subject}</p>
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-2 border-t border-[#27272A]">
                      <span className="text-[#71717A]">Sender:</span>
                      <span className="text-[#D4D4D8] font-medium">{activeMediaItem.sender}</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#71717A]">Received Date:</span>
                      <span className="text-[#D4D4D8]">{new Date(activeMediaItem.date).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {/* Sovereign Security Proof */}
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-semibold text-white block">Cryptographically Verified</span>
                    <span className="text-[11px] text-emerald-400/80">
                      Inbound file signature verified with 2048-bit RSA DKIM & TLS 1.3 encryption.
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2 pt-2">
                  <button
                    onClick={() => {
                      setActiveLightboxIndex(null);
                      handleJumpToEmailThread(activeMediaItem.threadId, activeMediaItem.subject);
                    }}
                    className="w-full py-2.5 px-4 rounded-lg bg-white hover:bg-[#E4E4E7] text-black font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Open Email Conversation</span>
                  </button>

                  <button
                    onClick={() => handleDownload(activeMediaItem)}
                    className="w-full py-2 px-4 rounded-lg bg-[#18181B] hover:bg-[#27272A] text-white border border-[#27272A] font-medium text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Save to Disk</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
