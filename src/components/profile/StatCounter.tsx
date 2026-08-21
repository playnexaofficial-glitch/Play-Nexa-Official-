// src/components/profile/StatCounter.tsx
// ============================================================================
// Animated count-up stat display used in the Profile page stats row.
// Eases from 0 → target over `duration` ms (default 800ms) with a
// cubic ease-out curve. Re-animates whenever `target` changes (e.g. when
// real stats arrive from Supabase after the initial 0 render).
// ============================================================================

'use client';

import { useState, useEffect, useRef } from 'react';

interface StatCounterProps {
  target: number;
  label: string;
  duration?: number;
}

export default function StatCounter({
  target,
  label,
  duration = 800,
}: StatCounterProps) {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);
  const fromRef = useRef(0);

  useEffect(() => {
    // Cancel any in-flight animation.
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    // If target hasn't changed or is 0, just snap.
    if (target <= 0) {
      setValue(0);
      fromRef.current = 0;
      return;
    }

    const from = fromRef.current;
    const delta = target - from;
    if (delta === 0) return;

    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // cubic ease-out
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = Math.round(from + delta * eased);
      setValue(next);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        rafRef.current = null;
        fromRef.current = target;
      }
    };
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      // Remember where we got to so the next animation starts from here.
      fromRef.current = value;
    };
     
  }, [target, duration]);

  return (
    <div
      className="flex flex-col items-center gap-1 flex-1"
      role="status"
      aria-label={`${label}: ${value}`}
    >
      <p className="text-white font-bold text-2xl tabular-nums">{value}</p>
      <p className="text-[#9CA3AF] text-xs">{label}</p>
    </div>
  );
}
