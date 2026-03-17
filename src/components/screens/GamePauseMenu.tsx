import React, { useState } from 'react';
import { CHARACTER_OPTIONS } from '../../constants/characters';
import arenaBg from '../../assets/arena_background.webp';

interface GamePauseMenuProps {
  currentCharacterId: string;
  soundEnabled: boolean;
  musicEnabled: boolean;
  onResume: () => void;
  onToggleSound: (enabled: boolean) => void;
  onToggleMusic: (enabled: boolean) => void;
  onChangeCharacter: (charId: string) => void;
  onExitToMenu: () => void;
}

export const GamePauseMenu: React.FC<GamePauseMenuProps> = ({
  currentCharacterId,
  soundEnabled,
  musicEnabled,
  onResume,
  onToggleSound,
  onToggleMusic,
  onChangeCharacter,
  onExitToMenu,
}) => {
  const [showCharacterPicker, setShowCharacterPicker] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);

  const currentChar = CHARACTER_OPTIONS.find((c) => c.id === currentCharacterId) || CHARACTER_OPTIONS[0];

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(6px)',
      }}
    >
      {/* Main pause panel */}
      <div
        className="relative mx-4 w-full max-w-sm overflow-hidden rounded-2xl"
        style={{
          backgroundImage: `url(${arenaBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          border: '2px solid rgba(180,140,60,0.6)',
          boxShadow: '0 0 40px rgba(0,0,0,0.6), inset 0 0 80px rgba(0,0,0,0.4)',
        }}
      >
        {/* Dark overlay on bg */}
        <div
          className="absolute inset-0"
          style={{ background: 'rgba(20,10,5,0.85)' }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col gap-4 p-6">
          {/* Title */}
          <div className="text-center">
            <h2
              className="text-2xl font-black uppercase tracking-wider"
              style={{
                color: '#fbbf24',
                textShadow: '0 2px 8px rgba(180,140,60,0.5), 0 0 20px rgba(255,215,0,0.2)',
              }}
            >
              ⏸️ Game Paused
            </h2>
            <div
              className="mx-auto mt-2 h-0.5 w-32"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(180,140,60,0.6), transparent)',
              }}
            />
          </div>

          {/* Current Character */}
          <div
            className="flex items-center gap-3 rounded-xl p-3"
            style={{
              background: 'rgba(62,40,20,0.7)',
              border: '1px solid rgba(180,140,60,0.3)',
            }}
          >
            <img
              src={currentChar.image}
              alt={currentChar.name}
              className="h-12 w-12 rounded-lg object-cover"
              style={{ border: '2px solid rgba(180,140,60,0.5)' }}
            />
            <div className="flex-1">
              <p className="text-sm font-bold text-amber-400">{currentChar.name}</p>
              <p className="text-[10px] text-amber-200/50">{currentChar.description}</p>
            </div>
            <button
              onClick={() => setShowCharacterPicker(!showCharacterPicker)}
              className="rounded-lg px-3 py-1.5 text-xs font-bold transition-transform active:scale-95"
              style={{
                background: 'linear-gradient(135deg, rgba(168,85,247,0.4), rgba(139,92,246,0.3))',
                border: '1px solid rgba(168,85,247,0.4)',
                color: '#c4b5fd',
              }}
            >
              🔄 Change
            </button>
          </div>

          {/* Character picker */}
          {showCharacterPicker && (
            <div
              className="flex flex-col gap-2 rounded-xl p-3"
              style={{
                background: 'rgba(62,40,20,0.6)',
                border: '1px solid rgba(180,140,60,0.2)',
              }}
            >
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400/60">
                Select Character
              </p>
              {CHARACTER_OPTIONS.map((char) => (
                <button
                  key={char.id}
                  onClick={() => {
                    onChangeCharacter(char.id);
                    setShowCharacterPicker(false);
                  }}
                  className="flex items-center gap-3 rounded-lg p-2 transition-all active:scale-[0.98]"
                  style={{
                    background:
                      char.id === currentCharacterId
                        ? 'rgba(180,140,60,0.25)'
                        : 'rgba(62,40,20,0.4)',
                    border:
                      char.id === currentCharacterId
                        ? '1px solid rgba(180,140,60,0.5)'
                        : '1px solid rgba(180,140,60,0.15)',
                  }}
                >
                  <img
                    src={char.image}
                    alt={char.name}
                    className="h-10 w-10 rounded-lg object-cover"
                    style={{ border: '1px solid rgba(180,140,60,0.3)' }}
                  />
                  <div className="flex-1 text-left">
                    <p className="text-xs font-bold text-amber-300">{char.name}</p>
                    <p className="text-[9px] text-amber-200/40">{char.description}</p>
                  </div>
                  {char.id === currentCharacterId && (
                    <span className="text-sm text-green-400">✓</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Sound settings */}
          <div
            className="flex flex-col gap-3 rounded-xl p-3"
            style={{
              background: 'rgba(62,40,20,0.7)',
              border: '1px solid rgba(180,140,60,0.3)',
            }}
          >
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400/60">
              Audio Settings
            </p>

            {/* SFX Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">🔊</span>
                <span className="text-sm font-semibold text-amber-200/80">Sound Effects</span>
              </div>
              <button
                onClick={() => onToggleSound(!soundEnabled)}
                className="relative h-7 w-12 rounded-full transition-colors"
                style={{
                  background: soundEnabled
                    ? 'linear-gradient(90deg, rgba(34,197,94,0.6), rgba(22,163,74,0.5))'
                    : 'rgba(62,40,20,0.8)',
                  border: soundEnabled
                    ? '1px solid rgba(34,197,94,0.4)'
                    : '1px solid rgba(180,140,60,0.2)',
                }}
              >
                <div
                  className="absolute top-0.5 h-6 w-6 rounded-full transition-all"
                  style={{
                    left: soundEnabled ? 'calc(100% - 26px)' : '2px',
                    background: soundEnabled
                      ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                      : 'rgba(120,100,70,0.6)',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                  }}
                />
              </button>
            </div>

            {/* Music Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">🎵</span>
                <span className="text-sm font-semibold text-amber-200/80">Music</span>
              </div>
              <button
                onClick={() => onToggleMusic(!musicEnabled)}
                className="relative h-7 w-12 rounded-full transition-colors"
                style={{
                  background: musicEnabled
                    ? 'linear-gradient(90deg, rgba(34,197,94,0.6), rgba(22,163,74,0.5))'
                    : 'rgba(62,40,20,0.8)',
                  border: musicEnabled
                    ? '1px solid rgba(34,197,94,0.4)'
                    : '1px solid rgba(180,140,60,0.2)',
                }}
              >
                <div
                  className="absolute top-0.5 h-6 w-6 rounded-full transition-all"
                  style={{
                    left: musicEnabled ? 'calc(100% - 26px)' : '2px',
                    background: musicEnabled
                      ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                      : 'rgba(120,100,70,0.6)',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                  }}
                />
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-2">
            {/* Resume button */}
            <button
              onClick={onResume}
              className="w-full rounded-xl py-3 text-sm font-black uppercase tracking-widest transition-transform active:scale-[0.97]"
              style={{
                background: 'linear-gradient(135deg, rgba(34,197,94,0.5), rgba(22,163,74,0.4))',
                border: '1px solid rgba(34,197,94,0.4)',
                color: '#86efac',
                textShadow: '0 1px 4px rgba(34,197,94,0.5)',
                boxShadow: '0 4px 15px rgba(34,197,94,0.2)',
              }}
            >
              ▶️ Resume Game
            </button>

            {/* Exit button */}
            {!confirmExit ? (
              <button
                onClick={() => setConfirmExit(true)}
                className="w-full rounded-xl py-3 text-sm font-bold uppercase tracking-wider transition-transform active:scale-[0.97]"
                style={{
                  background: 'rgba(62,40,20,0.6)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  color: '#fca5a5',
                }}
              >
                🚪 Exit to Menu
              </button>
            ) : (
              <div
                className="flex flex-col gap-2 rounded-xl p-3"
                style={{
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.3)',
                }}
              >
                <p className="text-center text-xs font-bold text-red-300">
                  ⚠️ Exit now? Progress in this level will be lost!
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmExit(false)}
                    className="flex-1 rounded-lg py-2 text-xs font-bold transition-transform active:scale-95"
                    style={{
                      background: 'rgba(62,40,20,0.6)',
                      border: '1px solid rgba(180,140,60,0.3)',
                      color: '#d4a053',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={onExitToMenu}
                    className="flex-1 rounded-lg py-2 text-xs font-bold transition-transform active:scale-95"
                    style={{
                      background: 'rgba(239,68,68,0.3)',
                      border: '1px solid rgba(239,68,68,0.4)',
                      color: '#fca5a5',
                    }}
                  >
                    Yes, Exit
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
