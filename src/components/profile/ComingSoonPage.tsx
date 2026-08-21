// src/components/profile/ComingSoonPage.tsx
// ============================================================================
// Reusable "coming soon" page shell used by the Profile sub-routes that
// don't have full implementations yet (downloads, history, favorites,
// playlists, games) and by /help. Provides a consistent back button,
// title, icon, message, and CTA back to home — so taps from Profile
// land on a real page instead of 404.
// ============================================================================

'use client';

import { useRouter } from 'next/navigation';
import { ReactNode } from 'react';
import { LucideIcon, ChevronLeft } from 'lucide-react';

interface ComingSoonPageProps {
  title: string;
  Icon: LucideIcon;
  message: string;
  ctaLabel?: string;
  ctaRoute?: string;
  extra?: ReactNode;
}

export default function ComingSoonPage({
  title,
  Icon,
  message,
  ctaLabel = 'Back to Profile',
  ctaRoute = '/profile',
  extra,
}: ComingSoonPageProps) {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#0D0D0D] pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-[#1A1A2E] sticky top-0 z-40 bg-[#0D0D0D]">
        <button
          onClick={() => router.back()}
          aria-label="Back"
          className="w-10 h-10 flex items-center justify-center text-white active:opacity-60 transition-opacity duration-150"
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-white font-bold text-lg">{title}</h1>
      </div>

      {/* Body */}
      <div className="px-6 mt-12 flex flex-col items-center text-center">
        <div className="w-20 h-20 rounded-full bg-[#1A1A2E] border border-[#2D2D44] flex items-center justify-center mx-auto mb-6">
          <Icon size={32} className="text-[#A78BFA]" strokeWidth={1.5} />
        </div>
        <h2 className="text-white font-bold text-xl mb-3">Feature Coming Soon</h2>
        <p className="text-[#9CA3AF] text-sm max-w-xs leading-relaxed mb-10">
          {message}
        </p>

        {extra}

        <button
          onClick={() => router.push(ctaRoute)}
          className="h-12 px-8 rounded-xl bg-[#7C3AED] text-white font-semibold text-sm active:opacity-65 transition-opacity duration-150 min-w-[200px]"
        >
          {ctaLabel}
        </button>
      </div>
    </div>
  );
}
