'use client';

import { X } from 'lucide-react';

interface UrlInputProps {
  value: string;
  onChange: (url: string) => void;
  mode: 'video' | 'audio';
  onModeChange: (mode: 'video' | 'audio') => void;
}

export default function UrlInput({ value, onChange, mode, onModeChange }: UrlInputProps) {
  return (
    <div className="w-full">
      {/* URL Input */}
      <div className="relative">
        <input
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="🔗 Paste YouTube, TikTok, Instagram URL..."
          className="
            w-full h-14 px-4 pr-12
            bg-pn-card
            border border-pn-border
            rounded-2xl
            text-white text-sm
            placeholder:text-pn-muted
            outline-none
            transition-colors duration-200
            focus:border-pn-purple
          "
        />
        {value.length > 0 && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="
              absolute right-1 top-1/2 -translate-y-1/2
              flex items-center justify-center
              w-10 h-10
              text-pn-muted hover:text-white
              transition-colors duration-200
              rounded-xl
            "
            aria-label="Clear URL input"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Mode Toggle Pills */}
      <div className="flex gap-2 mt-3">
        <button
          type="button"
          onClick={() => onModeChange('video')}
          className={`
            rounded-full px-4 py-2 text-xs font-medium
            transition-colors duration-200
            min-h-[44px] inline-flex items-center gap-1.5
            ${
              mode === 'video'
                ? 'bg-pn-purple text-white'
                : 'bg-pn-card text-pn-muted border border-pn-border hover:text-white'
            }
          `}
          aria-pressed={mode === 'video'}
        >
          🎬 Video
        </button>
        <button
          type="button"
          onClick={() => onModeChange('audio')}
          className={`
            rounded-full px-4 py-2 text-xs font-medium
            transition-colors duration-200
            min-h-[44px] inline-flex items-center gap-1.5
            ${
              mode === 'audio'
                ? 'bg-pn-purple text-white'
                : 'bg-pn-card text-pn-muted border border-pn-border hover:text-white'
            }
          `}
          aria-pressed={mode === 'audio'}
        >
          🎵 Audio
        </button>
      </div>
    </div>
  );
}
