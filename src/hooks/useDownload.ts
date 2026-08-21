'use client';

import { useState, useCallback, useRef } from 'react';
import { detectPlatform, isValidUrl } from '@/lib/platformDetector';
import { getSourceForPlatform, buildDownloadUrl, rotateSource } from '@/lib/sourceRotator';
import { saveDownload, getRecentDownloads } from '@/lib/db';

interface PlatformInfo {
  key: string | null;
  name: string | null;
  color: string;
  icon: string;
}

interface DownloadState {
  url: string;
  platform: PlatformInfo;
  status: 'idle' | 'detecting' | 'connecting' | 'redirecting' | 'fallback' | 'done' | 'error';
  currentSource: string | null;
  failedSources: string[];
  error: string | null;
}

interface RecentDownload {
  id: string;
  name: string;
  platform: string;
  url: string;
  timestamp: number;
  size?: string;
}

const EMPTY_PLATFORM: PlatformInfo = { key: null, name: null, color: '#94A3B8', icon: 'Link' };

export function useDownload() {
  const [state, setState] = useState<DownloadState>({
    url: '',
    platform: EMPTY_PLATFORM,
    status: 'idle',
    currentSource: null,
    failedSources: [],
    error: null,
  });

  const [recentDownloads, setRecentDownloads] = useState<RecentDownload[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const loadRecentDownloads = useCallback(async () => {
    try {
      const records = await getRecentDownloads(5);
      setRecentDownloads(records);
    } catch {
      setRecentDownloads([]);
    }
  }, []);

  const setUrl = useCallback((url: string) => {
    const platform = url ? detectPlatform(url) : EMPTY_PLATFORM;
    setState(prev => ({
      ...prev,
      url,
      platform,
      status: 'idle',
      error: null,
    }));
  }, []);

  const startDownload = useCallback(async (url?: string) => {
    const downloadUrl = url || state.url;
    if (!downloadUrl || !isValidUrl(downloadUrl)) {
      setState(prev => ({ ...prev, error: 'Please enter a valid URL', status: 'error' }));
      return;
    }

    const platform = detectPlatform(downloadUrl);
    if (!platform.key) {
      setState(prev => ({
        ...prev,
        platform,
        error: 'Platform not supported',
        status: 'error',
      }));
      return;
    }

    const source = getSourceForPlatform(platform.key);
    if (!source) {
      setState(prev => ({
        ...prev,
        platform,
        error: 'No download source available',
        status: 'error',
      }));
      return;
    }

    setState(prev => ({
      ...prev,
      platform,
      status: 'connecting',
      currentSource: source.name,
      failedSources: [],
      error: null,
    }));

    try {
      const redirectUrl = buildDownloadUrl(source, downloadUrl);

      await saveDownload({
        id: Date.now().toString(),
        name: `Download from ${platform.name}`,
        platform: platform.name || 'Unknown',
        url: downloadUrl,
        timestamp: Date.now(),
      });

      setState(prev => ({ ...prev, status: 'redirecting' }));

      timeoutRef.current = setTimeout(() => {
        setState(prev => ({
          ...prev,
          status: 'fallback',
          failedSources: [...prev.failedSources, source.id],
        }));

        const nextSource = rotateSource(platform.key!, [source.id]);
        if (nextSource) {
          const fallbackUrl = buildDownloadUrl(nextSource, downloadUrl);
          setState(prev => ({
            ...prev,
            status: 'redirecting',
            currentSource: nextSource.name,
          }));

          window.open(fallbackUrl, '_blank', 'noopener');
          setState(prev => ({ ...prev, status: 'done' }));
        } else {
          setState(prev => ({
            ...prev,
            status: 'error',
            error: 'All sources failed. Please try again.',
          }));
        }
      }, 3000);

      window.open(redirectUrl, '_blank', 'noopener');
      loadRecentDownloads();
    } catch {
      setState(prev => ({
        ...prev,
        status: 'error',
        error: 'Download failed. Please try again.',
      }));
    }
  }, [state.url, loadRecentDownloads]);

  const cancelDownload = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setState(prev => ({ ...prev, status: 'idle', error: null }));
  }, []);

  const reset = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setState({
      url: '',
      platform: EMPTY_PLATFORM,
      status: 'idle',
      currentSource: null,
      failedSources: [],
      error: null,
    });
  }, []);

  return {
    ...state,
    recentDownloads,
    setUrl,
    startDownload,
    cancelDownload,
    reset,
    loadRecentDownloads,
  };
}
