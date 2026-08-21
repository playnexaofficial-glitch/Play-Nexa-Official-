'use client';

// ── Play Nexa Video Library ──────────────────────────────────
// AMOLED dark theme: base #0A0A0A, surface #141414, accent #7C3AED
// No backdrop-blur · Tailwind only · Max transition 200ms · 44px touch targets
// content-visibility: auto on scrollable lists · pn_ prefix localStorage

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  Search,
  MoreVertical,
  Play,
  Grid3X3,
  List,
  FolderOpen,
  Clock,
  Download,
  X,
  Loader2,
  Film,
  Trash2,
  Share2,
  Info,
  RotateCcw,
  RefreshCw,
  Plus,
  Pencil,
  ListPlus,
  PlayCircle,
} from 'lucide-react';
import type { VideoFile } from '@/lib/mediaUtils';
import {
  formatDuration,
  formatFileSize,
  generateVideoThumbnail,
  lsGet,
  lsSet,
} from '@/lib/mediaUtils';
import { useMediaLibrary } from '@/hooks/useMediaLibrary';
import type { VideoViewMode } from '@/hooks/useMediaLibrary';
import FileImportPreviewModal from '@/components/local/FileImportPreviewModal';

// ══════════════════════════════════════════════════════════════
// PROPS
// ══════════════════════════════════════════════════════════════

interface VideoLibraryProps {
  onVideoSelect: (video: VideoFile) => void;
  onBack: () => void;
}

// ══════════════════════════════════════════════════════════════
// TAB DEFINITIONS
// ══════════════════════════════════════════════════════════════

type TabKey = 'all' | 'folders' | 'recent' | 'downloads';

interface TabDef {
  key: TabKey;
  label: string;
  icon: React.ReactNode;
}

const TABS: TabDef[] = [
  { key: 'all', label: 'All Videos', icon: <Film size={14} /> },
  { key: 'folders', label: 'Folders', icon: <FolderOpen size={14} /> },
  { key: 'recent', label: 'Recent', icon: <Clock size={14} /> },
  { key: 'downloads', label: 'Downloads', icon: <Download size={14} /> },
];

// ══════════════════════════════════════════════════════════════
// BOTTOM SHEET OPTION
// ══════════════════════════════════════════════════════════════

interface SheetOption {
  icon: React.ReactNode;
  label: string;
  action: () => void;
  danger?: boolean;
}

// ══════════════════════════════════════════════════════════════
// FOLDER TYPE
// ══════════════════════════════════════════════════════════════

interface VideoFolder {
  name: string;
  path: string;
  count: number;
}

// ══════════════════════════════════════════════════════════════
// HISTORY ENTRY
// ══════════════════════════════════════════════════════════════

interface HistoryEntry {
  id: string;
  name: string;
  position: number;
  timestamp: number;
}

// ══════════════════════════════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════════════════════════════

