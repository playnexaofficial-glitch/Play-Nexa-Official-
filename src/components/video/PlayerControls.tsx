'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import type { VideoPlayerState } from '@/hooks/useVideoPlayer';
import type { AspectRatio } from '@/hooks/useVideoPlayer';
import { formatDuration, type SubCue } from '@/lib/mediaUtils';
import {
  ArrowLeft,
  MoreVertical,
  SkipBack,
  SkipForward,
  Play,
  Pause,
  RotateCcw,
  Subtitles,
  Volume2,
  VolumeX,
  Gauge,
  Lock,
  PictureInPicture2,
  Maximize,
  Repeat,
  X,
} from 'lucide-react';

// ══════════════════════════════════════════════════════════════
// PROPS
// ══════════════════════════════════════════════════════════════

interface PlayerControlsProps {
  playerState: VideoPlayerState;
  onBack: () => void;
  onAspectChange: (ratio: AspectRatio) => void;
  onSubtitleLoad: () => void;
  onSpeedChange: (speed: number) => void;
  onLockToggle: () => void;
}

// ══════════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════════

type AspectOption = AspectRatio;
const ASPECT_LABELS: Record<AspectOption, string> = {
  fit: 'Fit',
  fill: 'Fill',
  '16:9': '16:9',
  '4:3': '4:3',
  zoom: 'Zoom',
};

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2];

const SUBTITLE_COLORS = [
  { label: 'White', value: '#FFFFFF' },
  { label: 'Yellow', value: '#FFD700' },
  { label: 'Green', value: '#00FF00' },
  { label: 'Cyan', value: '#06B6D4' },
];

// ══════════════════════════════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════════════════════════════

