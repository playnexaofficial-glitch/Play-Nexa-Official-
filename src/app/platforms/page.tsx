'use client';

import { useState, useCallback } from 'react';
import { Play, ArrowRight } from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import PlatformCard from '@/components/platforms/PlatformCard';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import platformsData from '@/data/platforms.json';

/* ------------------------------------------------------------------ */
/*  UPGRADED PLATFORMS PAGE                                           */
/*  Featured YouTube Movies banner + 2-column platform grid           */
/*  ConfirmModal before any external open                             */
/* ------------------------------------------------------------------ */

interface Platform {
  id: string;
  name: string;
  color: string;
  url: string;
  tagline: string;
  icon: string;
  collections: string[];
}

const typedPlatformsData = platformsData as Platform[];

export default function PlatformsPage() {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const [pendingName, setPendingName] = useState<string>('');

  const handlePlatformClick = useCallback((url: string, name: string = '') => {
    setPendingUrl(url);
    setPendingName(name);
    setConfirmOpen(true);
  }, []);

  const handleConfirm = useCallback(() => {
    if (pendingUrl) {
      window.open(pendingUrl, '_blank');
    }
    setConfirmOpen(false);
    setPendingUrl(null);
    setPendingName('');
  }, [pendingUrl]);

  const handleClose = useCallback(() => {
    setConfirmOpen(false);
    setPendingUrl(null);
    setPendingName('');
  }, []);

  return (
    <div className="min-h-screen bg-pn-bg pb-24">
      <TopBar title="Streaming Platforms" showBack />

      <div className="px-4 pt-4 space-y-5">
        {/* ---- Featured YouTube Movies Banner ---- */}
        <button
          onClick={() =>
            handlePlatformClick(
              'https://youtube.com/feed/storefront',
              'YouTube Movies'
            )
          }
          className="w-full text-left active:scale-[0.98] transition-transform duration-150"
          type="button"
          aria-label="Open YouTube Movies"
        >
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#FF0000] to-[#CC0000] p-6">
            {/* Decorative circles */}
            <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/5" />
            <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-white/5" />

            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-3">
                <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/20">
                  <Play className="w-5 h-5 text-white fill-white" />
                </span>
                <span className="text-2xl" aria-hidden="true">
                  🎬
                </span>
                <h2 className="text-white font-bold text-lg">YouTube Movies</h2>
              </div>

              <p className="text-white/80 text-sm mb-4 leading-relaxed">
                Free Full Movies — Watch Now
              </p>

              <div className="inline-flex items-center gap-2 bg-white text-[#CC0000] font-semibold text-sm rounded-xl h-11 px-5 transition-colors duration-150 hover:bg-white/90">
                Open YouTube Movies
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </div>
        </button>

        {/* ---- Description ---- */}
        <p className="text-pn-muted text-sm">
          Browse your favorite streaming platforms. Tap any platform to open.
        </p>

        {/* ---- 2-column platform grid ---- */}
        <div className="grid grid-cols-2 gap-3">
          {typedPlatformsData.map((platform) => (
            <div
              key={platform.id}
              onClick={() => handlePlatformClick(platform.url, platform.name)}
              className="active:scale-[0.97] transition-transform duration-150"
              role="button"
              tabIndex={0}
              aria-label={`Open ${platform.name}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handlePlatformClick(platform.url, platform.name);
                }
              }}
            >
              <PlatformCard
                id={platform.id}
                name={platform.name}
                color={platform.color}
                tagline={platform.tagline}
                icon={platform.icon}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ---- Confirm Modal ---- */}
      <ConfirmModal
        isOpen={confirmOpen}
        onClose={handleClose}
        onConfirm={handleConfirm}
        title="Leaving Play Nexa"
        message={
          pendingName
            ? `You are about to open ${pendingName}. Play Nexa is not responsible for external content. Continue?`
            : 'You are about to open an external streaming platform. Play Nexa is not responsible for external content. Continue?'
        }
      />
    </div>
  );
}