export default function VideoLibrary({ onVideoSelect, onBack }: VideoLibraryProps) {
  const { videos, scanning, videoView, scanVideoFiles, setVideoView, saveVideoPosition, getVideoPosition, isNative, pickVideoFiles, pickVideoFolder, pendingImport, confirmImport, cancelImport } = useMediaLibrary();

  // ── State ──
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVideo, setSelectedVideo] = useState<VideoFile | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // ── Thumbnail cache ──
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const thumbnailQueueRef = useRef<Set<string>>(new Set());
  const isGeneratingRef = useRef(false);

  // ── Video history for recent tab (derived from localStorage + videos) ──
  const historyEntries = useMemo((): HistoryEntry[] => {
    try {
      const raw = localStorage.getItem('pn_video_history');
      if (!raw) return [];
      const parsed = JSON.parse(raw) as Record<string, { position: number; updatedAt: number }>;
      return Object.entries(parsed)
        .map(([id, data]) => {
          const video = videos.find((v) => v.id === id);
          return {
            id,
            name: video?.name || id,
            position: data.position,
            timestamp: data.updatedAt,
          };
        })
        .sort((a, b) => b.timestamp - a.timestamp);
    } catch {
      return [];
    }
  }, [videos]);

  // ── Scan on mount ──
  useEffect(() => {
    scanVideoFiles();
  }, [scanVideoFiles]);

  // ── Focus search input when opened ──
  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [searchOpen]);

  // ── Thumbnail generation queue ──
  const processThumbnailQueue = useCallback(async () => {
    if (isGeneratingRef.current) return;
    isGeneratingRef.current = true;

    while (thumbnailQueueRef.current.size > 0) {
      const videoId = thumbnailQueueRef.current.values().next().value;
      if (!videoId) break;
      thumbnailQueueRef.current.delete(videoId);

      const video = videos.find((v) => v.id === videoId);
      if (!video || thumbnails[videoId]) continue;

      try {
        const thumb = await generateVideoThumbnail(video.url || video.path);
        setThumbnails((prev) => ({ ...prev, [videoId]: thumb }));
      } catch {
        // Thumbnail generation failed — use placeholder
        setThumbnails((prev) => ({ ...prev, [videoId]: '' }));
      }
    }

    isGeneratingRef.current = false;
  }, [videos, thumbnails]);

  const enqueueThumbnail = useCallback(
    (videoId: string) => {
      if (thumbnails[videoId] !== undefined) return;
      thumbnailQueueRef.current.add(videoId);
      processThumbnailQueue();
    },
    [thumbnails, processThumbnailQueue]
  );

  // ── Filtered videos ──
  const filteredVideos = useMemo(() => {
    let list = videos;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (v) =>
          v.name.toLowerCase().includes(q) ||
          v.format.toLowerCase().includes(q)
      );
    }

    // Tab-specific filtering
    if (activeTab === 'recent') {
      // Show videos that have history entries
      const historyIds = new Set(historyEntries.map((h) => h.id));
      list = list.filter((v) => historyIds.has(v.id));
      // Sort by most recent
      list.sort((a, b) => {
        const aTime = historyEntries.find((h) => h.id === a.id)?.timestamp || 0;
        const bTime = historyEntries.find((h) => h.id === b.id)?.timestamp || 0;
        return bTime - aTime;
      });
    }

    return list;
  }, [videos, searchQuery, activeTab, historyEntries]);

  // ── Folders ──
  const folders = useMemo(() => {
    const folderMap = new Map<string, VideoFolder>();
    for (const v of videos) {
      const parts = v.path.split('/');
      const folderName = parts.length > 1 ? parts[parts.length - 2] : 'Root';
      const folderPath = parts.slice(0, -1).join('/');
      const existing = folderMap.get(folderPath);
      if (existing) {
        existing.count++;
      } else {
        folderMap.set(folderPath, { name: folderName, path: folderPath, count: 1 });
      }
    }
    return Array.from(folderMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [videos]);

  // ── Video select handler ──
  const handleVideoSelect = useCallback(
    (video: VideoFile) => {
      onVideoSelect(video);
    },
    [onVideoSelect]
  );

  // ── Video options sheet ──
  const openSheet = useCallback((video: VideoFile, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedVideo(video);
    setSheetOpen(true);
  }, []);

  const closeSheet = useCallback(() => {
    setSheetOpen(false);
    setSelectedVideo(null);
  }, []);

  // ── Sheet options ──
  const sheetOptions: SheetOption[] = useMemo(() => {
    if (!selectedVideo) return [];
    return [
      {
        icon: <Play size={18} />,
        label: 'Play',
        action: () => {
          handleVideoSelect(selectedVideo);
          closeSheet();
        },
      },
      {
        icon: <PlayCircle size={18} />,
        label: 'Play Next',
        action: closeSheet,
      },
      {
        icon: <ListPlus size={18} />,
        label: 'Add to Queue',
        action: closeSheet,
      },
      {
        icon: <Pencil size={18} />,
        label: 'Rename',
        action: closeSheet,
      },
      {
        icon: <Info size={18} />,
        label: 'Info',
        action: closeSheet,
      },
      {
        icon: <Share2 size={18} />,
        label: 'Share',
        action: closeSheet,
      },
      {
        icon: <Trash2 size={18} />,
        label: 'Delete',
        action: closeSheet,
        danger: true,
      },
    ];
  }, [selectedVideo, handleVideoSelect, closeSheet]);

  // ── Get resolution string ──
  const getResolution = (video: VideoFile): string => {
    if (video.width && video.height) {
      if (video.width >= 3840) return '4K';
      if (video.width >= 1920) return '1080p';
      if (video.width >= 1280) return '720p';
      if (video.width >= 854) return '480p';
      return `${video.width}×${video.height}`;
    }
    return '';
  };

  // ── Get resume position for a video ──
  const getResumeInfo = useCallback(
    (videoId: string): HistoryEntry | undefined => {
      return historyEntries.find((h) => h.id === videoId);
    },
    [historyEntries]
  );

  // ══════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: '#0A0A0A' }}>
      {/* ════════════════════════════════════════════════════════ */}
      {/* HEADER */}
      {/* ════════════════════════════════════════════════════════ */}
      <header
        className="flex items-center justify-between px-2 shrink-0"
        style={{ height: 56, backgroundColor: '#0A0A0A' }}
      >
        {/* Left: back */}
        <button
          onClick={onBack}
          className="flex items-center justify-center rounded-full hover:bg-white/10 active:scale-90"
          style={{ width: 44, height: 44, minWidth: 44, minHeight: 44, transition: 'transform 100ms' }}
          aria-label="Go back"
        >
          <ArrowLeft size={22} className="text-white" />
        </button>

        {/* Center: title */}
        <h1 className="text-white font-bold text-lg select-none">Video Player</h1>

        {/* Right: search, grid/list, menu */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setSearchOpen((v) => !v)}
            className="flex items-center justify-center rounded-full hover:bg-white/10 active:scale-90"
            style={{ width: 44, height: 44, minWidth: 44, minHeight: 44, transition: 'transform 100ms' }}
            aria-label="Search"
          >
            <Search size={20} className="text-white" />
          </button>

          <button
            onClick={() => setVideoView(videoView === 'grid' ? 'list' : 'grid')}
            className="flex items-center justify-center rounded-full hover:bg-white/10 active:scale-90"
            style={{ width: 44, height: 44, minWidth: 44, minHeight: 44, transition: 'transform 100ms' }}
            aria-label={videoView === 'grid' ? 'List view' : 'Grid view'}
          >
            {videoView === 'grid' ? (
              <List size={20} className="text-white" />
            ) : (
              <Grid3X3 size={20} className="text-white" />
            )}
          </button>

          <button
            onClick={() => scanVideoFiles(true)}
            className="flex items-center justify-center rounded-full hover:bg-white/10 active:scale-90"
            style={{ width: 44, height: 44, minWidth: 44, minHeight: 44, transition: 'transform 100ms' }}
            aria-label="Refresh"
          >
            <RefreshCw
              size={20}
              className="text-white"
              style={{
                animation: scanning ? 'spin 1s linear infinite' : undefined,
              }}
            />
          </button>
        </div>
      </header>

      {/* ════════════════════════════════════════════════════════ */}
      {/* SEARCH BAR */}
      {/* ════════════════════════════════════════════════════════ */}
      {searchOpen && (
        <div
          className="flex items-center gap-2 px-4 py-2 shrink-0"
          style={{ backgroundColor: '#0A0A0A' }}
        >
          <div
            className="flex items-center gap-2 flex-1 rounded-xl px-3"
            style={{ backgroundColor: '#141414', height: 44, border: '1px solid #1F1F1F' }}
          >
            <Search size={16} className="text-[#9CA3AF] shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search videos..."
              className="bg-transparent text-white text-sm outline-none flex-1 placeholder-[#9CA3AF]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="flex items-center justify-center"
                style={{ width: 28, height: 28 }}
                aria-label="Clear search"
              >
                <X size={14} className="text-[#9CA3AF]" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* TAB ROW */}
      {/* ════════════════════════════════════════════════════════ */}
      <div
        className="flex items-center gap-2 px-4 py-2 overflow-x-auto shrink-0"
        style={{ backgroundColor: '#0A0A0A', scrollbarWidth: 'none' }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap"
            style={{
              minHeight: 44,
              backgroundColor: activeTab === tab.key ? '#7C3AED' : 'transparent',
              color: activeTab === tab.key ? '#FFFFFF' : '#9CA3AF',
              border: activeTab === tab.key ? 'none' : '1px solid #252525',
              transition: 'background 150ms, color 150ms, border-color 150ms',
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════ */}
      {/* CONTENT AREA */}
      {/* ════════════════════════════════════════════════════════ */}
      <div className="flex-1 overflow-y-auto" style={{ contentVisibility: 'auto' }}>
        {/* ── SCANNING INDICATOR ── */}
        {scanning && (
          <div className="flex items-center justify-center gap-2 py-4">
            <Loader2 size={18} className="text-[#7C3AED] animate-spin" />
            <span className="text-[#9CA3AF] text-sm">Scanning for videos...</span>
          </div>
        )}

        {/* ── EMPTY STATE ── */}
        {!scanning && filteredVideos.length === 0 && activeTab !== 'folders' && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Film size={48} className="text-[#1F1F1F]" />
            <p className="text-[#9CA3AF] text-sm">
              {searchQuery ? 'No videos found' : isNative ? 'No videos on device' : 'No videos loaded yet'}
            </p>
            {!searchQuery && (
              <>
                {isNative ? (
                  <button
                    onClick={() => scanVideoFiles(true)}
                    className="flex items-center gap-2 rounded-xl px-4 text-sm font-medium text-white"
                    style={{
                      height: 44,
                      minHeight: 44,
                      backgroundColor: '#7C3AED',
                      transition: 'background 150ms',
                    }}
                  >
                    <RefreshCw size={16} />
                    Scan Again
                  </button>
                ) : (
                  <div className="flex flex-col items-center gap-2 mt-1">
                    <button
                      onClick={pickVideoFiles}
                      className="flex items-center gap-2 rounded-xl px-5 text-sm font-semibold text-white"
                      style={{
                        height: 44,
                        minHeight: 44,
                        backgroundColor: '#7C3AED',
                        transition: 'background 150ms',
                      }}
                    >
                      <Plus size={16} />
                      Select Video Files
                    </button>
                    <button
                      onClick={pickVideoFolder}
                      className="flex items-center gap-2 rounded-xl px-4 text-xs font-medium text-[#7C3AED]"
                      style={{
                        height: 36,
                        minHeight: 36,
                        backgroundColor: 'transparent',
                        border: '1px solid rgba(124, 58, 237, 0.3)',
                        transition: 'border-color 150ms',
                      }}
                    >
                      <FolderOpen size={14} />
                      Or Select a Folder
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════ */}
        {/* ALL VIDEOS / RECENT / DOWNLOADS TABS */}
        {/* ════════════════════════════════════════════════════ */}
        {(activeTab === 'all' || activeTab === 'recent' || activeTab === 'downloads') && (
          <>
            {videoView === 'grid' ? (
              /* ── GRID VIEW ── */
              <div
                className="grid grid-cols-2 gap-3 p-4"
                style={{ contentVisibility: 'auto' }}
              >
                {filteredVideos.map((video) => {
                  const thumb = thumbnails[video.id];
                  const resume = getResumeInfo(video.id);
                  const resolution = getResolution(video);

                  return (
                    <VideoGridCard
                      key={video.id}
                      video={video}
                      thumbnail={thumb}
                      resolution={resolution}
                      resume={resume}
                      onThumbnailNeeded={enqueueThumbnail}
                      onSelect={handleVideoSelect}
                      onMenu={openSheet}
                    />
                  );
                })}
              </div>
            ) : (
              /* ── LIST VIEW ── */
              <div
                className="flex flex-col"
                style={{ contentVisibility: 'auto' }}
              >
                {filteredVideos.map((video) => {
                  const thumb = thumbnails[video.id];
                  const resume = getResumeInfo(video.id);
                  const resolution = getResolution(video);

                  return (
                    <VideoListRow
                      key={video.id}
                      video={video}
                      thumbnail={thumb}
                      resolution={resolution}
                      resume={resume}
                      onThumbnailNeeded={enqueueThumbnail}
                      onSelect={handleVideoSelect}
                      onMenu={openSheet}
                    />
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ════════════════════════════════════════════════════ */}
        {/* FOLDERS TAB */}
        {/* ════════════════════════════════════════════════════ */}
        {activeTab === 'folders' && (
          <div className="flex flex-col p-4 gap-2" style={{ contentVisibility: 'auto' }}>
            {folders.length === 0 && !scanning && (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <FolderOpen size={48} className="text-[#1F1F1F]" />
                <p className="text-[#9CA3AF] text-sm">No folders found</p>
              </div>
            )}
            {folders.map((folder) => (
              <button
                key={folder.path}
                className="flex items-center gap-3 rounded-xl px-4 w-full text-left"
                style={{
                  height: 56,
                  minHeight: 44,
                  backgroundColor: '#141414',
                  border: '1px solid #1F1F1F',
                  transition: 'background 150ms',
                }}
              >
                <FolderOpen size={22} className="text-[#7C3AED] shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{folder.name}</p>
                  <p className="text-[#9CA3AF] text-xs">{folder.count} video{folder.count !== 1 ? 's' : ''}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════ */}
      {/* VIDEO OPTIONS BOTTOM SHEET */}
      {/* ════════════════════════════════════════════════════════ */}
      {sheetOpen && selectedVideo && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={closeSheet}
          />
          <div
            className="relative w-full max-w-lg rounded-t-2xl z-10"
            style={{ backgroundColor: '#141414', borderTop: '1px solid #1F1F1F' }}
          >
            {/* Video info header */}
            <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid #1F1F1F' }}>
              <div
                className="rounded-lg overflow-hidden shrink-0 flex items-center justify-center"
                style={{
                  width: 48,
                  height: 48,
                  backgroundColor: '#0A0A0A',
                }}
              >
                <Film size={20} className="text-[#7C3AED]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{selectedVideo.name}</p>
                <p className="text-[#9CA3AF] text-xs">
                  {selectedVideo.format.toUpperCase()} • {formatFileSize(selectedVideo.size)}
                </p>
              </div>
              <button
                onClick={closeSheet}
                className="flex items-center justify-center rounded-full hover:bg-white/10"
                style={{ width: 44, height: 44, minWidth: 44, minHeight: 44 }}
                aria-label="Close"
              >
                <X size={20} className="text-white" />
              </button>
            </div>

            {/* Options */}
            <div className="py-2">
              {sheetOptions.map((opt) => (
                <button
                  key={opt.label}
                  onClick={opt.action}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#1F1F1F] active:bg-[#2A2A2A]"
                  style={{ minHeight: 44, transition: 'background 150ms' }}
                >
                  <span className={opt.danger ? 'text-red-500' : 'text-[#9CA3AF]'}>{opt.icon}</span>
                  <span className={`text-sm ${opt.danger ? 'text-red-500' : 'text-white'}`}>
                    {opt.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          FILE IMPORT PREVIEW MODAL
          Opens when user picks files via web file picker
          Shows all selected videos with thumbnails → "Import All" commits
          ════════════════════════════════════════════════════════ */}
      {pendingImport && pendingImport.type === 'video' && (
        <FileImportPreviewModal
          files={pendingImport.files}
          type="video"
          onConfirm={confirmImport}
          onCancel={cancelImport}
        />
      )}

      {/* ── Spin animation for refresh ── */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}} />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// GRID CARD SUBCOMPONENT
// ══════════════════════════════════════════════════════════════

interface VideoGridCardProps {
  video: VideoFile;
  thumbnail: string | undefined;
  resolution: string;
  resume: HistoryEntry | undefined;
  onThumbnailNeeded: (id: string) => void;
  onSelect: (video: VideoFile) => void;
  onMenu: (video: VideoFile, e?: React.MouseEvent) => void;
}

function VideoGridCard({
  video,
  thumbnail,
  resolution,
  resume,
  onThumbnailNeeded,
  onSelect,
  onMenu,
}: VideoGridCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const observedRef = useRef(false);

  // ── Intersection Observer for lazy thumbnail generation ──
  useEffect(() => {
    if (observedRef.current) return;
    const el = cardRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onThumbnailNeeded(video.id);
          observer.disconnect();
          observedRef.current = true;
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [video.id, onThumbnailNeeded]);

  return (
    <div
      ref={cardRef}
      className="rounded-xl overflow-hidden cursor-pointer active:scale-[0.97]"
      style={{
        backgroundColor: '#141414',
        border: '1px solid #1F1F1F',
        transition: 'transform 100ms',
      }}
      onClick={() => onSelect(video)}
    >
      {/* Thumbnail */}
      <div className="relative" style={{ aspectRatio: '16/9' }}>
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={video.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ backgroundColor: '#0A0A0A' }}
          >
            <Film size={24} className="text-[#1F1F1F]" />
          </div>
        )}

        {/* Format badge (top-left) */}
        <div
          className="absolute top-2 left-2 text-white text-xs px-2 rounded"
          style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
        >
          {video.format.toUpperCase()}
        </div>

        {/* Duration badge (bottom-right) */}
        {video.duration > 0 && (
          <div
            className="absolute bottom-2 right-2 text-white text-xs px-2 rounded"
            style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
          >
            {formatDuration(video.duration)}
          </div>
        )}

        {/* Resume badge */}
        {resume && resume.position > 5 && (
          <div
            className="absolute bottom-2 left-2 text-xs px-2 rounded font-medium"
            style={{ backgroundColor: 'rgba(0,0,0,0.7)', color: '#06B6D4' }}
          >
            Resume from {formatDuration(resume.position)}
          </div>
        )}

        {/* Play circle center */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className="flex items-center justify-center rounded-full"
            style={{
              width: 50,
              height: 50,
              backgroundColor: 'rgba(0,0,0,0.5)',
            }}
          >
            <Play size={22} className="text-white ml-1" />
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="p-2.5">
        <p className="text-white text-[13px] font-medium truncate">{video.name}</p>
        <p className="text-[#9CA3AF] text-[11px] truncate mt-0.5">
          {video.format.toUpperCase()}
          {resolution && ` • ${resolution}`}
          {` • ${formatFileSize(video.size)}`}
        </p>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// LIST ROW SUBCOMPONENT
// ══════════════════════════════════════════════════════════════

interface VideoListRowProps {
  video: VideoFile;
  thumbnail: string | undefined;
  resolution: string;
  resume: HistoryEntry | undefined;
  onThumbnailNeeded: (id: string) => void;
  onSelect: (video: VideoFile) => void;
  onMenu: (video: VideoFile, e?: React.MouseEvent) => void;
}

function VideoListRow({
  video,
  thumbnail,
  resolution,
  resume,
  onThumbnailNeeded,
  onSelect,
  onMenu,
}: VideoListRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const observedRef = useRef(false);

  // ── Intersection Observer for lazy thumbnail ──
  useEffect(() => {
    if (observedRef.current) return;
    const el = rowRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onThumbnailNeeded(video.id);
          observer.disconnect();
          observedRef.current = true;
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [video.id, onThumbnailNeeded]);

  return (
    <div
      ref={rowRef}
      className="flex items-center gap-3 px-4 cursor-pointer hover:bg-[#141414] active:bg-[#1A1A1A]"
      style={{
        height: 72,
        minHeight: 72,
        transition: 'background 150ms',
      }}
      onClick={() => onSelect(video)}
    >
      {/* Thumbnail */}
      <div
        className="rounded-lg overflow-hidden shrink-0"
        style={{ width: 96, height: 54 }}
      >
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={video.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ backgroundColor: '#141414' }}
          >
            <Film size={18} className="text-[#1F1F1F]" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate">{video.name}</p>
        <p className="text-[#9CA3AF] text-xs truncate mt-0.5">
          {video.format.toUpperCase()}
          {resolution && ` • ${resolution}`}
          {` • ${formatFileSize(video.size)}`}
          {video.duration > 0 && ` • ${formatDuration(video.duration)}`}
        </p>
        {resume && resume.position > 5 && (
          <p className="text-xs mt-0.5 font-medium" style={{ color: '#06B6D4' }}>
            Resume from {formatDuration(resume.position)}
          </p>
        )}
      </div>

      {/* Menu button */}
      <button
        onClick={(e) => onMenu(video, e)}
        className="flex items-center justify-center rounded-full hover:bg-white/10 shrink-0"
        style={{ width: 44, height: 44, minWidth: 44, minHeight: 44, transition: 'transform 100ms' }}
        aria-label="Video options"
      >
        <MoreVertical size={18} className="text-[#9CA3AF]" />
      </button>
    </div>
  );
}
