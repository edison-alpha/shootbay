import React, { useEffect, useState } from 'react';
import arenaBg from '../../assets/arena_background.webp';
import dimsumImg from '../../assets/dimsum.png';

interface BattleLoadingScreenProps {
  levelName: string;
  levelNumber: number;
  dimsumCount: number;
  characterImage: string;
  characterName: string;
  onReady: () => void;
}

type Phase = 'loading' | 'ready' | '3' | '2' | '1' | 'go';

const TIPS = [
  'Collect all dimsum for 3 stars! ⭐⭐⭐',
  'Dodge enemies while collecting dimsum!',
  'Power-ups can help you survive longer!',
  'Every 6 dimsum earns you a ticket! 🎫',
  'Use the joystick to move and attack!',
  'Watch out for the boss enemies! 👹',
];

export const BattleLoadingScreen: React.FC<BattleLoadingScreenProps> = ({
  levelName,
  levelNumber,
  dimsumCount,
  characterImage,
  characterName,
  onReady,
}) => {
  const [phase, setPhase] = useState<Phase>('loading');
  const [progress, setProgress] = useState(0);
  const [tip] = useState(() => TIPS[Math.floor(Math.random() * TIPS.length)]);

  // Loading phase: 0% → 100% over 1.5 seconds
  useEffect(() => {
    let raf: number;
    const start = performance.now();
    const duration = 1500;

    const animate = (now: number) => {
      const elapsed = now - start;
      const pct = Math.min(elapsed / duration, 1);
      setProgress(pct * 100);

      if (pct < 1) {
        raf = requestAnimationFrame(animate);
      } else {
        // Loading complete → start countdown
        setTimeout(() => setPhase('ready'), 300);
      }
    };

    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Countdown phases
  useEffect(() => {
    if (phase === 'loading') return;

    const timings: Record<string, { next: Phase | null; delay: number }> = {
      ready: { next: '3', delay: 800 },
      '3': { next: '2', delay: 700 },
      '2': { next: '1', delay: 700 },
      '1': { next: 'go', delay: 700 },
      go: { next: null, delay: 600 },
    };

    const config = timings[phase];
    if (!config) return;

    const timeout = setTimeout(() => {
      if (config.next) {
        setPhase(config.next);
      } else {
        onReady();
      }
    }, config.delay);

    return () => clearTimeout(timeout);
  }, [phase, onReady]);

  const getCountdownContent = () => {
    switch (phase) {
      case 'loading':
        return null;
      case 'ready':
        return { text: 'READY?', color: '#fbbf24', glow: 'rgba(251,191,36,0.5)', size: 'text-4xl' };
      case '3':
        return { text: '3', color: '#f472b6', glow: 'rgba(244,114,182,0.5)', size: 'text-7xl' };
      case '2':
        return { text: '2', color: '#c084fc', glow: 'rgba(192,132,252,0.5)', size: 'text-7xl' };
      case '1':
        return { text: '1', color: '#34d399', glow: 'rgba(52,211,153,0.5)', size: 'text-7xl' };
      case 'go':
        return { text: 'GO!', color: '#fbbf24', glow: 'rgba(251,191,36,0.6)', size: 'text-6xl' };
      default:
        return null;
    }
  };

  const countdown = getCountdownContent();

  return (
    <div
      className="absolute inset-0 z-[55] flex flex-col items-center justify-center overflow-hidden"
      style={{
        backgroundImage: `url(${arenaBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0" style={{ background: 'rgba(10,5,2,0.88)' }} />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-6 px-8 w-full max-w-md">
        {/* Level info header */}
        <div className="text-center">
          <p
            className="text-[10px] font-bold uppercase tracking-[0.4em] mb-1"
            style={{ color: 'rgba(180,140,60,0.6)' }}
          >
            Level {levelNumber}
          </p>
          <h1
            className="text-2xl font-black uppercase tracking-wider"
            style={{
              color: '#fbbf24',
              textShadow: '0 2px 8px rgba(180,140,60,0.5), 0 0 20px rgba(255,215,0,0.15)',
            }}
          >
            {levelName}
          </h1>
        </div>

        {/* Character */}
        <div className="flex flex-col items-center gap-2">
          <div
            className="w-20 h-20 rounded-2xl overflow-hidden flex items-center justify-center"
            style={{
              background: 'rgba(62,40,20,0.8)',
              border: '2px solid rgba(180,140,60,0.4)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            }}
          >
            <img
              src={characterImage}
              alt={characterName}
              className="w-16 h-16 object-cover"
              style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}
            />
          </div>
          <p className="text-xs font-bold text-amber-400/70">{characterName}</p>
        </div>

        {/* Mission info */}
        <div
          className="w-full rounded-xl p-3 flex items-center justify-center gap-3"
          style={{
            background: 'rgba(62,40,20,0.7)',
            border: '1px solid rgba(180,140,60,0.25)',
          }}
        >
          <img src={dimsumImg} alt="dimsum" className="w-6 h-6" />
          <div className="text-center">
            <p className="text-xs font-bold text-amber-200">Mission: Collect {dimsumCount} Dimsum</p>
            <p className="text-[9px] text-amber-500/50 mt-0.5">Collect all for 3 stars!</p>
          </div>
        </div>

        {/* Loading bar or Countdown */}
        {phase === 'loading' ? (
          <div className="w-full">
            <div className="flex justify-between mb-1.5">
              <span className="text-[10px] font-bold text-amber-500/70">Loading Arena...</span>
              <span className="text-[10px] font-bold text-amber-400 tabular-nums">
                {Math.floor(progress)}%
              </span>
            </div>
            <div
              className="h-3 w-full rounded-full overflow-hidden"
              style={{
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid rgba(180,140,60,0.2)',
              }}
            >
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${progress}%`,
                  background: 'linear-gradient(90deg, #b45309, #f59e0b, #fbbf24)',
                  boxShadow: '0 0 8px rgba(245,158,11,0.4)',
                  transition: 'width 0.05s linear',
                }}
              />
            </div>

            {/* Tip */}
            <p className="text-[10px] text-amber-600/50 text-center mt-3 italic">
              💡 {tip}
            </p>
          </div>
        ) : (
          /* Countdown display */
          countdown && (
            <div className="flex items-center justify-center h-32">
              <span
                key={phase}
                className={`${countdown.size} font-black uppercase tracking-wider animate-countdown`}
                style={{
                  color: countdown.color,
                  textShadow: `0 0 30px ${countdown.glow}, 0 0 60px ${countdown.glow}, 0 4px 12px rgba(0,0,0,0.5)`,
                }}
              >
                {countdown.text}
              </span>
            </div>
          )
        )}
      </div>

      {/* Animations */}
      <style>{`
        @keyframes countdown-pop {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-countdown {
          animation: countdown-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
      `}</style>
    </div>
  );
};
