import React from 'react';

interface ProgressBarProps {
  /** 0 – 100 */
  value: number;
}

/** Animated gold shimmer progress bar used on the intro screen. */
export const ProgressBar: React.FC<ProgressBarProps> = ({ value }) => (
  <div className="w-full max-w-lg mx-auto">
    <div className="relative w-full h-3 bg-white/10 rounded-full overflow-hidden border border-white/10 shadow-inner backdrop-blur-sm">
      <div
        className="h-full rounded-full relative overflow-hidden"
        style={{
          width: `${value}%`,
          background: 'linear-gradient(90deg, #f59e0b, #eab308, #facc15, #eab308)',
          transition: 'width 0.15s ease-out',
          boxShadow: '0 0 12px rgba(250, 204, 21, 0.6)',
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
            animation: 'shimmer 1.5s infinite',
          }}
        />
      </div>
    </div>

    <div className="flex justify-center mt-2">
      <span className="text-sm font-bold text-white/90 font-mono drop-shadow-lg">{value}%</span>
    </div>

    {/* Shimmer keyframe */}
    <style>{`
      @keyframes shimmer {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(200%); }
      }
    `}</style>
  </div>
);
