// src/components/profile/AchievementBadge.tsx
// ============================================================================
// Achievement badge shown in the Profile page achievements row.
// - Unlocked: purple-tinted background, full-color emoji.
// - Locked:   grey background, grayscale emoji, opacity 50%.
// Used in a horizontal scroll row, so each badge has a min-width and
// flex-shrink-0 to keep them from squishing.
// ============================================================================

interface AchievementBadgeProps {
  emoji: string;
  label: string;
  unlocked: boolean;
}

export default function AchievementBadge({
  emoji,
  label,
  unlocked,
}: AchievementBadgeProps) {
  return (
    <div
      className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl min-w-[76px] flex-shrink-0 border transition-colors duration-200
        ${
          unlocked
            ? 'bg-[#7C3AED]/10 border-[#7C3AED]/30'
            : 'bg-[#141414] border-[#1E1E1E] opacity-50'
        }`}
      role="img"
      aria-label={`${label} — ${unlocked ? 'unlocked' : 'locked'}`}
    >
      <span
        className="text-2xl leading-none"
        style={{ filter: unlocked ? 'none' : 'grayscale(1)' }}
      >
        {emoji}
      </span>
      <span
        className={`text-[10px] text-center leading-tight
          ${unlocked ? 'text-white' : 'text-[#6B7280]'}`}
      >
        {label}
      </span>
    </div>
  );
}
