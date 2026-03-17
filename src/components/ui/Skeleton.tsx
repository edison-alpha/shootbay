/**
 * Skeleton Loader Components — Shimmer placeholders for loading states.
 * Hardware-accelerated CSS shimmer animation for 60fps performance.
 */
import React from 'react';

// ── Base Shimmer ─────────────────────────────────────────────────────────────

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
  style?: React.CSSProperties;
}

const shimmerStyle: React.CSSProperties = {
  background: 'linear-gradient(90deg, rgba(180,140,60,0.08) 0%, rgba(180,140,60,0.18) 50%, rgba(180,140,60,0.08) 100%)',
  backgroundSize: '200% 100%',
  animation: 'skeleton-shimmer 1.4s ease-in-out infinite',
};

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 16,
  borderRadius = 8,
  className = '',
  style = {},
}) => (
  <div
    className={className}
    style={{
      width,
      height,
      borderRadius,
      ...shimmerStyle,
      ...style,
    }}
  />
);

// ── Leaderboard Row Skeleton ─────────────────────────────────────────────────

export const LeaderboardRowSkeleton: React.FC = () => (
  <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
    style={{ background: 'rgba(0,0,0,0.15)' }}
  >
    <Skeleton width={24} height={24} borderRadius="50%" />
    <Skeleton width={36} height={36} borderRadius="50%" />
    <div className="flex-1 space-y-1.5">
      <Skeleton width="60%" height={12} />
      <Skeleton width="35%" height={10} />
    </div>
    <Skeleton width={40} height={20} borderRadius={6} />
  </div>
);

export const LeaderboardSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => (
  <div className="space-y-2">
    {Array.from({ length: count }, (_, i) => (
      <LeaderboardRowSkeleton key={i} />
    ))}
  </div>
);

// ── Inventory Item Skeleton ─────────────────────────────────────────────────

export const InventoryItemSkeleton: React.FC = () => (
  <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
    style={{ background: 'rgba(0,0,0,0.15)' }}
  >
    <Skeleton width={40} height={40} borderRadius={10} />
    <div className="flex-1 space-y-1.5">
      <Skeleton width="50%" height={12} />
      <Skeleton width="75%" height={10} />
    </div>
    <Skeleton width={28} height={16} borderRadius={4} />
  </div>
);

export const InventorySkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <div className="space-y-2">
    {Array.from({ length: count }, (_, i) => (
      <InventoryItemSkeleton key={i} />
    ))}
  </div>
);

// ── Stats Card Skeleton ─────────────────────────────────────────────────────

export const StatsCardSkeleton: React.FC = () => (
  <div className="grid grid-cols-2 gap-2">
    {Array.from({ length: 4 }, (_, i) => (
      <div key={i} className="rounded-xl p-3" style={{ background: 'rgba(0,0,0,0.15)' }}>
        <Skeleton width={24} height={24} borderRadius="50%" className="mb-2" />
        <Skeleton width="60%" height={18} className="mb-1" />
        <Skeleton width="40%" height={10} />
      </div>
    ))}
  </div>
);

// ── Full Screen Loading Skeleton ────────────────────────────────────────────

export const ScreenSkeleton: React.FC = () => (
  <div className="absolute inset-0 z-50 flex flex-col p-4 space-y-4"
    style={{ background: 'rgba(0,0,0,0.85)' }}
  >
    {/* Header skeleton */}
    <div className="flex items-center gap-3">
      <Skeleton width={44} height={44} borderRadius={12} />
      <Skeleton width="40%" height={20} />
    </div>
    {/* Content skeleton */}
    <div className="flex-1 space-y-3">
      <StatsCardSkeleton />
      <LeaderboardSkeleton count={3} />
    </div>
  </div>
);

// ── Inline CSS keyframes (injected once) ────────────────────────────────────

const STYLE_ID = 'skeleton-shimmer-style';

if (typeof document !== 'undefined' && !document.getElementById(STYLE_ID)) {
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes skeleton-shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
  `;
  document.head.appendChild(style);
}
