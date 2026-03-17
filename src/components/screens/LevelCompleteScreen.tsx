import React, { useState, useEffect } from 'react';
import { calculateStars } from '../../store/gameStore';
import type { LevelConfig } from '../../constants/levels';
import dimsumImg from '../../assets/dimsum.png';
import crownImg from '../../assets/underwater/Bonus/Crown.webp';
import coinImg from '../../assets/underwater/Bonus/Coin.webp';
import chestClosed from '../../assets/underwater/Neutral/æhest_closed.webp';
import shieldImg from '../../assets/underwater/Bonus/Shield.webp';
import heartImg from '../../assets/underwater/Bonus/Heart.webp';
import swordIcon from '../../assets/water-fire-sprite-magic/Icons/PNG/Icons_Fire Arrow.webp';
import arenaBg from '../../assets/arena_background.webp';

interface LevelCompleteScreenProps {
  levelConfig: LevelConfig;
  dimsumCollected: number;
  timeTaken: number;
  previousBest: number;
  ticketEarned: boolean;
  onNextLevel: () => void;
  onRetry: () => void;
  onMenu: () => void;
  hasNextLevel: boolean;
}

export const LevelCompleteScreen: React.FC<LevelCompleteScreenProps> = ({
  levelConfig,
  dimsumCollected,
  timeTaken,
  previousBest,
  ticketEarned,
  onNextLevel,
  onRetry,
  onMenu,
  hasNextLevel,
}) => {
  const stars = calculateStars(dimsumCollected, levelConfig.dimsumCount);
  const [revealedStars, setRevealedStars] = useState(0);
  const [showContent, setShowContent] = useState(false);
  const [showTicket, setShowTicket] = useState(false);
  const isNewBest = timeTaken < previousBest || previousBest === 0;
  const isPerfect = dimsumCollected === levelConfig.dimsumCount;

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 1; i <= stars; i++) {
      timers.push(setTimeout(() => setRevealedStars(i), i * 400));
    }
    timers.push(setTimeout(() => setShowContent(true), stars * 400 + 300));
    if (ticketEarned) {
      timers.push(setTimeout(() => setShowTicket(true), stars * 400 + 800));
    }
    return () => timers.forEach(clearTimeout);
  }, [stars, ticketEarned]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center overflow-hidden"
      style={{
        backgroundImage: `url(${arenaBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute inset-0 bg-black/50 pointer-events-none" />

      <div className="relative z-10 w-full max-w-xs px-4 flex flex-col items-center">
        {/* Victory Banner */}
        <div className="w-full rounded-xl p-3 mb-3 text-center relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(62,40,20,0.92) 0%, rgba(40,26,12,0.95) 100%)',
            border: '2px solid rgba(180,140,60,0.5)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,215,0,0.15)',
          }}
        >
          {/* Decorative crown */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <img src={crownImg} alt="" className="w-10 h-10"
              style={{ filter: 'drop-shadow(0 2px 6px rgba(251,191,36,0.4))' }}
            />
          </div>

          <p className="text-[10px] font-bold text-amber-500/60 uppercase tracking-widest mt-3">Stage Complete</p>
          <h2 className="text-lg font-black text-amber-100 mt-0.5"
            style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}
          >{levelConfig.name}</h2>

          {/* Animated Stars */}
          <div className="flex items-center justify-center gap-2 my-3">
            {[1, 2, 3].map(s => (
              <div key={s}
                className="transition-all duration-500"
                style={{
                  transform: revealedStars >= s ? 'scale(1) rotate(0deg)' : 'scale(0) rotate(-180deg)',
                  opacity: revealedStars >= s ? 1 : 0.2,
                }}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  revealedStars >= s ? '' : ''
                }`}
                  style={{
                    background: revealedStars >= s
                      ? 'linear-gradient(180deg, rgba(251,191,36,0.2), rgba(180,140,60,0.15))'
                      : 'rgba(0,0,0,0.2)',
                    border: `2px solid ${revealedStars >= s ? 'rgba(251,191,36,0.4)' : 'rgba(80,60,30,0.2)'}`,
                    boxShadow: revealedStars >= s ? '0 0 12px rgba(251,191,36,0.2)' : 'none',
                  }}
                >
                  <span className="text-xl">{revealedStars >= s ? '⭐' : '☆'}</span>
                </div>
              </div>
            ))}
          </div>

          {isPerfect && (
            <div className="px-3 py-1 rounded-full inline-flex items-center gap-1"
              style={{
                background: 'rgba(16,185,129,0.15)',
                border: '1px solid rgba(16,185,129,0.3)',
              }}
            >
              <img src={dimsumImg} alt="" className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold text-emerald-400">PERFECT COLLECTION!</span>
            </div>
          )}
        </div>

        {/* Stats Panel */}
        <div className={`w-full rounded-xl overflow-hidden mb-3 transition-all duration-500 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
          style={{
            background: 'linear-gradient(135deg, rgba(62,40,20,0.88) 0%, rgba(40,26,12,0.92) 100%)',
            border: '2px solid rgba(180,140,60,0.3)',
          }}
        >
          <div className="px-3 py-2 flex items-center gap-2"
            style={{ background: 'rgba(180,140,60,0.1)', borderBottom: '1px solid rgba(180,140,60,0.15)' }}
          >
            <img src={coinImg} alt="" className="w-4 h-4" />
            <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider">Battle Results</span>
          </div>

          <div className="p-3 space-y-2">
            {/* Dimsum collected */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img src={dimsumImg} alt="" className="w-5 h-5" />
                <span className="text-xs text-amber-300">Dimsum</span>
              </div>
              <span className={`text-sm font-black ${isPerfect ? 'text-emerald-400' : 'text-amber-300'}`}>
                {dimsumCollected}/{levelConfig.dimsumCount}
              </span>
            </div>

            {/* Time */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img src={shieldImg} alt="" className="w-5 h-5" />
                <span className="text-xs text-amber-300">Time</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-black text-amber-300">{formatTime(timeTaken)}</span>
                {isNewBest && previousBest > 0 && (
                  <span className="text-[8px] font-bold text-emerald-400 px-1 py-0.5 rounded"
                    style={{ background: 'rgba(16,185,129,0.15)' }}
                  >NEW!</span>
                )}
              </div>
            </div>

            {/* Stars */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img src={crownImg} alt="" className="w-5 h-5" />
                <span className="text-xs text-amber-300">Stars</span>
              </div>
              <div className="flex items-center gap-0.5">
                {[1, 2, 3].map(s => (
                  <span key={s} className="text-sm">{stars >= s ? '⭐' : '☆'}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Ticket Earned */}
        {showTicket && (
          <div className="w-full rounded-xl p-3 mb-3 flex items-center gap-3 animate-bounce"
            style={{
              background: 'linear-gradient(135deg, rgba(192,132,252,0.15) 0%, rgba(62,40,20,0.9) 100%)',
              border: '2px solid rgba(192,132,252,0.3)',
              boxShadow: '0 0 15px rgba(192,132,252,0.15)',
            }}
          >
            <img src={chestClosed} alt="" className="w-10 h-10"
              style={{ filter: 'drop-shadow(0 2px 6px rgba(192,132,252,0.3))' }}
            />
            <div>
              <p className="text-xs font-black text-purple-300">Ticket Earned!</p>
              <p className="text-[9px] text-purple-400/60">Use it to open a Mystery Box</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className={`w-full space-y-2 transition-all duration-500 delay-200 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          {hasNextLevel && (
            <button onClick={onNextLevel}
              className="w-full py-3 rounded-xl text-sm font-black uppercase tracking-wider transition active:scale-[0.97] flex items-center justify-center gap-2"
              style={{
                background: 'linear-gradient(180deg, #b45309 0%, #78350f 100%)',
                border: '2px solid rgba(251,191,36,0.4)',
                boxShadow: '0 4px 12px rgba(180,100,10,0.3), inset 0 1px 0 rgba(255,215,0,0.15)',
                color: '#fef3c7',
                textShadow: '0 2px 4px rgba(0,0,0,0.5)',
              }}
            >
              <img src={swordIcon} alt="" className="w-5 h-5" style={{ filter: 'brightness(1.4)' }} />
              Next Stage
            </button>
          )}

          <div className="flex gap-2">
            <button onClick={onRetry}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold transition active:scale-[0.97] flex items-center justify-center gap-1.5"
              style={{
                background: 'linear-gradient(180deg, rgba(80,50,20,0.85) 0%, rgba(50,30,10,0.9) 100%)',
                border: '2px solid rgba(180,140,60,0.3)',
                color: '#d4a547',
              }}
            >
              <img src={heartImg} alt="" className="w-4 h-4" />
              Retry
            </button>

            <button onClick={onMenu}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold transition active:scale-[0.97] flex items-center justify-center gap-1.5"
              style={{
                background: 'linear-gradient(180deg, rgba(80,50,20,0.85) 0%, rgba(50,30,10,0.9) 100%)',
                border: '2px solid rgba(180,140,60,0.3)',
                color: '#d4a547',
              }}
            >
              <img src={shieldImg} alt="" className="w-4 h-4" />
              Menu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
