import React from 'react';
import type { GameStoreData } from '../../store/gameStore';
import { isLevelUnlocked, getTotalStars } from '../../store/gameStore';
import { LEVELS, getMaxStars } from '../../constants/levels';
import dimsumImg from '../../assets/dimsum.png';
import coinImg from '../../assets/underwater/Bonus/Coin.webp';
import shieldImg from '../../assets/underwater/Bonus/Shield.webp';
import heartImg from '../../assets/underwater/Bonus/Heart.webp';
import swordIcon from '../../assets/water-fire-sprite-magic/Icons/PNG/Icons_Fire Arrow.webp';
import arenaBg from '../../assets/arena_background.webp';

interface LevelSelectScreenProps {
  storeData: GameStoreData;
  onSelectLevel: (levelId: number) => void;
  onBack: () => void;
}

export const LevelSelectScreen: React.FC<LevelSelectScreenProps> = ({
  storeData,
  onSelectLevel,
  onBack,
}) => {
  const totalStars = getTotalStars(storeData);
  const maxStars = getMaxStars();

  return (
    <div className="absolute inset-0 z-50 flex flex-col overflow-hidden"
      style={{
        backgroundImage: `url(${arenaBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        paddingTop: 'max(8px, env(safe-area-inset-top, 8px))',
        paddingBottom: 'max(8px, env(safe-area-inset-bottom, 8px))',
      }}
    >
      <div className="absolute inset-0 bg-black/45 pointer-events-none" />

      {/* ── Header ── */}
      <div className="relative z-10 flex items-center gap-2 px-3 py-2 mx-2 mb-2"
        style={{
          background: 'linear-gradient(180deg, rgba(62,40,20,0.92) 0%, rgba(40,26,12,0.95) 100%)',
          borderRadius: '12px',
          border: '2px solid rgba(180,140,60,0.5)',
          boxShadow: '0 3px 10px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,215,0,0.15)',
        }}
      >
        <button onClick={onBack}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition active:scale-90"
          style={{
            background: 'linear-gradient(180deg, rgba(80,50,20,0.8) 0%, rgba(50,30,10,0.9) 100%)',
            border: '1px solid rgba(180,140,60,0.4)',
          }}
        >
          <span className="text-amber-400 text-lg font-black">‹</span>
        </button>

        <div className="flex-1">
          <h1 className="text-sm font-black text-amber-100 tracking-wide drop-shadow"
            style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}
          >SELECT STAGE</h1>
        </div>

        {/* Star counter */}
        <div className="flex items-center gap-1 rounded-lg px-2 py-1"
          style={{
            background: 'rgba(0,0,0,0.35)',
            border: '1px solid rgba(180,140,60,0.2)',
          }}
        >
          <img src={coinImg} alt="" className="w-4 h-4" />
          <span className="text-xs font-black text-amber-400">{totalStars}/{maxStars}</span>
        </div>
      </div>

      {/* ── Level Grid ── */}
      <div className="relative z-10 flex-1 overflow-y-auto px-3 pb-4">
        <div className="grid grid-cols-2 gap-2.5">
          {LEVELS.map((level, idx) => {
            const unlocked = isLevelUnlocked(storeData, level.id);
            const progress = storeData.levels[level.id];
            const stars = progress?.stars || 0;
            const dimCollected = progress?.dimsumCollected || 0;
            const levelIcons = [swordIcon, heartImg, shieldImg, dimsumImg, coinImg, swordIcon];
            const levelIcon = levelIcons[idx % levelIcons.length];

            return (
              <button
                key={level.id}
                onClick={() => unlocked && onSelectLevel(level.id)}
                disabled={!unlocked}
                className="relative rounded-xl overflow-hidden text-left transition active:scale-[0.97]"
                style={{
                  background: unlocked
                    ? 'linear-gradient(135deg, rgba(62,40,20,0.88) 0%, rgba(40,26,12,0.92) 100%)'
                    : 'linear-gradient(135deg, rgba(30,20,10,0.9) 0%, rgba(20,14,8,0.95) 100%)',
                  border: `2px solid ${unlocked ? 'rgba(180,140,60,0.4)' : 'rgba(80,60,30,0.3)'}`,
                  boxShadow: unlocked ? '0 4px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,215,0,0.08)' : 'none',
                  opacity: unlocked ? 1 : 0.6,
                }}
              >
                {/* Level Number Banner */}
                <div className="px-3 py-1.5 flex items-center gap-2"
                  style={{
                    background: unlocked
                      ? 'linear-gradient(90deg, rgba(180,140,60,0.2), transparent)'
                      : 'rgba(0,0,0,0.2)',
                  }}
                >
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{
                      background: unlocked
                        ? 'linear-gradient(180deg, #b45309, #78350f)'
                        : 'rgba(60,40,20,0.6)',
                      border: `1px solid ${unlocked ? 'rgba(251,191,36,0.4)' : 'rgba(80,60,30,0.3)'}`,
                    }}
                  >
                    {unlocked ? (
                      <img src={levelIcon} alt="" className="w-4 h-4" style={{ filter: 'brightness(1.4)' }} />
                    ) : (
                      <svg className="w-4 h-4 text-amber-800" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-wider ${unlocked ? 'text-amber-500/80' : 'text-amber-800/60'}`}>
                    Stage {idx + 1}
                  </span>
                </div>

                {/* Content */}
                <div className="px-3 py-2">
                  <h3 className={`text-xs font-black mb-1 ${unlocked ? 'text-amber-100' : 'text-amber-800/50'}`}
                    style={unlocked ? { textShadow: '0 1px 3px rgba(0,0,0,0.5)' } : {}}
                  >
                    {level.name}
                  </h3>

                  {/* Stars */}
                  <div className="flex items-center gap-0.5 mb-1.5">
                    {[1, 2, 3].map(s => (
                      <div key={s} className="text-sm" style={{ filter: stars >= s ? 'none' : 'grayscale(1) opacity(0.3)' }}>
                        {stars >= s ? '⭐' : '☆'}
                      </div>
                    ))}
                  </div>

                  {/* Dimsum progress */}
                  {unlocked && (
                    <div className="flex items-center gap-1">
                      <img src={dimsumImg} alt="" className="w-3.5 h-3.5" />
                      <div className="flex-1 h-1.5 rounded-full overflow-hidden"
                        style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(180,140,60,0.1)' }}
                      >
                        <div className="h-full rounded-full transition-all"
                          style={{
                            width: `${(dimCollected / level.dimsumCount) * 100}%`,
                            background: dimCollected === level.dimsumCount
                              ? 'linear-gradient(90deg, #059669, #10b981)'
                              : 'linear-gradient(90deg, #b45309, #f59e0b)',
                          }}
                        />
                      </div>
                      <span className={`text-[9px] font-bold ${dimCollected === level.dimsumCount ? 'text-emerald-400' : 'text-amber-500/70'}`}>
                        {dimCollected}/{level.dimsumCount}
                      </span>
                    </div>
                  )}
                </div>

                {/* Completed checkmark */}
                {progress && stars === 3 && (
                  <div className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px]"
                    style={{
                      background: 'linear-gradient(180deg, #059669, #047857)',
                      border: '1px solid rgba(16,185,129,0.4)',
                      boxShadow: '0 2px 6px rgba(5,150,105,0.3)',
                    }}
                  >✓</div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
