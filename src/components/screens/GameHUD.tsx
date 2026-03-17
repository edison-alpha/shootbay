import React, { useMemo } from 'react';
import { ProfileAvatar } from '../ui/ProfileAvatar';
import { HealthBar } from '../ui/HealthBar';
import type { ActivePowerUp } from '../../types/game';

// Sprite asset imports for HUD icons
import spellIconFire from '../../assets/water-fire-sprite-magic/Icons/PNG/Icons_Fire Spell.webp';
import spellIconWater from '../../assets/water-fire-sprite-magic/Icons/PNG/Icons_Water Spell.webp';
import spellIconFireArrow from '../../assets/water-fire-sprite-magic/Icons/PNG/Icons_Fire Arrow.webp';
import energyIcon from '../../assets/energy-pack/energy/10.webp';
import bubbleIcon from '../../assets/underwater/Neutral/Bubble_2.webp';
import shieldPickup from '../../assets/underwater/Bonus/Shield.webp';
import accelerationPickup from '../../assets/underwater/Bonus/Acceleration.webp';
import heartPickup from '../../assets/underwater/Bonus/Heart.webp';
import chestClosed from '../../assets/underwater/Neutral/\u00e6hest_closed.webp';
import dimsumImg from '../../assets/dimsum.png';

interface GameHUDProps {
  score: number;
  health: number;
  lives: number;
  weapon: string;
  powerUps: ActivePowerUp[];
  playerName: string;
  profilePhoto: string | null;
  characterImage: string;
  characterName: string;
  dimsumCollected: number;
  dimsumTotal: number;
  levelName?: string;
  onPause?: () => void;
}

interface WeaponConfig {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string;
  sprite: string | null;
}

const WEAPON_CONFIGS: Record<string, WeaponConfig> = {
  default: { label: 'Default', color: '#d4d4d8', bgColor: 'rgba(63,63,70,0.6)', borderColor: 'rgba(113,113,122,0.4)', icon: '🔫', sprite: spellIconFireArrow },
  shotgun: { label: 'Shotgun', color: '#fb923c', bgColor: 'rgba(154,52,18,0.5)', borderColor: 'rgba(251,146,60,0.4)', icon: '💥', sprite: spellIconFire },
  rapid: { label: 'Rapid Fire', color: '#60a5fa', bgColor: 'rgba(30,58,138,0.5)', borderColor: 'rgba(96,165,250,0.4)', icon: '⚡', sprite: spellIconWater },
};

interface PowerUpConfig {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string;
  sprite: string | null;
  maxDuration: number;
}

const POWERUP_CONFIGS: Record<string, PowerUpConfig> = {
  double_bullets: { label: 'Double Bullets', color: '#e9d5ff', bgColor: 'rgba(88,28,135,0.55)', borderColor: 'rgba(168,85,247,0.4)', icon: '✨', sprite: energyIcon, maxDuration: 12 },
  shield: { label: 'Shield', color: '#a5f3fc', bgColor: 'rgba(22,78,99,0.55)', borderColor: 'rgba(34,211,238,0.4)', icon: '🛡️', sprite: shieldPickup, maxDuration: 10 },
  speed_boost: { label: 'Speed', color: '#bbf7d0', bgColor: 'rgba(20,83,45,0.55)', borderColor: 'rgba(34,197,94,0.4)', icon: '🏃', sprite: accelerationPickup, maxDuration: 8 },
};

