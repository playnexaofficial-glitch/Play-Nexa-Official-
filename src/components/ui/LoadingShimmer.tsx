'use client';

interface LoadingShimmerProps {
  className?: string;
}

interface ShimmerRowProps {
  count?: number;
  cardClassName?: string;
}

export function LoadingShimmer({ className = '' }: LoadingShimmerProps) {
  return (
    <div className={`bg-pn-card rounded-2xl overflow-hidden relative ${className}`}>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent animate-shimmer" />
    </div>
  );
}

export function ShimmerRow({ count = 4, cardClassName = 'h-48 w-36 flex-shrink-0' }: ShimmerRowProps) {
  return (
    <div className="flex gap-4 overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <LoadingShimmer key={i} className={cardClassName} />
      ))}
    </div>
  );
}

export default LoadingShimmer;
