'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import {
  formatDuration,
  lsGet,
  lsSet,
  isNativePlatform,
  type VideoFile,
  type SubCue,
  parseSubtitle,
} from '@/lib/mediaUtils';

// ══════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════

export type AspectRatio = 'fit' | 'fill' | '16:9' | '4:3' | 'zoom';
type RepeatMode = 'off' | 'one';

interface HistoryEntry {
  position: number;
  updatedAt: number;
}

const STORAGE_KEYS = {
  volume: 'pn_video_volume',
  speed: 'pn_video_speed',
  brightness: 'pn_video_brightness',
  aspect: 'pn_video_aspect',
  repeat: 'pn_video_repeat',
  history: 'pn_video_history',
} as const;

const MAX_HISTORY_ENTRIES = 50;

// ══════════════════════════════════════════════════════════════
// HISTORY HELPERS (with 50-entry cap)
// ══════════════════════════════════════════════════════════════

function readHistory(): Record<string, HistoryEntry> {
  try {
    const raw = lsGet<string>(STORAGE_KEYS.history, '');
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, HistoryEntry>;
  } catch {
    return {};
  }
}

function writeHistory(history: Record<string, HistoryEntry>): void {
  const entries = Object.entries(history);
  if (entries.length > MAX_HISTORY_ENTRIES) {
    entries.sort((a, b) => b[1].updatedAt - a[1].updatedAt);
    const trimmed: Record<string, HistoryEntry> = {};
    for (let i = 0; i < MAX_HISTORY_ENTRIES; i++) {
      trimmed[entries[i][0]] = entries[i][1];
    }
    lsSet(STORAGE_KEYS.history, JSON.stringify(trimmed));
  } else {
    lsSet(STORAGE_KEYS.history, JSON.stringify(history));
  }
}

// ══════════════════════════════════════════════════════════════
// HOOK
// ══════════════════════════════════════════════════════════════

