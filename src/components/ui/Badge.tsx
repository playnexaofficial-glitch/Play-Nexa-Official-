'use client';

import { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'purple' | 'cyan' | 'success' | 'warning';
  className?: string;
}

const variantStyles: Record<NonNullable<BadgeProps['variant']>, string> = {
  default: 'bg-pn-secondary text-pn-muted',
  purple: 'bg-pn-purple/20 text-pn-purple',
  cyan: 'bg-pn-cyan/20 text-pn-cyan',
  success: 'bg-pn-success/20 text-pn-success',
  warning: 'bg-yellow-500/20 text-yellow-400',
};

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors duration-150 ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

export default Badge;
