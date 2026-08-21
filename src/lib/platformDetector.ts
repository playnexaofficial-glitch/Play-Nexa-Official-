type PlatformKey = 'youtube' | 'vimeo' | 'facebook' | 'instagram' | 'tiktok' | 'twitter' | 'soundcloud';

interface PlatformInfo {
  key: PlatformKey | null;
  name: string | null;
  color: string;
  icon: string;
}

const PLATFORM_RULES: Array<{
  key: PlatformKey;
  patterns: string[];
  name: string;
  color: string;
  icon: string;
}> = [
  {
    key: 'youtube',
    patterns: ['youtube.com', 'youtu.be', 'm.youtube.com'],
    name: 'YouTube',
    color: '#FF0000',
    icon: 'Youtube',
  },
  {
    key: 'facebook',
    patterns: ['facebook.com', 'fb.watch', 'fb.com'],
    name: 'Facebook',
    color: '#1877F2',
    icon: 'Facebook',
  },
  {
    key: 'instagram',
    patterns: ['instagram.com', 'instagr.am'],
    name: 'Instagram',
    color: '#E4405F',
    icon: 'Instagram',
  },
  {
    key: 'tiktok',
    patterns: ['tiktok.com', 'vm.tiktok.com'],
    name: 'TikTok',
    color: '#000000',
    icon: 'Music',
  },
  {
    key: 'twitter',
    patterns: ['twitter.com', 'x.com'],
    name: 'Twitter/X',
    color: '#1DA1F2',
    icon: 'Twitter',
  },
  {
    key: 'vimeo',
    patterns: ['vimeo.com'],
    name: 'Vimeo',
    color: '#1AB7EA',
    icon: 'Video',
  },
  {
    key: 'soundcloud',
    patterns: ['soundcloud.com'],
    name: 'SoundCloud',
    color: '#FF5500',
    icon: 'Music',
  },
];

export function detectPlatform(url: string): PlatformInfo {
  if (!url || typeof url !== 'string') {
    return { key: null, name: null, color: '#94A3B8', icon: 'Link' };
  }

  const normalizedUrl = url.toLowerCase().trim();

  for (const rule of PLATFORM_RULES) {
    for (const pattern of rule.patterns) {
      if (normalizedUrl.includes(pattern)) {
        return {
          key: rule.key,
          name: rule.name,
          color: rule.color,
          icon: rule.icon,
        };
      }
    }
  }

  return { key: null, name: null, color: '#94A3B8', icon: 'Link' };
}

export function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /(?:m\.youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
