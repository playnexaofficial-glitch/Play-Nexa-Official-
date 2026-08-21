'use client';

interface PlatformInfo {
  key: string | null;
  name: string | null;
  color: string;
  icon: string;
}

interface PlatformDetectorProps {
  platform: PlatformInfo;
}

export default function PlatformDetector({ platform }: PlatformDetectorProps) {
  if (!platform.key) return null;

  return (
    <div
      className="
        bg-pn-card
        border border-pn-success
        rounded-2xl p-3
        animate-fade-in
      "
    >
      <div className="flex items-center gap-2">
        {/* Color indicator dot */}
        <span
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: platform.color }}
        />
        <span className="text-white text-sm font-medium">
          ✅ {platform.name} Detected
        </span>
      </div>
      <p className="text-pn-muted text-xs mt-1 ml-[18px]">
        {platform.icon} {platform.name?.toLowerCase()}.com
      </p>
    </div>
  );
}
