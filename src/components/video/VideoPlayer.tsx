'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useVideoPlayer } from '@/hooks/useVideoPlayer';
import type { AspectRatio } from '@/hooks/useVideoPlayer';
import PlayerControls from './PlayerControls';
import GestureOverlay from './GestureOverlay';
import { isNativePlatform, formatDuration, type VideoFile } from '@/lib/mediaUtils';

interface VideoPlayerProps {
  video?: VideoFile;
  onBack: () => void;
}

export default function VideoPlayer({ video, onBack }: VideoPlayerProps) {
  const {
    videoRef,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    brightness,
    playbackSpeed,
    aspectRatio,
    isLocked,
    isFullscreen,
    subtitleTrack,
    audioTrack,
    repeatMode,
    pipMode,
    showControls,
    currentVideo,
    resumePosition,
    play,
    pause,
    seek,
    skip,
    setVolume,
    setSpeed,
    setAspectRatio,
    toggleLock,
    togglePip,
    loadSubtitle,
    setAudioTrack,
    setBrightness,
    toggleFullscreen,
    toggleMute,
    loadVideo,
    cycleRepeat,
    resetHideTimer,
    formatDuration: formatDur,
  } = useVideoPlayer();

  const [dismissedVideoId, setDismissedVideoId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const videoId = video?.id ?? '';
  const resumeDismissed = dismissedVideoId === videoId;
  const showResumeSnackbar =
    !resumeDismissed && resumePosition !== null && resumePosition > 5;

  // ── Load video on mount and when video changes ──
  useEffect(() => {
    if (video) loadVideo(video);
  }, [videoId, loadVideo, video]);

  // ── Hide status bar on native platforms ──
  useEffect(() => {
    if (!isNativePlatform()) return;
    try {
      const w = window as unknown as {
        Capacitor?: {
          Plugins?: {
            StatusBar?: { hide: () => void; show: () => void }
          }
        }
      };
      w.Capacitor?.Plugins?.StatusBar?.hide();
      return () => {
        w.Capacitor?.Plugins?.StatusBar?.show();
      };
    } catch {
      // StatusBar plugin not available
    }
  }, []);

  // ── Auto-dismiss resume snackbar after 4s ──
  useEffect(() => {
    if (!showResumeSnackbar) return;
    const timer = setTimeout(() => {
      if (videoId) setDismissedVideoId(videoId);
    }, 4000);
    return () => clearTimeout(timer);
  }, [showResumeSnackbar, videoId]);

  // ── Callbacks ──
  const handleResume = useCallback(() => {
    if (resumePosition !== null) {
      seek(resumePosition);
    }
    if (videoId) setDismissedVideoId(videoId);
    play();
  }, [resumePosition, seek, play, videoId]);

  const handleStartOver = useCallback(() => {
    seek(0);
    if (videoId) setDismissedVideoId(videoId);
    play();
  }, [seek, play, videoId]);

  const handleToggleControls = useCallback(() => {
    resetHideTimer();
  }, [resetHideTimer]);

  const handleAspectChange = useCallback(
    (ratio: AspectRatio) => {
      setAspectRatio(ratio);
      resetHideTimer();
    },
    [setAspectRatio, resetHideTimer]
  );

  const handleSpeedChange = useCallback(
    (speed: number) => {
      setSpeed(speed);
      resetHideTimer();
    },
    [setSpeed, resetHideTimer]
  );

  const handleLockToggle = useCallback(() => {
    toggleLock();
    resetHideTimer();
  }, [toggleLock, resetHideTimer]);

  const handleUnlock = useCallback(() => {
    toggleLock();
    resetHideTimer();
  }, [toggleLock, resetHideTimer]);

  const handleSubtitleLoad = useCallback(() => {
    resetHideTimer();
  }, [resetHideTimer]);

  const handleGestureSeek = useCallback(
    (seconds: number) => {
      skip(seconds);
    },
    [skip]
  );

  const handleBrightnessChange = useCallback(
    (val: number) => {
      setBrightness(val);
    },
    [setBrightness]
  );

  const handleVolumeChange = useCallback(
    (val: number) => {
      setVolume(val);
    },
    [setVolume]
  );

  const handleGestureSpeedChange = useCallback(
    (rate: number) => {
      setSpeed(rate);
    },
    [setSpeed]
  );

  // ── Compute object-fit from aspect ratio mode ──
  const videoStyle = (() => {
    const mode = aspectRatio as AspectRatio;
    const baseStyle: React.CSSProperties = {
      filter: `brightness(${Math.round(brightness * 100)}%)`,
    };
    switch (mode) {
      case 'fill':
        return { ...baseStyle, objectFit: 'cover' as const };
      case '16:9':
        return { ...baseStyle, objectFit: 'contain' as const, aspectRatio: '16/9' };
      case '4:3':
        return { ...baseStyle, objectFit: 'contain' as const, aspectRatio: '4/3' };
      case 'zoom':
        return { ...baseStyle, objectFit: 'cover' as const, transform: 'scale(1.3)' };
      case 'fit':
      default:
        return { ...baseStyle, objectFit: 'contain' as const };
    }
  })();

  const playerState = {
    videoRef, isPlaying, currentTime, duration, volume, isMuted,
    brightness, playbackSpeed, aspectRatio, isLocked, isFullscreen,
    subtitleTrack, audioTrack, repeatMode, pipMode, showControls,
    currentVideo, resumePosition,
    play, pause, seek, skip, setVolume, setSpeed, setAspectRatio,
    toggleLock, togglePip, loadSubtitle, setAudioTrack,
    setBrightness, toggleFullscreen, toggleMute,
    loadVideo, cycleRepeat, resetHideTimer, formatDuration: formatDur,
  };

  // Guard: no video loaded yet — all hooks called above
  if (!video) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <p className="text-[#9CA3AF] text-sm">No video selected</p>
        <button
          onClick={onBack}
          type="button"
          className="absolute top-4 left-4 w-11 h-11 rounded-full bg-white/10 flex items-center justify-center min-h-[44px] min-w-[44px]"
          aria-label="Go back"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 flex flex-col"
      style={{ backgroundColor: '#000000' }}
    >
      {/* VIDEO ELEMENT */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        <video
          ref={videoRef}
          className="w-full h-full"
          style={videoStyle}
          playsInline
          preload="metadata"
          data-video-player-element
        />

        {/* GESTURE OVERLAY */}
        <GestureOverlay
          onToggleControls={handleToggleControls}
          onSeek={handleGestureSeek}
          onBrightnessChange={handleBrightnessChange}
          onVolumeChange={handleVolumeChange}
          onSpeedChange={handleGestureSpeedChange}
          isLocked={isLocked}
          videoRef={videoRef}
          onUnlock={handleUnlock}
          brightness={brightness}
          volume={volume}
          isMuted={isMuted}
        />

        {/* PLAYER CONTROLS */}
        <PlayerControls
          playerState={playerState}
          onBack={onBack}
          onAspectChange={handleAspectChange}
          onSubtitleLoad={handleSubtitleLoad}
          onSpeedChange={handleSpeedChange}
          onLockToggle={handleLockToggle}
        />
      </div>

      {/* RESUME SNACKBAR */}
      {showResumeSnackbar && resumePosition !== null && (
        <div
          className="absolute bottom-20 left-4 right-4 z-50 flex items-center justify-between rounded-xl px-4 py-3"
          style={{ backgroundColor: '#141414', border: '1px solid #1F1F1F' }}
        >
          <span className="text-white text-sm">
            Resume from {formatDuration(resumePosition)}?
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleStartOver}
              className="rounded-lg px-3 text-sm font-medium"
              style={{ height: 44, minHeight: 44, color: '#9CA3AF', transition: 'color 150ms' }}
            >
              Start Over
            </button>
            <button
              onClick={handleResume}
              className="rounded-lg px-3 text-sm font-medium"
              style={{ height: 44, minHeight: 44, backgroundColor: '#7C3AED', color: '#FFFFFF', transition: 'background 150ms' }}
            >
              Resume
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