export default function PlayerControls({
  playerState,
  onBack,
  onAspectChange,
  onSubtitleLoad,
  onSpeedChange,
  onLockToggle,
}: PlayerControlsProps) {
  const player = playerState;
  const [menuOpen, setMenuOpen] = useState(false);
  const [speedSheetOpen, setSpeedSheetOpen] = useState(false);
  const [aspectSheetOpen, setAspectSheetOpen] = useState(false);
  const [subtitlePanelOpen, setSubtitlePanelOpen] = useState(false);
  const [subtitleFontSize, setSubtitleFontSize] = useState(16);
  const [subtitleColor, setSubtitleColor] = useState('#FFFFFF');
  const [subtitlePosition, setSubtitlePosition] = useState<'top' | 'bottom'>('bottom');
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // ── Close menu on outside click ──
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  // ── Close all sheets on escape ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSpeedSheetOpen(false);
        setAspectSheetOpen(false);
        setSubtitlePanelOpen(false);
        setMenuOpen(false);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // ── Seek change handler ──
  const handleSeekChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      player.seek(parseFloat(e.target.value));
    },
    [player]
  );

  // ── Speed select ──
  const handleSpeedSelect = useCallback(
    (speed: number) => {
      onSpeedChange(speed);
      setSpeedSheetOpen(false);
      player.resetHideTimer();
    },
    [player, onSpeedChange]
  );

  // ── Aspect select ──
  const handleAspectSelect = useCallback(
    (ratio: AspectOption) => {
      onAspectChange(ratio);
      setAspectSheetOpen(false);
      player.resetHideTimer();
    },
    [player, onAspectChange]
  );

  // ── Load subtitle file ──
  const handleLoadSubtitle = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.srt,.ass,.ssa,.vtt';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        await player.loadSubtitle(file);
        onSubtitleLoad();
      }
    };
    input.click();
  }, [player, onSubtitleLoad]);

  // ── Lock long press ──
  const handleLockPointerDown = useCallback(() => {
    longPressTimerRef.current = setTimeout(() => {
      onLockToggle();
      player.resetHideTimer();
    }, 500);
  }, [player, onLockToggle]);

  const handleLockPointerUp = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  // ── Current subtitle cue ──
  const currentCue = player.subtitleTrack?.find(
    (c: SubCue) => player.currentTime >= c.start && player.currentTime <= c.end
  );

  const progress = player.duration > 0 ? (player.currentTime / player.duration) * 100 : 0;
  const visible = player.showControls;

  // ══════════════════════════════════════════════════════════════
  // LOCKED OVERLAY
  // ══════════════════════════════════════════════════════════════

  if (player.isLocked) {
    return (
      <>
        <div
          className="absolute inset-0 flex items-center justify-center z-30"
          style={{
            opacity: visible ? 1 : 0,
            transition: 'opacity 200ms',
            pointerEvents: visible ? 'auto' : 'none',
          }}
        >
          <button
            onPointerDown={handleLockPointerDown}
            onPointerUp={handleLockPointerUp}
            onPointerCancel={handleLockPointerUp}
            className="flex items-center justify-center w-16 h-16 rounded-full"
            style={{
              backgroundColor: 'rgba(20,20,20,0.8)',
              border: '1px solid #1F1F1F',
              minWidth: 44,
              minHeight: 44,
            }}
            aria-label="Long press to unlock"
          >
            <Lock size={28} className="text-[#7C3AED]" />
          </button>
        </div>

        {/* ── Subtitle rendering even when locked ── */}
        {currentCue && (
          <div
            className="absolute left-0 right-0 z-10 flex justify-center pointer-events-none px-4"
            style={{
              [subtitlePosition === 'top' ? 'top' : 'bottom']: 80,
            }}
          >
            <span
              className="text-center px-3 py-1 rounded"
              style={{
                fontSize: subtitleFontSize,
                color: subtitleColor,
                backgroundColor: 'rgba(0,0,0,0.7)',
                maxWidth: '90%',
              }}
            >
              {currentCue.text}
            </span>
          </div>
        )}
      </>
    );
  }

  // ══════════════════════════════════════════════════════════════
  // FULL CONTROLS
  // ══════════════════════════════════════════════════════════════

  return (
    <>
      {/* ── CONTROLS OVERLAY ── */}
      <div
        className="absolute inset-0 flex flex-col justify-between z-20 pointer-events-none"
        style={{
          opacity: visible ? 1 : 0,
          transition: 'opacity 200ms',
        }}
      >
        {/* ── TOP BAR ── */}
        <div
          className="pointer-events-auto flex items-center justify-between px-3 py-2"
          style={{
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)',
          }}
        >
          <button
            onClick={onBack}
            className="flex items-center justify-center rounded-full hover:bg-white/10 active:scale-90"
            style={{ width: 44, height: 44, minWidth: 44, minHeight: 44, transition: 'transform 100ms' }}
            aria-label="Go back"
          >
            <ArrowLeft size={22} className="text-white" />
          </button>

          <p className="text-white text-sm font-medium truncate mx-3 flex-1 text-center">
            {player.currentVideo?.name || 'Now Playing'}
          </p>

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center justify-center rounded-full hover:bg-white/10 active:scale-90"
              style={{ width: 44, height: 44, minWidth: 44, minHeight: 44, transition: 'transform 100ms' }}
              aria-label="More options"
            >
              <MoreVertical size={22} className="text-white" />
            </button>

            {/* ── DROPDOWN MENU ── */}
            {menuOpen && (
              <div
                className="absolute right-0 top-12 rounded-xl overflow-hidden shadow-2xl z-50 min-w-[200px]"
                style={{ backgroundColor: '#141414', border: '1px solid #1F1F1F' }}
              >
                {[
                  { icon: <Subtitles size={18} />, label: 'Subtitle', action: () => { setSubtitlePanelOpen(true); setMenuOpen(false) } },
                  { icon: <Gauge size={18} />, label: 'Playback Speed', action: () => { setSpeedSheetOpen(true); setMenuOpen(false) } },
                  { icon: <div className="w-4 h-3 border border-white/50 rounded-sm" />, label: 'Aspect Ratio', action: () => { setAspectSheetOpen(true); setMenuOpen(false) } },
                  { icon: <Lock size={18} />, label: 'Lock Screen', action: () => { onLockToggle(); setMenuOpen(false); player.resetHideTimer() } },
                  { icon: <PictureInPicture2 size={18} />, label: 'PiP Mode', action: () => { player.togglePip(); setMenuOpen(false) } },
                  { icon: <Maximize size={18} />, label: 'Fullscreen', action: () => { player.toggleFullscreen(); setMenuOpen(false) } },
                  { icon: <Repeat size={18} />, label: `Repeat: ${player.repeatMode === 'one' ? 'One' : 'Off'}`, action: () => { player.cycleRepeat(); setMenuOpen(false); player.resetHideTimer() } },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={item.action}
                    className="w-full flex items-center gap-3 px-4 py-3 text-white text-sm hover:bg-[#1F1F1F] active:bg-[#2A2A2A]"
                    style={{ minHeight: 44, transition: 'background 150ms' }}
                  >
                    <span className="text-[#9CA3AF]">{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── SPACER ── */}
        <div className="flex-1" />

        {/* ── BOTTOM CONTROLS ── */}
        <div
          className="pointer-events-auto px-4 pb-4 pt-2"
          style={{
            background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
          }}
        >
          {/* ── SEEKBAR ── */}
          <div className="flex items-center gap-3 mb-3">
            <span className="text-white/70 text-xs font-mono w-10 text-right shrink-0">
              {formatDuration(player.currentTime)}
            </span>
            <div className="relative flex-1 h-5 flex items-center">
              {/* Track background */}
              <div className="absolute w-full rounded-full" style={{ height: 3, backgroundColor: 'rgba(255,255,255,0.2)' }} />
              {/* Progress fill */}
              <div
                className="absolute rounded-full"
                style={{
                  height: 3,
                  width: `${progress}%`,
                  backgroundColor: '#7C3AED',
                  transition: 'width 200ms',
                }}
              />
              {/* Thumb */}
              <div
                className="absolute rounded-full bg-white"
                style={{
                  width: 14,
                  height: 14,
                  left: `calc(${progress}% - 7px)`,
                  transition: 'left 200ms',
                  boxShadow: '0 0 4px rgba(0,0,0,0.5)',
                }}
              />
              <input
                type="range"
                min={0}
                max={player.duration || 0}
                step={0.1}
                value={player.currentTime}
                onChange={handleSeekChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                style={{ margin: 0 }}
                aria-label="Seek"
              />
            </div>
            <span className="text-white/70 text-xs font-mono w-10 shrink-0">
              {formatDuration(player.duration)}
            </span>
          </div>

          {/* ── CONTROLS ROW ── */}
          <div className="flex items-center justify-center gap-2 mb-3">
            {/* -10s */}
            <button
              onClick={() => player.skip(-10)}
              className="flex items-center justify-center rounded-full hover:bg-white/10 active:scale-90"
              style={{ width: 44, height: 44, minWidth: 44, minHeight: 44, transition: 'transform 100ms' }}
              aria-label="Rewind 10 seconds"
            >
              <RotateCcw size={20} className="text-white" />
            </button>

            {/* Previous */}
            <button
              onClick={() => player.skip(-30)}
              className="flex items-center justify-center rounded-full hover:bg-white/10 active:scale-90"
              style={{ width: 44, height: 44, minWidth: 44, minHeight: 44, transition: 'transform 100ms' }}
              aria-label="Previous"
            >
              <SkipBack size={20} className="text-white" />
            </button>

            {/* Play / Pause (56px circle) */}
            <button
              onClick={() => {
                if (player.isPlaying) player.pause();
                else player.play();
                player.resetHideTimer();
              }}
              className="flex items-center justify-center rounded-full"
              style={{
                width: 56,
                height: 56,
                minWidth: 56,
                minHeight: 56,
                backgroundColor: '#7C3AED',
                transition: 'transform 100ms',
              }}
              aria-label={player.isPlaying ? 'Pause' : 'Play'}
            >
              {player.isPlaying ? (
                <Pause size={28} className="text-white" />
              ) : (
                <Play size={28} className="text-white ml-1" />
              )}
            </button>

            {/* Next */}
            <button
              onClick={() => player.skip(30)}
              className="flex items-center justify-center rounded-full hover:bg-white/10 active:scale-90"
              style={{ width: 44, height: 44, minWidth: 44, minHeight: 44, transition: 'transform 100ms' }}
              aria-label="Next"
            >
              <SkipForward size={20} className="text-white" />
            </button>

            {/* +10s */}
            <button
              onClick={() => player.skip(10)}
              className="flex items-center justify-center rounded-full hover:bg-white/10 active:scale-90"
              style={{ width: 44, height: 44, minWidth: 44, minHeight: 44, transition: 'transform 100ms' }}
              aria-label="Forward 10 seconds"
            >
              <RotateCcw size={20} className="text-white" style={{ transform: 'scaleX(-1)' }} />
            </button>
          </div>

          {/* ── BOTTOM TOOLBAR ── */}
          <div className="flex items-center justify-between">
            {/* Aspect */}
            <button
              onClick={() => { setAspectSheetOpen(true); player.resetHideTimer() }}
              className="flex items-center justify-center rounded-lg hover:bg-white/10 active:scale-95 px-2"
              style={{ height: 44, minHeight: 44, transition: 'transform 100ms' }}
              aria-label="Aspect ratio"
            >
              <span className="text-white text-xs font-medium">
                {ASPECT_LABELS[player.aspectRatio as AspectOption] || 'Fit'}
              </span>
            </button>

            {/* Subtitle */}
            <button
              onClick={() => { setSubtitlePanelOpen(true); player.resetHideTimer() }}
              className="flex items-center justify-center rounded-lg hover:bg-white/10 active:scale-95 px-2"
              style={{ height: 44, minHeight: 44, transition: 'transform 100ms' }}
              aria-label="Subtitles"
            >
              <Subtitles size={20} className="text-white" />
            </button>

            {/* Mute */}
            <button
              onClick={() => { player.toggleMute(); player.resetHideTimer() }}
              className="flex items-center justify-center rounded-lg hover:bg-white/10 active:scale-95 px-2"
              style={{ height: 44, minHeight: 44, transition: 'transform 100ms' }}
              aria-label={player.isMuted ? 'Unmute' : 'Mute'}
            >
              {player.isMuted ? (
                <VolumeX size={20} className="text-white" />
              ) : (
                <Volume2 size={20} className="text-white" />
              )}
            </button>

            {/* Speed */}
            <button
              onClick={() => { setSpeedSheetOpen(true); player.resetHideTimer() }}
              className="flex items-center justify-center rounded-lg hover:bg-white/10 active:scale-95 px-2"
              style={{ height: 44, minHeight: 44, transition: 'transform 100ms' }}
              aria-label="Playback speed"
            >
              <span className="text-white text-xs font-medium">
                {player.playbackSpeed}x
              </span>
            </button>

            {/* Lock */}
            <button
              onClick={() => { onLockToggle(); player.resetHideTimer() }}
              className="flex items-center justify-center rounded-lg hover:bg-white/10 active:scale-95 px-2"
              style={{ height: 44, minHeight: 44, transition: 'transform 100ms' }}
              aria-label="Lock screen"
            >
              <Lock size={20} className="text-[#7C3AED]" />
            </button>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════ */}
      {/* SPEED PICKER BOTTOM SHEET */}
      {/* ════════════════════════════════════════════════════════════ */}
      {speedSheetOpen && (
        <div className="absolute inset-0 z-40 flex items-end justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSpeedSheetOpen(false)}
          />
          <div
            className="relative w-full max-w-lg rounded-t-2xl p-4 z-10"
            style={{ backgroundColor: '#141414', borderTop: '1px solid #1F1F1F' }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold text-base">Playback Speed</h3>
              <button
                onClick={() => setSpeedSheetOpen(false)}
                className="flex items-center justify-center rounded-full hover:bg-white/10"
                style={{ width: 44, height: 44, minWidth: 44, minHeight: 44 }}
                aria-label="Close"
              >
                <X size={20} className="text-white" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {SPEED_OPTIONS.map((speed) => (
                <button
                  key={speed}
                  onClick={() => handleSpeedSelect(speed)}
                  className="flex items-center justify-center rounded-xl px-4 font-medium text-sm"
                  style={{
                    height: 44,
                    minHeight: 44,
                    backgroundColor: player.playbackSpeed === speed ? '#7C3AED' : '#1F1F1F',
                    color: '#FFFFFF',
                    transition: 'background 150ms',
                  }}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════ */}
      {/* ASPECT RATIO PICKER */}
      {/* ════════════════════════════════════════════════════════════ */}
      {aspectSheetOpen && (
        <div className="absolute inset-0 z-40 flex items-end justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setAspectSheetOpen(false)}
          />
          <div
            className="relative w-full max-w-lg rounded-t-2xl p-4 z-10"
            style={{ backgroundColor: '#141414', borderTop: '1px solid #1F1F1F' }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold text-base">Aspect Ratio</h3>
              <button
                onClick={() => setAspectSheetOpen(false)}
                className="flex items-center justify-center rounded-full hover:bg-white/10"
                style={{ width: 44, height: 44, minWidth: 44, minHeight: 44 }}
                aria-label="Close"
              >
                <X size={20} className="text-white" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(ASPECT_LABELS) as AspectOption[]).map((ratio) => (
                <button
                  key={ratio}
                  onClick={() => handleAspectSelect(ratio)}
                  className="flex items-center justify-center rounded-xl px-4 font-medium text-sm"
                  style={{
                    height: 44,
                    minHeight: 44,
                    backgroundColor: player.aspectRatio === ratio ? '#7C3AED' : '#1F1F1F',
                    color: '#FFFFFF',
                    transition: 'background 150ms',
                  }}
                >
                  {ASPECT_LABELS[ratio]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════ */}
      {/* SUBTITLE PANEL */}
      {/* ════════════════════════════════════════════════════════════ */}
      {subtitlePanelOpen && (
        <div className="absolute inset-0 z-40 flex items-end justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSubtitlePanelOpen(false)}
          />
          <div
            className="relative w-full max-w-lg rounded-t-2xl p-4 z-10 max-h-[70vh] overflow-y-auto"
            style={{ backgroundColor: '#141414', borderTop: '1px solid #1F1F1F' }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold text-base">Subtitles</h3>
              <button
                onClick={() => setSubtitlePanelOpen(false)}
                className="flex items-center justify-center rounded-full hover:bg-white/10"
                style={{ width: 44, height: 44, minWidth: 44, minHeight: 44 }}
                aria-label="Close"
              >
                <X size={20} className="text-white" />
              </button>
            </div>

            {/* Load subtitle file */}
            <button
              onClick={handleLoadSubtitle}
              className="w-full flex items-center justify-center gap-2 rounded-xl mb-4 font-medium text-sm text-white"
              style={{
                height: 44,
                minHeight: 44,
                backgroundColor: '#1F1F1F',
                transition: 'background 150ms',
              }}
            >
              <Subtitles size={18} />
              Load .srt / .ass file
            </button>

            {/* Subtitle loaded indicator */}
            {player.subtitleTrack && (
              <p className="text-[#9CA3AF] text-xs mb-4">
                {player.subtitleTrack.length} cues loaded
              </p>
            )}

            {/* Font size slider */}
            <div className="mb-4">
              <label className="text-white text-sm mb-2 block">
                Font Size: {subtitleFontSize}px
              </label>
              <input
                type="range"
                min={12}
                max={24}
                value={subtitleFontSize}
                onChange={(e) => setSubtitleFontSize(parseInt(e.target.value))}
                className="w-full"
                style={{ accentColor: '#7C3AED' }}
                aria-label="Subtitle font size"
              />
            </div>

            {/* Color picker */}
            <div className="mb-4">
              <label className="text-white text-sm mb-2 block">Color</label>
              <div className="flex gap-2">
                {SUBTITLE_COLORS.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setSubtitleColor(c.value)}
                    className="rounded-full border-2 flex items-center justify-center"
                    style={{
                      width: 44,
                      height: 44,
                      minWidth: 44,
                      minHeight: 44,
                      backgroundColor: c.value,
                      borderColor: subtitleColor === c.value ? '#7C3AED' : 'transparent',
                      transition: 'border-color 150ms',
                    }}
                    aria-label={`Subtitle color: ${c.label}`}
                  >
                    {subtitleColor === c.value && (
                      <span className="text-black font-bold text-xs">✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Position toggle */}
            <div className="mb-2">
              <label className="text-white text-sm mb-2 block">Position</label>
              <div className="flex gap-2">
                {(['bottom', 'top'] as const).map((pos) => (
                  <button
                    key={pos}
                    onClick={() => setSubtitlePosition(pos)}
                    className="rounded-xl px-4 font-medium text-sm capitalize"
                    style={{
                      height: 44,
                      minHeight: 44,
                      backgroundColor: subtitlePosition === pos ? '#7C3AED' : '#1F1F1F',
                      color: '#FFFFFF',
                      transition: 'background 150ms',
                    }}
                  >
                    {pos}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════ */}
      {/* SUBTITLE RENDERING */}
      {/* ════════════════════════════════════════════════════════════ */}
      {currentCue && !player.isLocked && (
        <div
          className="absolute left-0 right-0 z-10 flex justify-center pointer-events-none px-4"
          style={{
            [subtitlePosition === 'top' ? 'top' : 'bottom']: 80,
          }}
        >
          <span
            className="text-center px-3 py-1 rounded"
            style={{
              fontSize: subtitleFontSize,
              color: subtitleColor,
              backgroundColor: 'rgba(0,0,0,0.7)',
              maxWidth: '90%',
            }}
          >
            {currentCue.text}
          </span>
        </div>
      )}
    </>
  );
}
