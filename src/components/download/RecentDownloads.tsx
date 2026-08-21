'use client';

import { FileAudio, FileVideo, ChevronRight } from 'lucide-react';

interface RecentDownload {
  id: string;
  name: string;
  platform: string;
  url: string;
  timestamp: number;
  size?: string;
}

interface RecentDownloadsProps {
  items: RecentDownload[];
  onRedownload: (url: string) => void;
}

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function isAudioFile(name: string): boolean {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  return ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a'].includes(ext);
}

export default function RecentDownloads({ items, onRedownload }: RecentDownloadsProps) {
  const recentItems = items.slice(0, 5);

  if (recentItems.length === 0) return null;

  return (
    <div>
      <h3 className="text-white font-semibold text-base mb-3">
        📁 Recent
      </h3>
      <div className="space-y-2">
        {recentItems.map((item) => {
          const audio = isAudioFile(item.name);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onRedownload(item.url)}
              className="
                w-full flex items-center gap-3
                bg-pn-card rounded-xl p-3
                transition-colors duration-200
                hover:bg-pn-secondary
                text-left
                min-h-[56px]
              "
            >
              {/* File icon */}
              <span className="text-pn-purple shrink-0">
                {audio ? (
                  <FileAudio className="w-5 h-5" />
                ) : (
                  <FileVideo className="w-5 h-5" />
                )}
              </span>

              {/* Name + time */}
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm truncate">{item.name}</p>
                <p className="text-pn-muted text-xs">
                  {timeAgo(item.timestamp)}
                  {item.size && ` · ${item.size}`}
                </p>
              </div>

              {/* Platform badge + chevron */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-pn-muted text-[10px] font-medium bg-pn-secondary rounded-full px-2 py-0.5 uppercase tracking-wide">
                  {item.platform}
                </span>
                <ChevronRight className="w-4 h-4 text-pn-muted" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
