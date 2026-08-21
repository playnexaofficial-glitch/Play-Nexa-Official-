'use client';

import Link from 'next/link';
import { Download, Film, Gamepad2, Music, Play, Smartphone } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface QuickAccessCard {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  href: string;
}

const cards: QuickAccessCard[] = [
  { icon: Film, title: 'Movie Hub', subtitle: 'Watch Free Movies', href: '/movies' },
  { icon: Music, title: 'YT Music', subtitle: 'Online Streaming', href: '/ytmusic' },
  { icon: Gamepad2, title: 'Offline Games', subtitle: 'Play Anytime', href: '/games' },
  { icon: Download, title: 'Smart Download', subtitle: 'Videos & Audio', href: '/download' },
  { icon: Play, title: 'Video Player', subtitle: 'Custom Player', href: '/video' },
  { icon: Smartphone, title: 'Platforms', subtitle: 'Streaming Hub', href: '/platforms' },
];

export default function QuickAccessGrid() {
  return (
    <section className="px-4">
      <div className="grid grid-cols-2 gap-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.href}
              href={card.href}
              className="flex flex-col gap-2 rounded-2xl border border-pn-border bg-pn-card p-4 shadow-[0_0_20px_rgba(124,58,237,0.1)] active:scale-[0.97] transition-transform duration-150"
            >
              <Icon className="h-7 w-7 text-pn-purple" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold text-white">{card.title}</p>
                <p className="text-xs text-pn-muted">{card.subtitle}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
