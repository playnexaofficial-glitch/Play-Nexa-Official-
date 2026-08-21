'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Search, Settings } from 'lucide-react';

interface TopBarProps {
  title: string;
  showBack?: boolean;
  showSearch?: boolean;
  showSettings?: boolean;
  onSearchClick?: () => void;
  onSettingsClick?: () => void;
}

export default function TopBar({
  title,
  showBack = false,
  showSearch = false,
  showSettings = false,
  onSearchClick,
  onSettingsClick,
}: TopBarProps) {
  const router = useRouter();

  return (
    <header
      className="sticky top-0 z-[100] flex h-14 items-center justify-between border-b border-pn-border bg-pn-bg px-4"
      role="banner"
    >
      {/* Left side */}
      <div className="flex min-w-[88px] items-center">
        {showBack ? (
          <button
            onClick={() => router.back()}
            className="flex h-10 w-10 items-center justify-center text-pn-muted transition-colors duration-150 hover:text-white active:scale-90"
            aria-label="Go back"
            type="button"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        ) : (
          <span className="text-xl font-bold text-pn-purple select-none">
            Play Nexa
          </span>
        )}
      </div>

      {/* Center */}
      <h1 className="flex-1 truncate text-center text-base font-semibold text-white">
        {title}
      </h1>

      {/* Right side */}
      <div className="flex min-w-[88px] items-center justify-end gap-1">
        {showSearch && (
          <button
            onClick={onSearchClick}
            className="flex h-10 w-10 items-center justify-center text-pn-muted transition-colors duration-150 hover:text-white active:scale-90"
            aria-label="Search"
            type="button"
          >
            <Search className="h-5 w-5" />
          </button>
        )}
        {showSettings && (
          <button
            onClick={onSettingsClick}
            className="flex h-10 w-10 items-center justify-center text-pn-muted transition-colors duration-150 hover:text-white active:scale-90"
            aria-label="Settings"
            type="button"
          >
            <Settings className="h-5 w-5" />
          </button>
        )}
      </div>
    </header>
  );
}
