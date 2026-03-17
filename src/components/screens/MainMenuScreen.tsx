import React from 'react';
import type { GameStoreData } from '../../store/gameStore';
import { getTotalStars, getCompletedLevels, getTicketProgress } from '../../store/gameStore';
import { LEVELS, getMaxStars } from '../../constants/levels';
import dimsumImg from '../../assets/dimsum.png';
import chestClosed from '../../assets/underwater/Neutral/æhest_closed.webp';
import coinImg from '../../assets/underwater/Bonus/Coin.webp';
import crownImg from '../../assets/underwater/Bonus/Crown.webp';
import shieldImg from '../../assets/underwater/Bonus/Shield.webp';
import pearlImg from '../../assets/underwater/Bonus/Pearl.webp';
import heartImg from '../../assets/underwater/Bonus/Heart.webp';
import swordIcon from '../../assets/water-fire-sprite-magic/Icons/PNG/Icons_Fire Arrow.webp';
import magicIcon from '../../assets/water-fire-sprite-magic/Icons/PNG/Icons_Fire Spell.webp';
import arenaBg from '../../assets/arena_background.webp';

interface MainMenuScreenProps {
  storeData: GameStoreData;
  playerName: string;
  profilePhoto: string | null;
  characterImage?: string;
  onPlay: () => void;
  onLeaderboard: () => void;
  onInventory: () => void;
  onMysteryBox: () => void;
  onSettings: () => void;
  onChangeCharacter: () => void;
}

