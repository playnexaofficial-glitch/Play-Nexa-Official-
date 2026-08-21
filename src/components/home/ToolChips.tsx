'use client';

import { useState, useCallback } from 'react';

interface ToolChip {
  id: string;
  emoji: string;
  label: string;
}

interface ToolChipsProps {
  onToggle?: (tool: string, active: boolean) => void;
}

const chips: ToolChip[] = [
  { id: 'speed', emoji: '🚀', label: 'Speed Mode' },
  { id: 'cache', emoji: '🗑️', label: 'Clear Cache' },
  { id: 'dark', emoji: '🌙', label: 'Dark Mode' },
  { id: 'perf', emoji: '📊', label: 'Performance' },
  { id: 'safe', emoji: '🔒', label: 'Safe Mode' },
];

export default function ToolChips({ onToggle }: ToolChipsProps) {
  const [activeChips, setActiveChips] = useState<Set<string>>(new Set());

  const handleToggle = useCallback(
    (id: string) => {
      setActiveChips((prev) => {
        const next = new Set(prev);
        const isActive = next.has(id);
        if (isActive) {
          next.delete(id);
        } else {
          next.add(id);
        }
        onToggle?.(id, !isActive);
        return next;
      });
    },
    [onToggle]
  );

  return (
    <section>
      <h2 className="px-4 mb-3 text-base font-semibold text-white">⚡ Quick Tools</h2>
      <div className="flex gap-2 px-4 overflow-x-auto scrollbar-hide">
        {chips.map((chip) => {
          const isActive = activeChips.has(chip.id);
          return (
            <button
              key={chip.id}
              onClick={() => handleToggle(chip.id)}
              className={`flex-shrink-0 rounded-full border px-4 py-2 text-xs text-white transition-colors duration-150 active:scale-95 ${
                isActive
                  ? 'border-pn-purple bg-pn-purple'
                  : 'border-pn-border bg-pn-secondary'
              }`}
              type="button"
              aria-pressed={isActive}
            >
              <span aria-hidden="true">{chip.emoji}</span> {chip.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
