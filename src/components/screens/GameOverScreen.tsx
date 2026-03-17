import React, { useMemo } from 'react';
import dimsumImg from '../../assets/dimsum.png';
import chestOpen from '../../assets/underwater/Neutral/æhest_open.webp';
import heartImg from '../../assets/underwater/Bonus/Heart.webp';
import shieldImg from '../../assets/underwater/Bonus/Shield.webp';
import swordIcon from '../../assets/water-fire-sprite-magic/Icons/PNG/Icons_Fire Arrow.webp';
import arenaBg from '../../assets/arena_background.webp';

interface GameOverScreenProps {
  score: number;
  dimsumCollected?: number;
  dimsumTotal?: number;
  onRestart: () => void;
  onMenu?: () => void;
}

export const GameOverScreen: React.FC<GameOverScreenProps> = ({
  score,
  dimsumCollected = 0,
  dimsumTotal = 0,
  onRestart,
  onMenu,
}) => {
  const formattedScore = useMemo(() => score.toLocaleString(), [score]);

  const rank = useMemo(() => {
    if (score >= 500) return { title: 'LEGENDARY', color: '#fbbf24' };
    if (score >= 300) return { title: 'EPIC', color: '#c084fc' };
    if (score >= 150) return { title: 'GREAT', color: '#60a5fa' };
    if (score >= 50) return { title: 'GOOD', color: '#4ade80' };
    return { title: 'ROOKIE', color: '#9ca3af' };
  }, [score]);

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center"
      style={{
        backgroundImage: `url(${arenaBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute inset-0 bg-black/55 pointer-events-none" />

      <div className="relative z-10 w-full max-w-xs px-4 flex flex-col items-center">
        {/* Skull / Defeat Icon */}
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-3"
          style={{
            background: 'linear-gradient(135deg, rgba(80,20,20,0.85) 0%, rgba(50,12,12,0.9) 100%)',
            border: '3px solid rgba(220,38,38,0.35)',
            boxShadow: '0 0 20px rgba(220,38,38,0.2), inset 0 1px 0 rgba(255,255,255,0.05)',
          }}
        >
          <span className="text-4xl" style={{ filter: 'drop-shadow(0 0 10px rgba(239,68,68,0.4))' }}>💀</span>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-black uppercase tracking-[0.15em] mb-1"
          style={{ color: '#ef4444', textShadow: '0 0 15px rgba(239,68,68,0.3), 0 2px 4px rgba(0,0,0,0.5)' }}
        >Game Over</h1>
        <p className="text-xs text-amber-600/60 mb-4">The creatures overwhelmed you!</p>

        {/* Stats Panel */}
        <div className="w-full rounded-xl overflow-hidden mb-4"
          style={{
            background: 'linear-gradient(135deg, rgba(62,40,20,0.9) 0%, rgba(40,26,12,0.95) 100%)',
            border: '2px solid rgba(180,140,60,0.3)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          }}
        >
          <div className="px-3 py-2 flex items-center gap-2"
            style={{ background: 'rgba(220,38,38,0.08)', borderBottom: '1px solid rgba(180,140,60,0.15)' }}
          >
            <img src={chestOpen} alt="" className="w-4 h-4" />
            <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider">Battle Results</span>
          </div>

          <div className="p-3 space-y-2.5">
            {/* Score */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img src={shieldImg} alt="" className="w-5 h-5" />
                <span className="text-xs text-amber-300">Score</span>
              </div>
              <span className="text-lg font-black text-amber-300">{formattedScore}</span>
            </div>

            {/* Dimsum collected */}
            {dimsumTotal > 0 && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <img src={dimsumImg} alt="" className="w-5 h-5" />
                  <span className="text-xs text-amber-300">Dimsum</span>
                </div>
                <span className="text-sm font-black text-amber-300">{dimsumCollected}/{dimsumTotal}</span>
              </div>
            )}

            {/* Rank */}
            <div className="flex items-center justify-center pt-1">
              <div className="px-4 py-1 rounded-full"
                style={{
                  background: `${rank.color}15`,
                  border: `1px solid ${rank.color}33`,
                }}
              >
                <span className="text-[10px] font-black uppercase tracking-[0.3em]"
                  style={{ color: rank.color }}
                >{rank.title}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="w-full space-y-2">
          <button onClick={onRestart}
            className="w-full py-3 rounded-xl text-sm font-black uppercase tracking-wider transition active:scale-[0.97] flex items-center justify-center gap-2"
            style={{
              background: 'linear-gradient(180deg, #dc2626 0%, #991b1b 100%)',
              border: '2px solid rgba(239,68,68,0.3)',
              boxShadow: '0 4px 12px rgba(220,38,38,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
              color: '#fecaca',
              textShadow: '0 2px 4px rgba(0,0,0,0.5)',
            }}
          >
            <img src={swordIcon} alt="" className="w-5 h-5" style={{ filter: 'brightness(1.4) hue-rotate(-20deg)' }} />
            Try Again
          </button>

          {onMenu && (
            <button onClick={onMenu}
              className="w-full py-2.5 rounded-xl text-xs font-bold transition active:scale-[0.97] flex items-center justify-center gap-1.5"
              style={{
                background: 'linear-gradient(180deg, rgba(80,50,20,0.85) 0%, rgba(50,30,10,0.9) 100%)',
                border: '2px solid rgba(180,140,60,0.3)',
                color: '#d4a547',
              }}
            >
              <img src={heartImg} alt="" className="w-4 h-4" />
              Return to Menu
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