/** Improved top-of-screen heads-up display during gameplay. */
export const GameHUD: React.FC<GameHUDProps> = ({
  score,
  health,
  lives,
  weapon,
  powerUps,
  playerName,
  profilePhoto,
  characterImage,
  characterName,
  dimsumCollected,
  dimsumTotal,
  levelName,
  onPause,
}) => {
  const weaponConfig = useMemo(() => WEAPON_CONFIGS[weapon] || WEAPON_CONFIGS.default, [weapon]);
  const formattedScore = useMemo(() => score.toLocaleString(), [score]);

  return (
    <div
      className="pointer-events-none absolute left-0 top-0 flex w-full flex-col gap-2 p-3"
      style={{
        paddingTop: 'max(12px, env(safe-area-inset-top, 12px))',
        paddingLeft: 'max(12px, env(safe-area-inset-left, 12px))',
        paddingRight: 'max(12px, env(safe-area-inset-right, 12px))',
        background: 'linear-gradient(to bottom, rgba(15,5,35,0.85) 0%, rgba(26,10,62,0.55) 60%, transparent 100%)',
      }}
    >
      {/* ── Top row: Score + Mystery indicator + Lives ── */}
      <div className="flex items-center justify-between">
        {/* Score badge with bubble icon */}
        <div
          className="flex items-center gap-1.5 rounded-xl px-3 py-1.5"
          style={{
            background: 'linear-gradient(135deg, rgba(45,27,105,0.7) 0%, rgba(26,13,64,0.6) 100%)',
            border: '1px solid rgba(255,215,0,0.2)',
            boxShadow: '0 2px 12px rgba(168,85,247,0.15)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <img
            src={bubbleIcon}
            alt="score"
            className="h-5 w-5 opacity-80"
            style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }}
          />
          <span className="text-lg font-black tabular-nums text-yellow-400 drop-shadow-md sm:text-2xl">
            {formattedScore}
          </span>
          <span
            className="text-[9px] font-bold uppercase tracking-widest"
            style={{ color: 'rgba(251,191,36,0.6)' }}
          >
            PTS
          </span>
        </div>

        {/* Dimsum Counter */}
        <div
          className="flex items-center gap-1.5 rounded-xl px-3 py-1.5"
          style={{
            background: 'linear-gradient(135deg, rgba(45,27,105,0.7) 0%, rgba(26,13,64,0.6) 100%)',
            border: '1px solid rgba(255,215,0,0.2)',
            boxShadow: '0 2px 8px rgba(168,85,247,0.15)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <img src={dimsumImg} alt="dimsum" className="h-5 w-5" style={{ filter: 'drop-shadow(0 1px 3px rgba(255,215,0,0.4))' }} />
          <span className="text-sm font-black tabular-nums text-amber-400">
            {dimsumCollected}/{dimsumTotal}
          </span>
          {levelName && (
            <span className="text-[8px] font-bold text-purple-300/50 uppercase tracking-wider ml-1">
              {levelName}
            </span>
          )}
        </div>

        {/* Lives (hearts with sprite) */}
        <div className="flex items-center gap-1.5">
          <div
            className="flex items-center gap-0.5 rounded-xl px-2.5 py-1.5"
            style={{
              background: 'linear-gradient(135deg, rgba(239,68,68,0.12) 0%, rgba(220,38,38,0.08) 100%)',
              border: '1px solid rgba(239,68,68,0.2)',
              backdropFilter: 'blur(8px)',
            }}
          >
            {Array.from({ length: Math.max(lives, 0) }).map((_, i) => (
              <img
                key={i}
                src={heartPickup}
                alt="life"
                className="h-5 w-5"
                style={{
                  filter: 'drop-shadow(0 1px 3px rgba(239,68,68,0.5))',
                  animation: lives <= 1 ? 'pulse 1s ease-in-out infinite' : undefined,
                }}
              />
            ))}
            {lives <= 0 && (
              <span className="text-[10px] font-bold text-red-400" style={{ textShadow: '0 0 8px rgba(239,68,68,0.5)' }}>
                NO LIVES!
              </span>
            )}
          </div>

          {/* Pause/Settings button */}
          {onPause && (
            <button
              onClick={onPause}
              className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-xl transition-transform active:scale-90"
              style={{
                background: 'linear-gradient(135deg, rgba(45,27,105,0.8) 0%, rgba(26,13,64,0.7) 100%)',
                border: '1px solid rgba(255,215,0,0.25)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                backdropFilter: 'blur(8px)',
              }}
              title="Settings"
            >
              <span className="text-base" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }}>⚙️</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Player info + Health bar + Weapon ── */}
      <div
        className="flex items-center gap-2.5 rounded-xl p-2"
        style={{
          background: 'linear-gradient(135deg, rgba(26,10,62,0.7) 0%, rgba(45,27,105,0.5) 100%)',
          border: '1px solid rgba(255,215,0,0.1)',
          boxShadow: '0 4px 15px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,215,0,0.05)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <ProfileAvatar
          photo={profilePhoto}
          fallbackSrc={characterImage}
          fallbackAlt={characterName}
          name={playerName}
        />
        <div className="flex flex-1 flex-col gap-1.5">
          <HealthBar health={health} />

          {/* Weapon indicator with sprite icon */}
          <div className="flex items-center gap-2">
            <div
              className="flex items-center gap-1.5 rounded-lg px-2 py-0.5"
              style={{
                background: weaponConfig.bgColor,
                border: `1px solid ${weaponConfig.borderColor}`,
                boxShadow: `0 1px 8px ${weaponConfig.borderColor}`,
              }}
            >
              {weaponConfig.sprite ? (
                <img
                  src={weaponConfig.sprite}
                  alt={weaponConfig.label}
                  className="h-4 w-4"
                  style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.4))' }}
                />
              ) : (
                <span className="text-xs">{weaponConfig.icon}</span>
              )}
              <span
                className="text-[10px] font-bold uppercase tracking-wider"
                style={{ color: weaponConfig.color }}
              >
                {weaponConfig.label}
              </span>
            </div>

            {/* Energy indicator */}
            <div
              className="flex items-center gap-1 rounded-md px-1.5 py-0.5"
              style={{
                background: 'rgba(34,211,238,0.1)',
                border: '1px solid rgba(34,211,238,0.15)',
              }}
            >
              <img
                src={energyIcon}
                alt="energy"
                className="h-3.5 w-3.5 opacity-70"
              />
              <span className="text-[9px] font-medium text-cyan-300/70">∞</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Active power-ups with sprite icons ── */}
      {powerUps.length > 0 && (
        <div className="flex flex-col gap-1">
          {powerUps.map((pu, i) => {
            const config = POWERUP_CONFIGS[pu.type] || {
              label: pu.type, color: '#e4e4e7', bgColor: 'rgba(39,39,42,0.55)',
              borderColor: 'rgba(113,113,122,0.3)', icon: '⭐', sprite: null, maxDuration: 10,
            };
            const pct = Math.max(0, (pu.remaining / config.maxDuration) * 100);
            const isExpiring = pu.remaining <= 3;

            return (
              <div
                key={i}
                className="flex items-center gap-2 rounded-lg px-2.5 py-1"
                style={{
                  background: config.bgColor,
                  border: `1px solid ${config.borderColor}`,
                  boxShadow: isExpiring ? `0 0 12px ${config.borderColor}` : undefined,
                  backdropFilter: 'blur(6px)',
                  animation: isExpiring ? 'pulse 0.8s ease-in-out infinite' : undefined,
                }}
              >
                {/* Icon: sprite or emoji fallback */}
                {config.sprite ? (
                  <img
                    src={config.sprite}
                    alt={config.label}
                    className="h-4 w-4"
                    style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.4))' }}
                  />
                ) : (
                  <span className="text-xs">{config.icon}</span>
                )}

                <span
                  className="text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: config.color }}
                >
                  {config.label}
                </span>

                {/* Progress bar */}
                <div
                  className="relative h-1.5 flex-1 overflow-hidden rounded-full"
                  style={{ background: 'rgba(0,0,0,0.4)' }}
                >
                  <div
                    className="absolute left-0 top-0 h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${pct}%`,
                      background: `linear-gradient(90deg, ${config.color}66 0%, ${config.color}aa 100%)`,
                      boxShadow: `0 0 6px ${config.color}44`,
                    }}
                  />
                </div>

                <span
                  className="font-mono text-[10px] font-bold tabular-nums"
                  style={{ color: isExpiring ? '#f87171' : config.color, opacity: 0.8 }}
                >
                  {Math.ceil(pu.remaining)}s
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
