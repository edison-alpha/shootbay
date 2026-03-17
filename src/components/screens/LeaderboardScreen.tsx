import React, { useState, useEffect } from 'react';
import type { GameStoreData } from '../../store/gameStore';
import { getTotalStars } from '../../store/gameStore';
import { fetchLeaderboard } from '../../lib/gameService';
import type { LeaderboardRow } from '../../lib/gameService';
import dimsumImg from '../../assets/dimsum.png';
import crownImg from '../../assets/underwater/Bonus/Crown.webp';
import coinImg from '../../assets/underwater/Bonus/Coin.webp';
import shieldImg from '../../assets/underwater/Bonus/Shield.webp';
import heartImg from '../../assets/underwater/Bonus/Heart.webp';
import arenaBg from '../../assets/arena_background.webp';

interface LeaderboardScreenProps {
  storeData: GameStoreData;
  onBack: () => void;
  userId?: string;
}

export const LeaderboardScreen: React.FC<LeaderboardScreenProps> = ({
  storeData,
  onBack,
  userId,
}) => {
  const [entries, setEntries] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const totalStars = getTotalStars(storeData);

  // Fetch leaderboard from Supabase on mount
  useEffect(() => {
    setLoading(true);
    fetchLeaderboard(50)
      .then(setEntries)
      .finally(() => setLoading(false));
  }, []);

  const podiumIcons = [crownImg, shieldImg, heartImg];

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
        <div className="flex items-center gap-2 flex-1">
          <img src={crownImg} alt="" className="w-6 h-6" style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.4))' }} />
          <h1 className="text-sm font-black text-amber-100 tracking-wide"
            style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}
          >HALL OF FAME</h1>
        </div>
        <div className="flex items-center gap-1 rounded-lg px-2 py-1"
          style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(180,140,60,0.2)' }}
        >
          <img src={coinImg} alt="" className="w-4 h-4" />
          <span className="text-xs font-black text-amber-400">{totalStars}</span>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="relative z-10 flex-1 overflow-y-auto px-3 pb-4">
        {loading ? (
          /* ── Loading State ── */
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="w-10 h-10 border-3 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
            <p className="text-sm font-bold text-amber-500/60">Loading leaderboard...</p>
          </div>
        ) : entries.length === 0 ? (
          /* ── Empty State ── */
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, rgba(62,40,20,0.85) 0%, rgba(40,26,12,0.9) 100%)',
                border: '2px solid rgba(180,140,60,0.3)',
              }}
            >
              <img src={crownImg} alt="" className="w-12 h-12 opacity-40" />
            </div>
            <p className="text-sm font-bold text-amber-600/70 text-center">No warriors yet!</p>
            <p className="text-xs text-amber-700/50 text-center">Complete levels to appear on<br />the leaderboard</p>
          </div>
        ) : (
          <>
            {/* ── Top 3 Podium ── */}
            {entries.length >= 1 && (
              <div className="flex items-end justify-center gap-2 mb-4 pt-2">
                {/* 2nd place */}
                {entries[1] && (
                  <PodiumCard entry={entries[1]} rank={2} icon={podiumIcons[1]} height="h-24" isCurrentUser={entries[1].user_id === userId} />
                )}
                {/* 1st place */}
                <PodiumCard entry={entries[0]} rank={1} icon={podiumIcons[0]} height="h-32" isChampion isCurrentUser={entries[0].user_id === userId} />
                {/* 3rd place */}
                {entries[2] && (
                  <PodiumCard entry={entries[2]} rank={3} icon={podiumIcons[2]} height="h-20" isCurrentUser={entries[2].user_id === userId} />
                )}
              </div>
            )}

            {/* ── Rest of Rankings ── */}
            <div className="space-y-1.5">
              {entries.slice(3).map((entry, idx) => (
                <RankRow key={entry.id} entry={entry} rank={idx + 4} isCurrentUser={entry.user_id === userId} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

/* ─── Sub Components ─────────────────────────────────────────────────────── */

const PodiumCard: React.FC<{
  entry: LeaderboardRow;
  rank: number;
  icon: string;
  height: string;
  isChampion?: boolean;
  isCurrentUser?: boolean;
}> = ({ entry, rank, icon, height, isChampion, isCurrentUser }) => (
  <div className={`relative flex flex-col items-center ${isChampion ? 'w-28' : 'w-24'}`}>
    {/* Medal */}
    <div className="relative mb-1">
      <div className={`rounded-full overflow-hidden flex-shrink-0 ${isChampion ? 'w-14 h-14' : 'w-11 h-11'}`}
        style={{
          border: `2px solid ${isCurrentUser ? 'rgba(16,185,129,0.6)' : isChampion ? 'rgba(251,191,36,0.6)' : 'rgba(180,140,60,0.4)'}`,
          boxShadow: isChampion ? '0 0 12px rgba(251,191,36,0.3)' : 'none',
        }}
      >
        <div className="w-full h-full flex items-center justify-center bg-amber-900 text-amber-300 font-black text-lg">
          {entry.player_name.charAt(0).toUpperCase()}
        </div>
      </div>
      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
        style={{
          background: rank === 1 ? 'linear-gradient(180deg, #fbbf24, #b45309)' :
                      rank === 2 ? 'linear-gradient(180deg, #d1d5db, #6b7280)' :
                      'linear-gradient(180deg, #d97706, #92400e)',
          border: '1px solid rgba(255,255,255,0.2)',
          boxShadow: '0 2px 4px rgba(0,0,0,0.4)',
        }}
      >
        <span className="text-[9px] font-black text-white">{rank}</span>
      </div>
    </div>

    {/* Pedestal */}
    <div className={`w-full ${height} rounded-t-xl flex flex-col items-center justify-start pt-2 px-1`}
      style={{
        background: isChampion
          ? 'linear-gradient(180deg, rgba(180,140,60,0.25) 0%, rgba(62,40,20,0.9) 100%)'
          : 'linear-gradient(180deg, rgba(80,60,30,0.2) 0%, rgba(40,26,12,0.9) 100%)',
        border: `2px solid ${isCurrentUser ? 'rgba(16,185,129,0.4)' : isChampion ? 'rgba(180,140,60,0.4)' : 'rgba(80,60,30,0.25)'}`,
        borderBottom: 'none',
        boxShadow: isChampion ? 'inset 0 1px 0 rgba(255,215,0,0.1)' : 'none',
      }}
    >
      <img src={icon} alt="" className="w-5 h-5 mb-0.5" />
      <p className="text-[9px] font-black text-amber-200 text-center truncate w-full">
        {entry.player_name}
        {isCurrentUser && <span className="text-emerald-400"> (You)</span>}
      </p>
      <div className="flex items-center gap-0.5 mt-0.5">
        <img src={dimsumImg} alt="" className="w-3 h-3" />
        <span className="text-[9px] font-bold text-amber-400">{entry.total_dimsum}</span>
      </div>
      <span className="text-[8px] text-amber-600/60 mt-0.5">⭐ {entry.total_stars}</span>
    </div>
  </div>
);

const RankRow: React.FC<{ entry: LeaderboardRow; rank: number; isCurrentUser?: boolean }> = ({ entry, rank, isCurrentUser }) => (
  <div className="flex items-center gap-2.5 rounded-xl px-3 py-2"
    style={{
      background: isCurrentUser
        ? 'linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(16,185,129,0.05) 100%)'
        : 'linear-gradient(135deg, rgba(62,40,20,0.8) 0%, rgba(40,26,12,0.85) 100%)',
      border: `2px solid ${isCurrentUser ? 'rgba(16,185,129,0.3)' : 'rgba(180,140,60,0.2)'}`,
      boxShadow: 'inset 0 1px 0 rgba(255,215,0,0.05)',
    }}
  >
    <span className="w-6 text-center text-sm font-black text-amber-700/60">#{rank}</span>
    <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0"
      style={{ border: `1px solid ${isCurrentUser ? 'rgba(16,185,129,0.4)' : 'rgba(180,140,60,0.3)'}` }}
    >
      <div className="w-full h-full flex items-center justify-center bg-amber-900 text-amber-300 font-black text-sm">
        {entry.player_name.charAt(0).toUpperCase()}
      </div>
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs font-bold text-amber-200 truncate">
        {entry.player_name}
        {isCurrentUser && <span className="text-emerald-400 text-[9px] ml-1">(You)</span>}
      </p>
      <div className="flex items-center gap-2 mt-0.5">
        <span className="text-[9px] text-amber-500/70 flex items-center gap-0.5">
          <img src={dimsumImg} alt="" className="w-2.5 h-2.5" /> {entry.total_dimsum}
        </span>
        <span className="text-[9px] text-amber-500/70">⭐ {entry.total_stars}</span>
      </div>
    </div>
  </div>
);
