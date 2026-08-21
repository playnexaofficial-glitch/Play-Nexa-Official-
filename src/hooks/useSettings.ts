'use client';

import { useState, useCallback } from 'react';

type ThemeMode = 'dark' | 'amoled' | 'neon';

interface Settings {
  theme: ThemeMode;
  smoothMode: boolean;
  batterySaver: boolean;
  liteAnimation: boolean;
  performanceBoost: boolean;
  lowDataMode: boolean;
  smartLoading: boolean;
  thumbnailQuality: 'low' | 'medium' | 'high';
  safeRedirect: boolean;
  externalWarning: boolean;
  secureBrowser: boolean;
}

const SETTINGS_KEY = 'pn_settings';
const LEGACY_KEY   = 'grovix_settings';

const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  smoothMode: true,
  batterySaver: false,
  liteAnimation: false,
  performanceBoost: false,
  lowDataMode: false,
  smartLoading: true,
  thumbnailQuality: 'medium',
  safeRedirect: true,
  externalWarning: true,
  secureBrowser: false,
};

function migrateKey(): void {
  try {
    if (!localStorage.getItem(SETTINGS_KEY)) {
      const legacy = localStorage.getItem(LEGACY_KEY);
      if (legacy) {
        localStorage.setItem(SETTINGS_KEY, legacy);
        localStorage.removeItem(LEGACY_KEY);
      }
    }
  } catch {
    // Silent
  }
}

function loadSettings(): Settings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    migrateKey();
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch {
    // Use defaults
  }
  return DEFAULT_SETTINGS;
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const loaded = typeof window !== 'undefined';

  const updateSetting = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings(prev => {
      const next = { ...prev, [key]: value };
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
      } catch {
        // localStorage full, ignore
      }
      return next;
    });
  }, []);

  const updateMultiple = useCallback((updates: Partial<Settings>) => {
    setSettings(prev => {
      const next = { ...prev, ...updates };
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
    } catch {
      // ignore
    }
  }, []);

  return {
    settings,
    loaded,
    updateSetting,
    updateMultiple,
    resetSettings,
  };
}
