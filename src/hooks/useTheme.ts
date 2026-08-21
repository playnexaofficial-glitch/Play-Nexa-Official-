'use client';

import { useState, useCallback } from 'react';

const THEME_KEY  = 'pn_theme';
const LEGACY_KEY = 'grovix_theme';

function migrateThemeKey(): void {
  try {
    if (!localStorage.getItem(THEME_KEY)) {
      const legacy = localStorage.getItem(LEGACY_KEY);
      if (legacy) {
        localStorage.setItem(THEME_KEY, legacy);
        localStorage.removeItem(LEGACY_KEY);
      }
    }
  } catch {
    // Silent
  }
}

export function useTheme() {
  const [theme, setTheme] = useState<'dark' | 'amoled' | 'neon'>(() => {
    if (typeof window !== 'undefined') {
      migrateThemeKey();
      return (localStorage.getItem(THEME_KEY) as 'dark' | 'amoled' | 'neon') || 'dark';
    }
    return 'dark';
  });

  const changeTheme = useCallback((newTheme: 'dark' | 'amoled' | 'neon') => {
    setTheme(newTheme);
    localStorage.setItem(THEME_KEY, newTheme);
  }, []);

  return { theme, changeTheme };
}
