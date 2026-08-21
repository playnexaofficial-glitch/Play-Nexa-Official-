'use client';

import { useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AlertCircle, ArrowRight } from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import PlatformHeader from '@/components/platforms/PlatformHeader';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import platformsData from '@/data/platforms.json';

/* ------------------------------------------------------------------ */
/*  UPGRADED PLATFORM DETAIL PAGE                                     */
/*  Platform header with color gradient + collections grid            */
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

export default function PlatformDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);

  const platformId = params.id as string;
  const platform = typedPlatformsData.find((p) => p.id === platformId);

  const handleOpenPlatform = useCallback(() => {
    if (platform?.url) {
      setPendingUrl(platform.url);
      setConfirmOpen(true);
    }
  }, [platform]);

  const handleCollectionClick = useCallback(() => {
    if (platform?.url) {
      setPendingUrl(platform.url);
      setConfirmOpen(true);
    }
  }, [platform]);

  const handleConfirm = useCallback(() => {
    if (pendingUrl) {
      window.open(pendingUrl, '_blank');
    }
    setConfirmOpen(false);
    setPendingUrl(null);
  }, [pendingUrl]);

  const handleClose = useCallback(() => {
    setConfirmOpen(false);
    setPendingUrl(null);
  }, []);

  /* ---- Not found ---- */
  if (!platform) {
    return (
      <div className="min-h-screen bg-pn-bg pb-24">
        <TopBar title="Platform" showBack />
        <EmptyState
          icon={AlertCircle}
          title="Platform Not Found"
          description="The platform you are looking for does not exist or has been removed."
          action={{ label: 'Go Back', onClick: () => router.back() }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-pn-bg pb-24">
      <TopBar title={platform.name} showBack />

      <div className="px-4 pt-4 space-y-5">
        {/* ---- Platform Header with color gradient ---- */}
        <header className="rounded-2xl p-6 bg-gradient-to-br border border-pn-border"
          style={{
            backgroundImage: `linear-gradient(to bottom right, ${platform.color}20, #111827)`,
          }}
        >
          {/* Logo circle + name + tagline */}
          <div className="flex items-start gap-4">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${platform.color}30` }}
            >
              <span
                className="text-xl font-bold"
                style={{ color: platform.color }}
              >
                {platform.icon.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-white font-bold text-xl">{platform.name}</h1>
              <p className="text-pn-muted text-sm mt-0.5">{platform.tagline}</p>
            </div>
          </div>

          {/* Visit platform button */}
          <button
            onClick={handleOpenPlatform}
            className="mt-5 w-full bg-pn-purple text-white rounded-xl h-12 text-base font-semibold flex items-center justify-center gap-2 transition-colors duration-150 hover:bg-pn-purple/90 active:scale-[0.97]"
            type="button"
            aria-label={`Visit ${platform.name}`}
          >
            Visit {platform.name}
            <ArrowRight className="w-4 h-4" />
          </button>
        </header>

        {/* ---- Collections grid ---- */}
        {platform.collections && platform.collections.length > 0 && (
          <section>
            <h2 className="text-white font-semibold text-base mb-3">
              Collections
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {platform.collections.map((collection) => (
                <button
                  key={collection}
                  onClick={handleCollectionClick}
                  className="text-left active:scale-[0.97] transition-transform duration-150"
                  type="button"
                  aria-label={`Browse ${collection} on ${platform.name}`}
                >
                  <div className="bg-pn-card border border-pn-border rounded-xl p-4 flex flex-col gap-2 h-full">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: platform.color }}
                        aria-hidden="true"
                      />
                      <span className="text-white text-sm font-medium line-clamp-1">
                        {collection}
                      </span>
                    </div>
                    <span className="text-pn-purple text-xs font-medium flex items-center gap-1">
                      Browse
                      <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* ---- Confirm Modal ---- */}
      <ConfirmModal
        isOpen={confirmOpen}
        onClose={handleClose}
        onConfirm={handleConfirm}
        title="Leaving Play Nexa"
        message={`You are about to open ${platform.name}. Play Nexa is not responsible for external content. Continue?`}
      />
    </div>
  );
}