export function useVideoPlayer() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolumeState] = useState<number>(() =>
    lsGet<number>(STORAGE_KEYS.volume, 0.75)
  );
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [brightness, setBrightnessState] = useState<number>(() =>
    lsGet<number>(STORAGE_KEYS.brightness, 1)
  );
  const [playbackSpeed, setPlaybackSpeedState] = useState<number>(() =>
    lsGet<number>(STORAGE_KEYS.speed, 1.0)
  );
  const [aspectRatio, setAspectRatioState] = useState<AspectRatio>(() => {
    const saved = lsGet<string>(STORAGE_KEYS.aspect, 'fit');
    const valid: AspectRatio[] = ['fit', 'fill', '16:9', '4:3', 'zoom'];
    return valid.includes(saved as AspectRatio) ? (saved as AspectRatio) : 'fit';
  });
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [subtitleTrack, setSubtitleTrack] = useState<SubCue[] | null>(null);
  const [audioTrack, setAudioTrackState] = useState<number>(0);
  const [repeatMode, setRepeatModeState] = useState<RepeatMode>(() => {
    const saved = lsGet<string>(STORAGE_KEYS.repeat, 'off');
    return saved === 'one' ? 'one' : 'off';
  });
  const [pipMode, setPipMode] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [currentVideo, setCurrentVideo] = useState<VideoFile | null>(null);
  const [resumePosition, setResumePosition] = useState<number | null>(null);

  // ── Controls auto-hide ──────────────────────────────────────────────
  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }
    hideTimerRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  }, []);

  // ── Video event listeners ───────────────────────────────────────────
  const attachVideoListeners = useCallback(
    (el: HTMLVideoElement) => {
      const onTimeUpdate = () => {
        setCurrentTime(el.currentTime);
      };

      const onLoadedMetadata = () => {
        setDuration(el.duration);
        el.volume = volume;
        el.playbackRate = playbackSpeed;
        el.muted = isMuted;

        if (resumePosition !== null && resumePosition > 0) {
          el.currentTime = resumePosition;
          setResumePosition(null);
        }
      };

      const onEnded = () => {
        if (repeatMode === 'one') {
          el.currentTime = 0;
          el.play().catch(() => setIsPlaying(false));
        } else {
          setIsPlaying(false);
        }
      };

      const onPlay = () => {
        setIsPlaying(true);
        resetHideTimer();
      };

      const onPause = () => {
        setIsPlaying(false);
      };

      el.addEventListener('timeupdate', onTimeUpdate);
      el.addEventListener('loadedmetadata', onLoadedMetadata);
      el.addEventListener('ended', onEnded);
      el.addEventListener('play', onPlay);
      el.addEventListener('pause', onPause);

      return () => {
        el.removeEventListener('timeupdate', onTimeUpdate);
        el.removeEventListener('loadedmetadata', onLoadedMetadata);
        el.removeEventListener('ended', onEnded);
        el.removeEventListener('play', onPlay);
        el.removeEventListener('pause', onPause);
      };
    },
    [resumePosition, repeatMode, resetHideTimer, volume, playbackSpeed, isMuted]
  );

  // ── Sync video ref listeners when ref changes ───────────────────────
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const cleanup = attachVideoListeners(el);
    return cleanup;
  }, [attachVideoListeners]);

  // ── Periodic position save (every 5s while playing) ─────────────────
  useEffect(() => {
    if (saveIntervalRef.current) {
      clearInterval(saveIntervalRef.current);
    }
    saveIntervalRef.current = setInterval(() => {
      const el = videoRef.current;
      if (el && currentVideo && isPlaying && el.currentTime > 0) {
        try {
          const history = readHistory();
          history[currentVideo.id] = {
            position: el.currentTime,
            updatedAt: Date.now(),
          };
          writeHistory(history);
        } catch {
          // silently ignore
        }
      }
    }, 5000);

    return () => {
      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current);
      }
    };
  }, [currentVideo, isPlaying]);

  // ── Sync volume to element ──────────────────────────────────────────
  useEffect(() => {
    const el = videoRef.current;
    if (el) {
      el.volume = volume;
    }
    lsSet(STORAGE_KEYS.volume, volume);
  }, [volume]);

  // ── Sync muted to element ───────────────────────────────────────────
  useEffect(() => {
    const el = videoRef.current;
    if (el) {
      el.muted = isMuted;
    }
  }, [isMuted]);

  // ── Sync speed to element ───────────────────────────────────────────
  useEffect(() => {
    const el = videoRef.current;
    if (el) {
      el.playbackRate = playbackSpeed;
    }
    lsSet(STORAGE_KEYS.speed, playbackSpeed);
  }, [playbackSpeed]);

  // ── Sync brightness ─────────────────────────────────────────────────
  useEffect(() => {
    lsSet(STORAGE_KEYS.brightness, brightness);
  }, [brightness]);

  // ── Persist aspect ratio ────────────────────────────────────────────
  useEffect(() => {
    lsSet(STORAGE_KEYS.aspect, aspectRatio);
  }, [aspectRatio]);

  // ── Persist repeat mode ─────────────────────────────────────────────
  useEffect(() => {
    lsSet(STORAGE_KEYS.repeat, repeatMode);
  }, [repeatMode]);

  // ── Fullscreen change listener ──────────────────────────────────────
  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
    };
  }, []);

  // ── PiP events ──────────────────────────────────────────────────────
  useEffect(() => {
    const onEnterPip = () => setPipMode(true);
    const onLeavePip = () => setPipMode(false);

    const el = videoRef.current;
    if (el) {
      el.addEventListener('enterpictureinpicture', onEnterPip);
      el.addEventListener('leavepictureinpicture', onLeavePip);
    }
    return () => {
      if (el) {
        el.removeEventListener('enterpictureinpicture', onEnterPip);
        el.removeEventListener('leavepictureinpicture', onLeavePip);
      }
    };
  }, [currentVideo]);

  // ── Save position on unmount ────────────────────────────────────────
  useEffect(() => {
    return () => {
      const el = videoRef.current;
      if (!el || !currentVideo) return;
      try {
        const history = readHistory();
        history[currentVideo.id] = {
          position: el.currentTime,
          updatedAt: Date.now(),
        };
        writeHistory(history);
      } catch {
        // silently ignore storage errors
      }
    };
  }, [currentVideo]);

  // ── Controls ────────────────────────────────────────────────────────
  const play = useCallback(() => {
    const el = videoRef.current;
    if (el) {
      el.play().catch(() => {
        // autoplay may be blocked
      });
    }
  }, []);

  const pause = useCallback(() => {
    const el = videoRef.current;
    if (el) {
      el.pause();
    }
  }, []);

  const seek = useCallback((seconds: number) => {
    const el = videoRef.current;
    if (el) {
      el.currentTime = Math.max(0, Math.min(seconds, el.duration || 0));
    }
    resetHideTimer();
  }, [resetHideTimer]);

  const skip = useCallback(
    (seconds: number) => {
      const el = videoRef.current;
      if (el) {
        el.currentTime = Math.max(
          0,
          Math.min(el.currentTime + seconds, el.duration || 0)
        );
      }
      resetHideTimer();
    },
    [resetHideTimer]
  );

  const setVolume = useCallback((vol: number) => {
    const clamped = Math.max(0, Math.min(1, vol));
    setVolumeState(clamped);
    if (clamped > 0) {
      setIsMuted(false);
    }
  }, []);

  const setSpeed = useCallback((rate: number) => {
    setPlaybackSpeedState(rate);
  }, []);

  const setAspectRatio = useCallback((ratio: AspectRatio) => {
    setAspectRatioState(ratio);
  }, []);

  const toggleLock = useCallback(() => {
    setIsLocked((prev) => !prev);
  }, []);

  const togglePip = useCallback(async () => {
    const el = videoRef.current;
    if (!el) return;
    try {
      if (isNativePlatform()) {
        const w = window as unknown as {
          Capacitor?: {
            Plugins?: {
              PictureInPicture?: { enter: () => Promise<void>; exit: () => Promise<void> }
            }
          }
        };
        const pipPlugin = w.Capacitor?.Plugins?.PictureInPicture;
        if (pipMode && pipPlugin) {
          await pipPlugin.exit();
        } else if (pipPlugin) {
          await pipPlugin.enter();
        }
      } else {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        } else {
          await el.requestPictureInPicture();
        }
      }
    } catch {
      // PiP not supported or blocked
    }
    resetHideTimer();
  }, [resetHideTimer, pipMode]);

  const loadSubtitle = useCallback(async (file: File): Promise<void> => {
    try {
      const text = await file.text();
      const ext = file.name.split('.').pop()?.toLowerCase() || 'srt';
      const format: 'srt' | 'ass' = ext === 'ass' || ext === 'ssa' ? 'ass' : 'srt';
      const cues = parseSubtitle(text, format);
      setSubtitleTrack(cues);
    } catch {
      setSubtitleTrack(null);
    }
  }, []);

  const setAudioTrack = useCallback((index: number) => {
    const el = videoRef.current;
    if (!el) return;

    const audioTracks = (el as HTMLVideoElement & { audioTracks?: { length: number; [i: number]: { enabled: boolean } } }).audioTracks;
    if (audioTracks && audioTracks.length > 0) {
      for (let i = 0; i < audioTracks.length; i++) {
        audioTracks[i].enabled = i === index;
      }
    }
    setAudioTrackState(index);
  }, []);

  const setBrightness = useCallback((val: number) => {
    setBrightnessState(Math.max(0, Math.min(1, val)));
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const el = videoRef.current;
    if (!el) return;

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        const container = el.parentElement || el;
        await container.requestFullscreen();
      }
    } catch {
      // fullscreen not supported
    }
    resetHideTimer();
  }, [resetHideTimer]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  // ── Helper: convert file path for Video src ──────────────────────
  const getVideoSrc = useCallback((videoPath: string): string => {
    if (isNativePlatform()) {
      try {
        return Capacitor.convertFileSrc(videoPath);
      } catch {
        return videoPath;
      }
    }
    return videoPath;
  }, []);

  const loadVideo = useCallback(
    (video: VideoFile) => {
      const el = videoRef.current;

      // Save current video position before switching
      if (el && currentVideo) {
        try {
          const history = readHistory();
          history[currentVideo.id] = {
            position: el.currentTime,
            updatedAt: Date.now(),
          };
          writeHistory(history);
        } catch {
          // silently ignore
        }
      }

      setCurrentVideo(video);
      setCurrentTime(0);
      setDuration(0);
      setSubtitleTrack(null);
      setAudioTrackState(0);
      setResumePosition(null);

      if (el) {
        const src = getVideoSrc(video.url || video.path);
        el.src = src;
        el.load();
      }

      // Check for saved position (resume logic)
      try {
        const history = readHistory();
        const entry = history[video.id];
        if (entry && entry.position > 5) {
          setResumePosition(entry.position);
        }
      } catch {
        // silently ignore
      }

      resetHideTimer();
    },
    [currentVideo, resetHideTimer, getVideoSrc]
  );

  const cycleRepeat = useCallback(() => {
    setRepeatModeState((prev) => {
      if (prev === 'off') return 'one';
      return 'off';
    });
  }, []);

  return {
    // Ref
    videoRef,

    // State
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

    // Functions
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

    // Utility
    formatDuration,
  };
}

// ══════════════════════════════════════════════════════════════
// EXPORT TYPE FOR PROPS PASSING
// ══════════════════════════════════════════════════════════════

export type VideoPlayerState = ReturnType<typeof useVideoPlayer>;
