'use client';

import { useState, useCallback, useRef } from 'react';

interface PlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playbackRate: number;
  isFullscreen: boolean;
  isMuted: boolean;
}

export function usePlayer() {
  const [state, setState] = useState<PlayerState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    playbackRate: 1,
    isFullscreen: false,
    isMuted: false,
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);

  const togglePlay = useCallback(() => {
    setState(prev => ({ ...prev, isPlaying: !prev.isPlaying }));
  }, []);

  const seek = useCallback((time: number) => {
    setState(prev => ({ ...prev, currentTime: time }));
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  }, []);

  const setVolume = useCallback((volume: number) => {
    setState(prev => ({ ...prev, volume, isMuted: volume === 0 }));
    if (videoRef.current) {
      videoRef.current.volume = volume;
    }
  }, []);

  const setPlaybackRate = useCallback((rate: number) => {
    setState(prev => ({ ...prev, playbackRate: rate }));
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
  }, []);

  const toggleMute = useCallback(() => {
    setState(prev => {
      const newMuted = !prev.isMuted;
      if (videoRef.current) {
        videoRef.current.muted = newMuted;
      }
      return { ...prev, isMuted: newMuted };
    });
  }, []);

  const skip = useCallback((seconds: number) => {
    setState(prev => {
      const newTime = Math.max(0, Math.min(prev.duration, prev.currentTime + seconds));
      if (videoRef.current) {
        videoRef.current.currentTime = newTime;
      }
      return { ...prev, currentTime: newTime };
    });
  }, []);

  const setDuration = useCallback((duration: number) => {
    setState(prev => ({ ...prev, duration }));
  }, []);

  const setCurrentTime = useCallback((currentTime: number) => {
    setState(prev => ({ ...prev, currentTime }));
  }, []);

  return {
    ...state,
    videoRef,
    togglePlay,
    seek,
    setVolume,
    setPlaybackRate,
    toggleMute,
    skip,
    setDuration,
    setCurrentTime,
  };
}
