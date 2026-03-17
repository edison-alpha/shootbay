import React from 'react';
import { GAME_CONFIG } from '../../constants/config';

interface HealthBarProps {
  health: number;
}

/** HUD health bar with colour transitions (green → yellow → red). */
export const HealthBar: React.FC<HealthBarProps> = ({ health }) => {
  const pct = Math.max(0, (health / GAME_CONFIG.playerMaxHealth) * 100);
  const colour = health > 50 ? 'bg-green-500' : health > 25 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div className="w-48 h-6 bg-zinc-900 rounded-full overflow-hidden border-2 border-zinc-800 relative">
      <div
        className={`h-full transition-all duration-200 ${colour}`}
        style={{ width: `${pct}%` }}
      />
      <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white drop-shadow-md">
        {Math.max(0, health)} / {GAME_CONFIG.playerMaxHealth} HP
      </div>
    </div>
  );
};