export const MainMenuScreen: React.FC<MainMenuScreenProps> = ({
  storeData,
  playerName,
  profilePhoto,
  characterImage,
  onPlay,
  onLeaderboard,
  onInventory,
  onMysteryBox,
  onSettings,
  onChangeCharacter,
}) => {
  const totalStars = getTotalStars(storeData);
  const maxStars = getMaxStars();
  const completedLevels = getCompletedLevels(storeData);
  const ticketProgress = getTicketProgress(storeData);

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
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/40 pointer-events-none" />

      {/* ── Top Resource Bar ── */}
      <div className="relative z-10 flex items-center gap-1.5 px-2 py-1.5 mx-2 mb-2"
        style={{
          background: 'linear-gradient(180deg, rgba(62,40,20,0.92) 0%, rgba(40,26,12,0.95) 100%)',
          borderRadius: '12px',
          border: '2px solid rgba(180,140,60,0.5)',
          boxShadow: '0 3px 10px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,215,0,0.15)',
        }}
      >
        {/* Avatar */}
        <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0"
          style={{
            border: '2px solid rgba(180,140,60,0.7)',
            boxShadow: '0 0 6px rgba(180,140,60,0.3)',
          }}
        >
          {profilePhoto ? (
            <img src={profilePhoto} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-amber-900 text-amber-300 font-black text-sm">
              {playerName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* Resource badges */}
        <div className="flex items-center gap-1.5 flex-1 overflow-x-auto">
          <ResourceBadge icon={dimsumImg} value={storeData.totalDimsum} color="#fbbf24" />
          <ResourceBadge icon={coinImg} value={totalStars} color="#fbbf24" label="★" />
          <ResourceBadge icon={chestClosed} value={storeData.tickets} color="#c084fc" />
        </div>

        {/* Settings gear */}
        <button onClick={onSettings} className="w-8 h-8 rounded-lg flex items-center justify-center transition active:scale-90"
          style={{
            background: 'linear-gradient(180deg, rgba(80,50,20,0.8) 0%, rgba(50,30,10,0.9) 100%)',
            border: '1px solid rgba(180,140,60,0.4)',
          }}
        >
          <img src={magicIcon} alt="settings" className="w-5 h-5" style={{ filter: 'brightness(1.3)' }} />
        </button>
      </div>

      {/* ── Main Scrollable Content ── */}
      <div className="relative z-10 flex-1 flex flex-col items-center px-3 overflow-y-auto">
        {/* Player Banner */}
        <div className="w-full rounded-xl p-3 mb-2.5 relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(62,40,20,0.9) 0%, rgba(40,26,12,0.95) 100%)',
            border: '2px solid rgba(180,140,60,0.45)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,215,0,0.1)',
          }}
        >
          {/* Decorative crown bg */}
          <div className="absolute top-1 right-1 opacity-10">
            <img src={crownImg} alt="" className="w-20 h-20" />
          </div>
          <div className="flex items-center gap-3">
            <div className="relative flex-shrink-0">
              <div className="w-14 h-14 rounded-xl overflow-hidden"
                style={{
                  border: '2px solid rgba(180,140,60,0.6)',
                  boxShadow: '0 0 10px rgba(180,140,60,0.2)',
                }}
              >
                {profilePhoto ? (
                  <img src={profilePhoto} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-amber-900 text-amber-300 font-black text-xl">
                    {playerName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              {/* Character icon overlay */}
              {characterImage && (
                <button onClick={onChangeCharacter}
                  className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full overflow-hidden transition active:scale-90"
                  style={{
                    border: '2px solid rgba(180,140,60,0.7)',
                    background: 'rgba(62,40,20,0.95)',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
                  }}
                  title="Change Character"
                >
                  <img src={characterImage} alt="char" className="w-full h-full object-cover" />
                </button>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-black text-amber-100 truncate drop-shadow-md">{playerName}</h2>
              <div className="text-[10px] font-bold text-amber-500/80 uppercase tracking-wider">Dimsum Collector</div>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-[10px] text-amber-400/70 flex items-center gap-0.5">
                  <img src={coinImg} alt="" className="w-3 h-3" /> {totalStars}/{maxStars}
                </span>
                <span className="text-[10px] text-amber-400/70">✅ {completedLevels}/{LEVELS.length}</span>
              </div>
            </div>
          </div>

          {/* Ticket Progress Bar */}
          <div className="mt-2.5 rounded-lg p-2"
            style={{
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(180,140,60,0.2)',
            }}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] font-bold text-amber-500/70 uppercase tracking-wider">Next Ticket</span>
              <div className="flex items-center gap-1">
                <img src={dimsumImg} alt="" className="w-3 h-3" />
                <span className="text-[9px] font-bold text-amber-300">{ticketProgress.current}/{ticketProgress.needed}</span>
              </div>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(180,140,60,0.15)' }}>
              <div className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(ticketProgress.current / ticketProgress.needed) * 100}%`,
                  background: 'linear-gradient(90deg, #b45309, #f59e0b, #fbbf24)',
                  boxShadow: '0 0 6px rgba(245,158,11,0.4)',
                }}
              />
            </div>
          </div>
        </div>

        {/* ── BATTLE Button ── */}
        <button onClick={onPlay}
          className="w-full py-4 rounded-xl text-base font-black uppercase tracking-widest mb-2.5 transition active:scale-[0.97] relative overflow-hidden flex items-center justify-center gap-2"
          style={{
            background: 'linear-gradient(180deg, #b45309 0%, #92400e 40%, #78350f 100%)',
            border: '2px solid rgba(251,191,36,0.5)',
            boxShadow: '0 4px 20px rgba(180,100,10,0.5), inset 0 2px 0 rgba(255,215,0,0.2), inset 0 -2px 0 rgba(0,0,0,0.3)',
            color: '#fef3c7',
            textShadow: '0 2px 4px rgba(0,0,0,0.5)',
          }}
        >
          <img src={swordIcon} alt="" className="w-6 h-6" style={{ filter: 'brightness(1.5)' }} />
          <span>Battle</span>
          <div className="absolute inset-0 opacity-15" style={{
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
            animation: 'shimmer 2.5s ease-in-out infinite',
          }} />
        </button>

        {/* ── Stats Row ── */}
        <div className="grid grid-cols-2 gap-2 w-full mb-2.5">
          <StatPanel icon={dimsumImg} label="Dimsum" value={storeData.totalDimsum} />
          <StatPanel icon={chestClosed} label="Tickets" value={storeData.tickets} />
        </div>

        {/* ── Menu Grid ── */}
        <div className="grid grid-cols-2 gap-2 w-full mb-3">
          <MenuCard icon={crownImg} label="Leaderboard" desc="Rankings" onClick={onLeaderboard} badge={null} />
          <MenuCard icon={shieldImg} label="Inventory" desc="Your items" onClick={onInventory}
            badge={storeData.inventory.length > 0 ? storeData.inventory.length : null} />
          <MenuCard icon={chestClosed} label="Mystery Box" desc="Open rewards" onClick={onMysteryBox}
            badge={storeData.tickets > 0 ? storeData.tickets : null} />
          <MenuCard icon={pearlImg} label="Rewards" desc="View prizes" onClick={() => onInventory()}
            badge={storeData.mysteryBoxRewards.length > 0 ? storeData.mysteryBoxRewards.length : null} />
        </div>
      </div>

      {/* ── Bottom Navigation Bar ── */}
      <div className="relative z-10 flex items-center justify-around px-2 py-1.5 mx-2 rounded-xl"
        style={{
          background: 'linear-gradient(180deg, rgba(62,40,20,0.95) 0%, rgba(40,26,12,0.98) 100%)',
          border: '2px solid rgba(180,140,60,0.4)',
          boxShadow: '0 -2px 10px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,215,0,0.1)',
        }}
      >
        <NavBtn icon={swordIcon} label="Battle" active onClick={onPlay} />
        <NavBtn icon={crownImg} label="Rank" onClick={onLeaderboard} />
        <NavBtn icon={shieldImg} label="Items" onClick={onInventory} />
        <NavBtn icon={chestClosed} label="Box" onClick={onMysteryBox} badge={storeData.tickets > 0} />
        <NavBtn icon={magicIcon} label="More" onClick={onSettings} />
      </div>

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};

/* ─── Sub Components ─────────────────────────────────────────────────────── */

const ResourceBadge: React.FC<{ icon: string; value: number; color: string; label?: string }> = ({ icon, value, color }) => (
  <div className="flex items-center gap-1 rounded-lg px-2 py-0.5"
    style={{
      background: 'rgba(0,0,0,0.35)',
      border: '1px solid rgba(180,140,60,0.2)',
    }}
  >
    <img src={icon} alt="" className="w-4 h-4" />
    <span className="text-xs font-black" style={{ color }}>{value}</span>
  </div>
);

const StatPanel: React.FC<{ icon: string; label: string; value: number }> = ({ icon, label, value }) => (
  <div className="rounded-xl p-3 flex items-center gap-2.5"
    style={{
      background: 'linear-gradient(135deg, rgba(62,40,20,0.85) 0%, rgba(40,26,12,0.9) 100%)',
      border: '2px solid rgba(180,140,60,0.3)',
      boxShadow: 'inset 0 1px 0 rgba(255,215,0,0.08)',
    }}
  >
    <img src={icon} alt="" className="w-9 h-9" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' }} />
    <div>
      <div className="text-lg font-black text-amber-300 drop-shadow-md">{value}</div>
      <div className="text-[8px] font-bold text-amber-600 uppercase tracking-wider">{label}</div>
    </div>
  </div>
);

const MenuCard: React.FC<{ icon: string; label: string; desc: string; badge: number | null; onClick: () => void }> = ({ icon, label, desc, badge, onClick }) => (
  <button onClick={onClick}
    className="relative rounded-xl p-3 text-left transition active:scale-[0.97]"
    style={{
      background: 'linear-gradient(135deg, rgba(62,40,20,0.8) 0%, rgba(40,26,12,0.85) 100%)',
      border: '2px solid rgba(180,140,60,0.25)',
      boxShadow: 'inset 0 1px 0 rgba(255,215,0,0.06)',
    }}
  >
    <div className="flex items-center gap-2.5">
      <img src={icon} alt="" className="w-8 h-8" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' }} />
      <div>
        <div className="text-xs font-black text-amber-200">{label}</div>
        <div className="text-[9px] text-amber-600/70">{desc}</div>
      </div>
    </div>
    {badge !== null && (
      <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white"
        style={{ background: 'linear-gradient(180deg, #dc2626, #991b1b)', border: '1px solid rgba(255,255,255,0.2)', boxShadow: '0 2px 6px rgba(220,38,38,0.5)' }}
      >{badge}</div>
    )}
  </button>
);

const NavBtn: React.FC<{ icon: string; label: string; active?: boolean; badge?: boolean; onClick: () => void }> = ({ icon, label, active, badge, onClick }) => (
  <button onClick={onClick}
    className="relative flex flex-col items-center gap-0.5 px-2.5 py-1 rounded-lg transition active:scale-90"
    style={active ? {
      background: 'rgba(180,140,60,0.15)',
      boxShadow: '0 0 8px rgba(180,140,60,0.15)',
    } : {}}
  >
    <img src={icon} alt="" className="w-5 h-5" style={{ filter: active ? 'brightness(1.4)' : 'brightness(0.7) grayscale(0.3)' }} />
    <span className={`text-[8px] font-bold uppercase tracking-wider ${active ? 'text-amber-400' : 'text-amber-700'}`}>{label}</span>
    {active && (
      <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full" style={{ background: '#b45309' }} />
    )}
    {badge && (
      <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full"
        style={{ background: 'linear-gradient(180deg, #dc2626, #991b1b)', boxShadow: '0 0 4px rgba(220,38,38,0.5)' }}
      />
    )}
  </button>
);
