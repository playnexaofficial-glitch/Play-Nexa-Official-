'use client';

import { ExternalLink } from 'lucide-react';

interface PlatformHeaderProps {
  name: string;
  color: string;
  tagline: string;
  icon: string;
  url?: string;
  collections?: string[];
}

export default function PlatformHeader({
  name,
  color,
  tagline,
  icon,
  url,
  collections,
}: PlatformHeaderProps) {
  const handleOpen = () => {
    if (url) {
      window.open(url, '_blank');
    }
  };

  return (
    <header className="bg-pn-card border border-pn-border rounded-2xl p-6">
      <div className="flex items-start gap-4">
        {/* Colored circle with icon initial */}
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${color}20` }}
        >
          <span
            className="text-xl font-bold"
            style={{ color }}
          >
            {icon.charAt(0).toUpperCase()}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <h1 className="text-white font-bold text-xl">{name}</h1>
          <p className="text-pn-muted text-sm mt-0.5">{tagline}</p>
        </div>
      </div>

      {/* Collections list */}
      {collections && collections.length > 0 && (
        <ul className="mt-4 space-y-1">
          {collections.map((collection) => (
            <li
              key={collection}
              className="text-pn-muted text-sm flex items-center gap-2"
            >
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
              {collection}
            </li>
          ))}
        </ul>
      )}

      {/* Open button */}
      <button
        onClick={handleOpen}
        className="mt-5 w-full bg-pn-purple text-white rounded-xl h-12 text-base font-semibold flex items-center justify-center gap-2 active:scale-[0.97] transition-transform duration-150 hover:bg-pn-purple/90"
        aria-label={`Open ${name}`}
      >
        Open {name} <ExternalLink className="w-4 h-4" />
      </button>
    </header>
  );
}
