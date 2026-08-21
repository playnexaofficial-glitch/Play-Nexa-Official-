import downloadersData from '@/data/downloaders.json';

interface Downloader {
  id: string;
  name: string;
  baseUrl: string;
  supports: string[];
}

const downloaders: Downloader[] = downloadersData as Downloader[];

export function getSourceForPlatform(platformKey: string): Downloader | null {
  const source = downloaders.find(d => d.supports.includes(platformKey));
  return source || null;
}

export function getAllSourcesForPlatform(platformKey: string): Downloader[] {
  return downloaders.filter(d => d.supports.includes(platformKey));
}

export function buildDownloadUrl(source: Downloader, userUrl: string): string {
  const videoId = extractVideoIdFromUrl(userUrl);
  if (videoId && source.id === 's3') {
    return `${source.baseUrl}${videoId}`;
  }
  if (videoId && source.id === 's4') {
    return `${source.baseUrl}${videoId}`;
  }
  return `${source.baseUrl}${encodeURIComponent(userUrl)}`;
}

function extractVideoIdFromUrl(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) return match[1];
  }
  return null;
}

export function rotateSource(
  platformKey: string,
  failedSourceIds: string[] = []
): Downloader | null {
  const sources = getAllSourcesForPlatform(platformKey);
  const available = sources.filter(s => !failedSourceIds.includes(s.id));
  return available.length > 0 ? available[0] : null;
}
