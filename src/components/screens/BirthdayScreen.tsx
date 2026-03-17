import React from 'react';
import arenaBg from '../../assets/arena_background.webp';
import dimsumImg from '../../assets/dimsum.png';

interface BirthdayScreenProps {
  playerName: string;
  wishes: string[];
  dimsumCollected: number;
  onPlayAgain: () => void;
  onViewRewards: () => void;
  onMenu: () => void;
}

export const BirthdayScreen: React.FC<BirthdayScreenProps> = ({
  playerName,
  wishes,
  dimsumCollected,
  onPlayAgain,
  onViewRewards,
  onMenu,
}) => (
  <div
    className="absolute inset-0 z-50 flex items-center justify-center overflow-hidden"
    style={{
      backgroundImage: `url(${arenaBg})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      padding:
        'max(16px, env(safe-area-inset-top, 16px)) max(16px, env(safe-area-inset-right, 16px)) max(16px, env(safe-area-inset-bottom, 16px)) max(16px, env(safe-area-inset-left, 16px))',
    }}
  >
    {/* Dark overlay */}
    <div className="absolute inset-0" style={{ background: 'rgba(10,5,2,0.8)' }} />

    {/* Confetti particles (CSS) */}
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 20 }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: `${4 + Math.random() * 6}px`,
            height: `${4 + Math.random() * 6}px`,
            background: ['#fbbf24', '#f472b6', '#c084fc', '#34d399', '#60a5fa'][i % 5],
            left: `${Math.random() * 100}%`,
            top: `${-10 + Math.random() * 10}%`,
            animation: `confetti-fall ${3 + Math.random() * 4}s linear ${Math.random() * 3}s infinite`,
            opacity: 0.7,
          }}
        />
      ))}
    </div>

    {/* Main Card */}
    <div
      className="relative z-10 flex max-h-full w-full max-w-md flex-col overflow-hidden rounded-2xl"
      style={{
        background: 'linear-gradient(135deg, rgba(62,40,20,0.97), rgba(30,18,8,0.98))',
        border: '2px solid rgba(192,132,252,0.4)',
        boxShadow:
          '0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(192,132,252,0.15), inset 0 1px 0 rgba(192,132,252,0.1)',
      }}
    >
      {/* Header */}
      <div className="shrink-0 p-6 pb-3 text-center">
        <div
          className="mb-3 text-5xl"
          style={{ filter: 'drop-shadow(0 0 24px rgba(192,132,252,0.5))' }}
        >
          🎂
        </div>
        <h1
          className="mb-1 text-3xl font-black uppercase tracking-wider"
          style={{
            color: '#c084fc',
            textShadow: '0 2px 8px rgba(192,132,252,0.5), 0 0 20px rgba(192,132,252,0.2)',
          }}
        >
          Happy Birthday!
        </h1>
        <div
          className="mx-auto mt-2 mb-3 h-0.5 w-32"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(192,132,252,0.6), transparent)',
          }}
        />
        <p className="text-sm text-amber-200/70">
          Selamat <span className="font-bold text-purple-300">{playerName}</span>! 🎉
        </p>
        <div className="mt-2 flex items-center justify-center gap-2">
          <img src={dimsumImg} alt="dimsum" className="h-5 w-5" />
          <span className="text-sm font-bold text-amber-400">
            {dimsumCollected} Dimsum Collected
          </span>
        </div>
      </div>

      {/* Wishes */}
      {wishes.length > 0 && (
        <div className="mx-6 mb-4 min-h-0 flex-1 overflow-y-auto">
          <div
            className="rounded-xl p-4 text-left"
            style={{
              background:
                'linear-gradient(135deg, rgba(192,132,252,0.08), rgba(192,132,252,0.03))',
              border: '1.5px solid rgba(192,132,252,0.2)',
            }}
          >
            <div
              className="mb-3 text-[10px] font-black uppercase tracking-[0.35em]"
              style={{ color: 'rgba(192,132,252,0.6)' }}
            >
              Your Wishes
            </div>
            <ul className="space-y-2">
              {wishes.map((w, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-purple-200"
                >
                  <span className="mt-0.5 text-amber-400">✨</span>
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Saved notification */}
      <div className="mx-6 mb-3">
        <div
          className="flex items-center gap-2 rounded-lg px-3 py-2"
          style={{
            background: 'rgba(34,197,94,0.1)',
            border: '1px solid rgba(34,197,94,0.25)',
          }}
        >
          <span className="text-green-400 text-sm">✓</span>
          <span className="text-[10px] font-semibold text-green-300/80">
            Birthday card saved to your Rewards!
          </span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="shrink-0 flex flex-col gap-2 p-6 pt-2">
        {/* View in Rewards */}
        <button
          onClick={onViewRewards}
          className="w-full rounded-xl py-3 text-sm font-black uppercase tracking-widest transition-transform active:scale-[0.97]"
          style={{
            background: 'linear-gradient(135deg, rgba(192,132,252,0.4), rgba(139,92,246,0.3))',
            border: '1px solid rgba(192,132,252,0.4)',
            color: '#c4b5fd',
            textShadow: '0 1px 4px rgba(192,132,252,0.5)',
            boxShadow: '0 4px 15px rgba(192,132,252,0.2)',
          }}
        >
          🎁 View in Rewards
        </button>

        {/* Play Again */}
        <button
          onClick={onPlayAgain}
          className="w-full rounded-xl py-3 text-sm font-black uppercase tracking-widest transition-transform active:scale-[0.97]"
          style={{
            background: 'linear-gradient(135deg, rgba(34,197,94,0.4), rgba(22,163,74,0.3))',
            border: '1px solid rgba(34,197,94,0.4)',
            color: '#86efac',
            textShadow: '0 1px 4px rgba(34,197,94,0.5)',
          }}
        >
          🎮 Play Again
        </button>

        {/* Back to Menu */}
        <button
          onClick={onMenu}
          className="w-full rounded-xl py-2.5 text-xs font-bold uppercase tracking-wider transition-transform active:scale-[0.97]"
          style={{
            background: 'rgba(62,40,20,0.6)',
            border: '1px solid rgba(180,140,60,0.2)',
            color: '#b4a060',
          }}
        >
          🏠 Main Menu
        </button>
      </div>
    </div>

    {/* Confetti animation keyframes */}
    <style>{`
      @keyframes confetti-fall {
        0% { transform: translateY(-10vh) rotate(0deg); opacity: 0; }
        10% { opacity: 0.7; }
        90% { opacity: 0.7; }
        100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
      }
    `}</style>
  </div>
);
