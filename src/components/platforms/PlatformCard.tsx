'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

interface PlatformCardProps {
  id: string;
  name: string;
  color: string;
  tagline: string;
  icon: string;
}

export default function PlatformCard({
  id,
  name,
  color,
  tagline,
  icon,
}: PlatformCardProps) {
  return (
    <Link
      href={`/platforms/${id}`}
      className="block active:scale-[0.97] transition-transform duration-150"
    >
      <article className="bg-pn-card border border-pn-border rounded-2xl p-4 flex flex-col gap-3">
        <div className="flex items-center gap-2.5">
          <span
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: color }}
            aria-hidden="true"
          />
          <h3 className="text-white font-semibold text-sm truncate">{name}</h3>
        </div>

        <p className="text-pn-muted text-xs leading-relaxed">{tagline}</p>

        <div className="mt-auto">
          <span className="inline-flex items-center justify-center gap-1.5 border border-pn-purple text-pn-purple rounded-xl h-10 px-4 text-sm font-medium transition-colors duration-150 hover:bg-pn-purple/10">
            Open <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </article>
    </Link>
  );
}
