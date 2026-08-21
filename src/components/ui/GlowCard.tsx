'use client';

import { ReactNode } from 'react';

interface GlowCardProps {
  children: ReactNode;
  glow?: boolean;
  className?: string;
  onClick?: () => void;
}

export function GlowCard({ children, glow = false, className = '', onClick }: GlowCardProps) {
  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
      className={`bg-pn-card border border-pn-border rounded-2xl p-4 ${
        glow ? 'shadow-[0_0_20px_rgba(124,92,255,0.1)]' : ''
      } ${
        onClick ? 'active:scale-[0.97] transition-transform duration-150 cursor-pointer' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}

export default GlowCard;
