import React, { useState, useEffect, useCallback } from 'react';
import type { GameStoreData, MysteryBoxReward } from '../../store/gameStore';
import { saveGameData } from '../../store/gameStore';
import { redeemMysteryBoxByCode, fetchUserMysteryBoxes, updateMysteryBoxWishFlow } from '../../lib/gameService';
import { generateBirthdayWishResponse } from '../../lib/wishService';
import type { MysteryBoxWithDetails } from '../../lib/gameService';
import { supabase } from '../../lib/supabase';
import { useMysteryBoxRealtime } from '../../hooks/useMysteryBoxRealtime';
import chestClosed from '../../assets/underwater/Neutral/æhest_closed.webp';
import chestAjar from '../../assets/underwater/Neutral/æhest_ajar.webp';
import chestOpen from '../../assets/underwater/Neutral/æhest_open.webp';
import heartImg from '../../assets/underwater/Bonus/Heart.webp';
import pearlImg from '../../assets/underwater/Bonus/Pearl.webp';
import crownImg from '../../assets/underwater/Bonus/Crown.webp';
import shieldImg from '../../assets/underwater/Bonus/Shield.webp';
import dimsumImg from '../../assets/dimsum.png';
import goblinBayImg from '../../assets/goblinbay.webp';
import arenaBg from '../../assets/arena_background.webp';

interface MysteryBoxScreenProps {
  storeData: GameStoreData;
  onBack: () => void;
  onDataChange: (data: GameStoreData) => void;
  onSpinWheel?: () => void;
  userId?: string;
}

type Phase = 'input' | 'opening' | 'revealed' | 'history';

interface LocalRedeemResult {
  reward: MysteryBoxReward;
  extraRewards?: MysteryBoxReward[];
}

const REWARD_IMAGES: Record<string, string> = {
  birthday_card: heartImg, inventory_item: shieldImg, dimsum_bonus: dimsumImg,
  cosmetic: crownImg, spin_ticket: pearlImg,
};

export const MysteryBoxScreen: React.FC<MysteryBoxScreenProps> = ({
  storeData,
  onBack,
  onDataChange,
  onSpinWheel,
  userId,
}) => {
  const [phase, setPhase] = useState<Phase>('input');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [openedBox, setOpenedBox] = useState<MysteryBoxWithDetails | null>(null);
  const [localReward, setLocalReward] = useState<LocalRedeemResult | null>(null);
  const [chestState, setChestState] = useState<'closed' | 'ajar' | 'open'>('closed');
  const [showReward, setShowReward] = useState(false);
  const [userBoxes, setUserBoxes] = useState<MysteryBoxWithDetails[]>([]);
  const [loadingBoxes, setLoadingBoxes] = useState(false);

  // Enable realtime updates for mystery boxes
  useMysteryBoxRealtime(userId);

  const refreshUserBoxes = useCallback(async () => {
    if (!userId) return;
    setLoadingBoxes(true);
    try {
      const boxes = await fetchUserMysteryBoxes(userId);
      setUserBoxes(boxes);
    } finally {
      setLoadingBoxes(false);
    }
  }, [userId]);

  // Fetch user's mystery boxes from Supabase
  useEffect(() => {
    refreshUserBoxes();
  }, [refreshUserBoxes]);

  // Realtime sync for mystery boxes assigned to current user
  useEffect(() => {
    if (!userId) return;

    let refreshTimeout: number | null = null;
    const scheduleRefresh = () => {
      if (refreshTimeout) clearTimeout(refreshTimeout);
      refreshTimeout = window.setTimeout(() => {
        refreshUserBoxes().catch(console.error);
      }, 180);
    };

    const channel = supabase
      .channel(`mystery-box-user:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mystery_boxes', filter: `assigned_to=eq.${userId}` },
        scheduleRefresh,
      )
      .subscribe();

    return () => {
      if (refreshTimeout) clearTimeout(refreshTimeout);
      supabase.removeChannel(channel);
    };
  }, [userId, refreshUserBoxes]);

  // Check if user has any pending spin tickets in rewards
  const spinTicketCount = storeData.mysteryBoxRewards
    .filter(r => r.type === 'spin_ticket')
    .reduce((sum, r) => sum + (r.spins || 0), 0);

  const handleRedeem = async () => {
    setError('');
    if (!code.trim()) {
      setError('Enter a redemption code');
      return;
    }

    const trimmedCode = code.trim();

    // Non-birthday codes — use Supabase flow
    if (!userId) {
      setError('Please log in to redeem codes');
      return;
    }

    setLoading(true);
    try {
      if (storeData.tickets <= 0) {
        setError('You need at least 1 ticket to open a mystery box');
        setLoading(false);
        return;
      }

      const result = await redeemMysteryBoxByCode(userId, trimmedCode);

      if (!result.success || !result.box) {
        setError(result.error || 'Invalid or already redeemed code');
        setLoading(false);
        return;
      }

      setOpenedBox(result.box);

      // Also save the reward locally for display in rewards tab
      const localRewardData: MysteryBoxReward = {
        id: result.box.id,
        type: result.box.card_title ? 'birthday_card' : 'inventory_item',
        name: result.box.prize_name || result.box.card_title || result.box.name,
        description: result.box.prize_description || result.box.card_message || 'Mystery box reward',
        icon: result.box.prize_icon || result.box.card_icon || '🎁',
        message: result.box.card_message || result.box.custom_message || undefined,
        claimed: true,
        claimedAt: Date.now(),
      };

      // If spin wheel is included, add spin ticket reward
      const extras: MysteryBoxReward[] = [];
      if (result.box.include_spin_wheel && result.box.spin_count > 0) {
        extras.push({
          id: `spin_from_box_${Date.now()}`,
          type: 'spin_ticket',
          name: `🎰 Lucky Spin x${result.box.spin_count}`,
          description: `You won ${result.box.spin_count} spins on the Lucky Wheel!`,
          icon: '🎰',
          spins: result.box.spin_count,
          claimed: true,
          claimedAt: Date.now(),
        });
      }

      const updatedStoreData: GameStoreData = {
        ...storeData,
        tickets: Math.max(0, storeData.tickets - 1),
        ticketsUsed: storeData.ticketsUsed + 1,
        mysteryBoxRewards: [...storeData.mysteryBoxRewards, localRewardData, ...extras],
      };
      saveGameData(updatedStoreData);
      onDataChange(updatedStoreData);
      setLocalReward({ reward: localRewardData, extraRewards: extras.length > 0 ? extras : undefined });
      setPhase('opening');

      // Refresh the user boxes list
      refreshUserBoxes();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const patchLocalWishFlow = useCallback((boxId: string, updates: Partial<MysteryBoxWithDetails>) => {
    setUserBoxes((prev) => prev.map((box) => (
      box.id === boxId
        ? { ...box, ...updates }
        : box
    )));
  }, []);

  // Chest opening animation sequence
  useEffect(() => {
    if (phase !== 'opening') return;
    const t1 = setTimeout(() => setChestState('ajar'), 800);
    const t2 = setTimeout(() => setChestState('open'), 1800);
    const t3 = setTimeout(() => {
      setPhase('revealed');
      setShowReward(true);
    }, 2500);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [phase]);

  const chestImages = { closed: chestClosed, ajar: chestAjar, open: chestOpen };
  const pendingBoxes = userBoxes.filter(b => b.status === 'pending');

  const resetState = () => {
    setPhase('input');
    setCode('');
    setChestState('closed');
    setShowReward(false);
    setOpenedBox(null);
    setLocalReward(null);
  };

  const isWishFlowPending = (boxId: string): boolean => {
    const found = userBoxes.find((b) => b.id === boxId);
    return !!found && !!found.card_title && found.wish_completed !== true;
  };

  const continueWishFlow = (box: MysteryBoxWithDetails) => {
    setOpenedBox(box);
    setLocalReward(null);
    setShowReward(true);
    setPhase('revealed');
  };

  // Determine what kind of reveal to show
  const isBirthdayReveal = localReward && localReward.reward.type === 'birthday_card';
  const hasSupabaseCard = openedBox && openedBox.card_title;
  const hasSupabasePrize = openedBox && openedBox.prize_name;
  const hasSpinReward = localReward?.extraRewards?.some(r => r.type === 'spin_ticket') ||
    (openedBox && openedBox.include_spin_wheel && openedBox.spin_count > 0);

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
          paddingLeft: 'max(8px, env(safe-area-inset-left, 8px))',
          paddingRight: 'max(8px, env(safe-area-inset-right, 8px))',
          background: 'linear-gradient(180deg, rgba(62,40,20,0.92) 0%, rgba(40,26,12,0.95) 100%)',
          borderRadius: '12px',
          border: '2px solid rgba(180,140,60,0.5)',
          boxShadow: '0 3px 10px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,215,0,0.15)',
        }}
      >
        <button onClick={onBack}
          aria-label="Back"
          className="w-11 h-11 rounded-lg flex items-center justify-center transition active:scale-95"
          style={{
            background: 'linear-gradient(180deg, rgba(80,50,20,0.8) 0%, rgba(50,30,10,0.9) 100%)',
            border: '1px solid rgba(180,140,60,0.4)',
          }}
        >
          <span className="text-amber-400 text-lg font-black">‹</span>
        </button>
        <div className="flex items-center gap-2 flex-1">
          <img src={chestClosed} alt="" className="w-6 h-6" style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.4))' }} />
          <h1 className="text-sm font-black text-amber-100 tracking-wide"
            style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}
          >MYSTERY BOX</h1>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => { resetState(); setPhase('input'); }}
            className={`px-2 py-1 rounded-lg text-[9px] font-bold transition ${
              phase !== 'history' ? 'text-amber-200 bg-amber-900/50' : 'text-amber-600/40'
            }`}
            style={{ border: '1px solid rgba(180,140,60,0.2)' }}
          >Redeem</button>
          <button
            onClick={() => setPhase('history')}
            className={`px-2 py-1 rounded-lg text-[9px] font-bold transition ${
              phase === 'history' ? 'text-amber-200 bg-amber-900/50' : 'text-amber-600/40'
            }`}
            style={{ border: '1px solid rgba(180,140,60,0.2)' }}
          >My Boxes ({userBoxes.length})</button>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="relative z-10 flex-1 min-h-0 flex flex-col items-center justify-start px-4 pt-1 pb-4 overflow-y-auto touch-auto">
        {phase === 'input' && (
          <InputPhase
            code={code}
            onCodeChange={setCode}
            error={error}
            loading={loading}
            pendingCount={pendingBoxes.length}
            spinTicketCount={spinTicketCount}
            onRedeem={handleRedeem}
            onSpinWheel={onSpinWheel}
          />
        )}

        {phase === 'opening' && (
          <OpeningPhase
            chestImage={chestImages[chestState]}
            chestState={chestState}
            isBirthday={!!isBirthdayReveal || !!hasSupabaseCard}
          />
        )}

        {phase === 'revealed' && (
          <RevealedPhase
            box={openedBox}
            localReward={localReward}
            isBirthdayReveal={!!isBirthdayReveal || !!hasSupabaseCard}
            hasSpinReward={!!hasSpinReward}
            showReward={showReward}
            onClose={resetState}
            onSpinWheel={onSpinWheel}
            onWishFlowSync={patchLocalWishFlow}
          />
        )}

        {phase === 'history' && (
          <HistoryPhase
            boxes={userBoxes}
            loading={loadingBoxes}
            isWishFlowPending={isWishFlowPending}
            onContinueWish={continueWishFlow}
          />
        )}
      </div>
    </div>
  );
};

/* ─── Input Phase ──────────────────────────────────────────────────────── */

const InputPhase: React.FC<{
  code: string;
  onCodeChange: (c: string) => void;
  error: string;
  loading: boolean;
  pendingCount: number;
  spinTicketCount: number;
  onRedeem: () => void;
  onSpinWheel?: () => void;
}> = ({ code, onCodeChange, error, loading, pendingCount, spinTicketCount, onRedeem, onSpinWheel }) => {
  return (
    <div className="w-full max-w-xs space-y-4">
      {/* Chest Display */}
      <div className="flex flex-col items-center mb-2">
        <img src={chestClosed} alt="" className="w-24 h-24 mb-3"
          style={{ filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.5))', animation: 'chestFloat 2s ease-in-out infinite' }}
        />
        <p className="text-sm font-bold text-amber-300 text-center">Enter your code to open!</p>
        <p className="text-[10px] text-amber-600/60 text-center mt-1">Need 1 ticket + code from admin</p>
      </div>

      {/* Pending boxes notification */}
      {pendingCount > 0 && (
        <div className="flex items-center justify-center gap-2 rounded-xl px-4 py-2"
          style={{ background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.3)' }}
        >
          <img src={chestClosed} alt="" className="w-5 h-5" />
          <span className="text-xs font-bold text-amber-400">
            {pendingCount} mystery box{pendingCount > 1 ? 'es' : ''} with code waiting!
          </span>
        </div>
      )}

      {/* Spin Wheel Banner — show if user has spin tickets */}
      {spinTicketCount > 0 && onSpinWheel && (
        <button onClick={onSpinWheel}
          className="w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3 transition active:scale-[0.97]"
          style={{
            background: 'linear-gradient(135deg, rgba(192,132,252,0.15), rgba(139,92,246,0.1))',
            border: '2px solid rgba(192,132,252,0.4)',
            boxShadow: '0 0 15px rgba(192,132,252,0.1)',
          }}
        >
          <span className="text-xl">🎰</span>
          <div className="text-left flex-1">
            <p className="text-xs font-black text-purple-300">Lucky Spin Available!</p>
            <p className="text-[9px] text-purple-400/70">You have {spinTicketCount} free spin{spinTicketCount > 1 ? 's' : ''} waiting</p>
          </div>
          <span className="text-purple-400 text-lg font-bold animate-pulse">→</span>
        </button>
      )}

      {/* Code Input */}
      <div className="rounded-xl p-3"
        style={{
          background: 'linear-gradient(135deg, rgba(62,40,20,0.85) 0%, rgba(40,26,12,0.9) 100%)',
          border: '2px solid rgba(180,140,60,0.3)',
        }}
      >
        <label className="text-[9px] font-bold text-amber-500/70 uppercase tracking-wider mb-1.5 block">
          Redemption Code
        </label>
        <input
          type="text"
          value={code}
          onChange={e => onCodeChange(e.target.value.toUpperCase())}
          placeholder="MB-XXXXXXXX"
          className="w-full px-3 py-2.5 rounded-lg text-sm font-bold text-amber-200 placeholder-amber-800/40 text-center tracking-[0.2em] outline-none"
          style={{
            background: 'rgba(0,0,0,0.4)',
            border: '1px solid rgba(180,140,60,0.2)',
          }}
        />
        {error && (
          <p className="text-[10px] text-red-400 text-center mt-2 font-bold">{error}</p>
        )}
      </div>

      {/* Redeem Button */}
      <button onClick={onRedeem}
        disabled={loading}
        className="w-full py-3 rounded-xl text-sm font-black uppercase tracking-widest transition active:scale-[0.97] flex items-center justify-center gap-2"
        style={{
          background: loading ? 'rgba(60,40,20,0.5)'
            : 'linear-gradient(180deg, #b45309 0%, #78350f 100%)',
          border: `2px solid ${loading ? 'rgba(80,60,30,0.2)' : 'rgba(251,191,36,0.4)'}`,
          boxShadow: loading ? 'none' : '0 4px 12px rgba(180,100,10,0.3), inset 0 1px 0 rgba(255,215,0,0.15)',
          color: loading ? 'rgba(180,140,60,0.3)' : '#fef3c7',
          textShadow: loading ? 'none' : '0 2px 4px rgba(0,0,0,0.5)',
          opacity: loading ? 0.5 : 1,
        }}
      >
        {loading ? (
          <span className="animate-pulse">Opening...</span>
        ) : (
          <>
            <img src={chestClosed} alt="" className="w-5 h-5" style={{ filter: 'brightness(1.3)' }} />
            Open Box
          </>
        )}
      </button>

      <style>{`
        @keyframes chestFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
};

/* ─── Opening Phase ────────────────────────────────────────────────────── */

const OpeningPhase: React.FC<{
  chestImage: string;
  chestState: string;
  isBirthday?: boolean;
}> = ({ chestImage, chestState, isBirthday }) => (
  <div className="flex flex-col items-center">
    <div className="relative">
      <div className="absolute inset-0 -m-8 rounded-full"
        style={{
          background: `radial-gradient(circle, ${
            chestState === 'open'
              ? isBirthday ? 'rgba(192,132,252,0.4)' : 'rgba(251,191,36,0.3)'
              : isBirthday ? 'rgba(192,132,252,0.15)' : 'rgba(251,191,36,0.1)'
          }, transparent 70%)`,
          animation: 'pulse 1.5s ease-in-out infinite',
        }}
      />
      <img src={chestImage} alt=""
        className="w-32 h-32 relative z-10"
        style={{
          filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.6))',
          animation: chestState === 'ajar' ? 'chestShake 0.3s ease-in-out infinite' : undefined,
          transform: chestState === 'open' ? 'scale(1.1)' : 'scale(1)',
          transition: 'transform 0.5s ease-out',
        }}
      />
    </div>
    <p className={`text-sm font-bold mt-4 animate-pulse ${isBirthday ? 'text-purple-300' : 'text-amber-400'}`}
      style={{ textShadow: `0 0 8px ${isBirthday ? 'rgba(192,132,252,0.4)' : 'rgba(251,191,36,0.4)'}` }}
    >
      {chestState === 'closed' ? (isBirthday ? '🎂 Preparing birthday surprise...' : 'Preparing...')
        : chestState === 'ajar' ? 'Opening...'
        : isBirthday ? '🎉 Happy Birthday!' : 'Revealing!'}
    </p>
    <style>{`
      @keyframes chestShake {
        0%, 100% { transform: rotate(-2deg); }
        50% { transform: rotate(2deg); }
      }
      @keyframes pulse {
        0%, 100% { opacity: 0.5; }
        50% { opacity: 1; }
      }
    `}</style>
  </div>
);

/* ─── Combined Revealed Phase ──────────────────────────────────────────── */

const RevealedPhase: React.FC<{
  box: MysteryBoxWithDetails | null;
  localReward: LocalRedeemResult | null;
  isBirthdayReveal: boolean;
  hasSpinReward: boolean;
  showReward: boolean;
  onClose: () => void;
  onSpinWheel?: () => void;
  onWishFlowSync?: (boxId: string, updates: Partial<MysteryBoxWithDetails>) => void;
}> = ({ box, localReward, isBirthdayReveal, hasSpinReward, showReward, onClose, onSpinWheel, onWishFlowSync }) => {
  // Determine content source
  const reward = localReward?.reward;
  const extraRewards = localReward?.extraRewards;
  const hasPrize = box?.prize_name;
  const hasCard = box?.card_title || (reward?.type === 'birthday_card');
  const [wishStep, setWishStep] = useState<'intro' | 'input' | 'goblin_ack' | 'done'>('intro');
  const [wishInput, setWishInput] = useState('');
  const [birthDay, setBirthDay] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [wishGenerating, setWishGenerating] = useState(false);
  const [wishReply, setWishReply] = useState('');
  const wishDone = wishStep === 'done';

  useEffect(() => {
    if (!isBirthdayReveal) return;
    if (!box) return;
    const step = (box.wish_flow_step as 'intro' | 'input' | 'goblin_ack' | 'done' | null) || (box.wish_completed ? 'done' : 'intro');
    setWishStep(step);
    setWishInput(box.wish_input || '');
    setBirthDay(box.wish_birth_day ? String(box.wish_birth_day) : '');
    setBirthMonth(box.wish_birth_month ? String(box.wish_birth_month) : '');
    setWishReply(box.wish_ai_reply || '');
  }, [box, isBirthdayReveal]);

  useEffect(() => {
    if (!isBirthdayReveal || !box) return;
    const updates: Partial<MysteryBoxWithDetails> = {
      wish_flow_step: wishStep,
      wish_input: wishInput || null,
      wish_birth_day: birthDay ? parseInt(birthDay, 10) : null,
      wish_birth_month: birthMonth ? parseInt(birthMonth, 10) : null,
      wish_ai_reply: wishReply || null,
      wish_completed: wishDone,
    };

    // Optimistic local sync so History tab reflects latest step immediately
    onWishFlowSync?.(box.id, updates);

    updateMysteryBoxWishFlow(box.id, {
      ...updates,
    }).catch(() => undefined);
  }, [box, isBirthdayReveal, wishStep, wishInput, birthDay, birthMonth, wishReply, wishDone, onWishFlowSync]);

  const canShowOtherRewards = !isBirthdayReveal || wishDone;

  const borderColor = hasCard || isBirthdayReveal ? 'rgba(192,132,252,0.5)' : 'rgba(180,140,60,0.5)';

  const submitWish = async () => {
    const day = parseInt(birthDay, 10);
    const month = parseInt(birthMonth, 10);
    if (wishInput.trim().length < 3 || wishGenerating) return;
    if (!Number.isFinite(day) || !Number.isFinite(month) || day < 1 || day > 31 || month < 1 || month > 12) return;
    setWishGenerating(true);
    try {
      const ai = await generateBirthdayWishResponse(wishInput, day, month);
      setWishReply(ai.text);
      setWishStep('goblin_ack');
    } finally {
      setWishGenerating(false);
    }
  };

  return (
    <div
      className={`flex h-full min-h-0 w-full max-w-sm flex-col items-center self-stretch overflow-y-auto overscroll-contain touch-auto px-0.5 pb-16 transition-all duration-700 ${showReward ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      {/* ── Birthday Card Section ── */}
      {isBirthdayReveal && (
        <div className="relative mb-4 w-full rounded-2xl p-5"
          style={{
            background: 'linear-gradient(135deg, rgba(62,40,20,0.95) 0%, rgba(40,26,12,0.98) 100%)',
            border: `3px solid ${borderColor}`,
            boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 30px rgba(192,132,252,0.15), inset 0 1px 0 rgba(255,215,0,0.15)',
          }}
        >
          {/* Decorative sparkles */}
          <div className="absolute top-2 right-3 text-2xl opacity-30 animate-pulse">✨</div>
          <div className="absolute bottom-3 left-3 text-xl opacity-20 animate-pulse" style={{ animationDelay: '0.5s' }}>🎉</div>
          <div className="absolute top-3 left-3 text-lg opacity-15 animate-pulse" style={{ animationDelay: '1s' }}>🎈</div>

          <div className="text-center">
            <div className="text-5xl mb-3">{box?.card_icon || '🎂'}</div>
            <h2 className="text-xl font-black text-purple-200 mb-2" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
              {box?.card_title || reward?.name || 'Birthday Card'}
            </h2>
            <div className="w-12 h-0.5 mx-auto rounded-full mb-3" style={{ background: 'linear-gradient(90deg, transparent, rgba(192,132,252,0.6), transparent)' }} />

            {/* Birthday message */}
            <div className="rounded-xl p-4 mb-3"
              style={{
                background: box?.card_background_color || 'linear-gradient(135deg, rgba(192,132,252,0.08), rgba(192,132,252,0.03))',
                border: '1.5px solid rgba(192,132,252,0.2)',
              }}
            >
              {(box?.card_message || reward?.message || '').split('\n').map((line, i) => (
                <p key={i} className={`text-sm leading-relaxed ${line.trim() ? '' : 'h-3'}`}
                  style={{ color: box?.card_text_color || '#e9d5ff', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
                >
                  {line}
                </p>
              ))}
            </div>

            <p className="text-xs text-amber-500/60">{reward?.description || box?.prize_description || ''}</p>

            {/* Mandatory wish flow for birthday reveal */}
            {!wishDone && (
              <div className="mt-4 rounded-xl p-3 text-left"
                style={{ background: 'rgba(109,40,217,0.18)', border: '1px solid rgba(192,132,252,0.28)' }}
              >
                {wishStep === 'intro' && (
                  <div className="space-y-2">
                    <div className="flex items-end gap-2">
                      <img src={goblinBayImg} alt="Goblin Bay" className="w-10 h-10 rounded-md object-cover" />
                      <div className="rounded-2xl px-3 py-2" style={{ background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.35)' }}>
                        <p className="text-[10px] text-emerald-300/80 font-bold mb-0.5">Goblin Bay</p>
                        <p className="text-xs text-emerald-100">Buat wish dulu sayang ✨</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setWishStep('input')}
                      className="w-full py-2.5 rounded-lg text-xs font-black uppercase tracking-wide"
                      style={{
                        background: 'linear-gradient(180deg, #7c3aed 0%, #5b21b6 100%)',
                        border: '1px solid rgba(192,132,252,0.5)',
                        color: '#f5f3ff',
                      }}
                    >
                      Next
                    </button>
                  </div>
                )}

                {wishStep === 'input' && (
                  <div className="space-y-2 flex flex-col pb-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-purple-300/80 block mb-1">Tanggal Lahir</label>
                        <input
                          type="number"
                          min={1}
                          max={31}
                          value={birthDay}
                          onChange={(e) => setBirthDay(e.target.value)}
                          className="w-full px-2 py-2 rounded-lg text-xs outline-none"
                          style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(192,132,252,0.35)', color: '#e9d5ff' }}
                          placeholder="1-31"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-purple-300/80 block mb-1">Bulan Lahir</label>
                        <input
                          type="number"
                          min={1}
                          max={12}
                          value={birthMonth}
                          onChange={(e) => setBirthMonth(e.target.value)}
                          className="w-full px-2 py-2 rounded-lg text-xs outline-none"
                          style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(192,132,252,0.35)', color: '#e9d5ff' }}
                          placeholder="1-12"
                        />
                      </div>
                    </div>

                    <textarea
                      value={wishInput}
                      onChange={(e) => setWishInput(e.target.value)}
                      rows={3}
                      placeholder="Tulis wish kamu di sini..."
                      className="w-full px-3 py-2 rounded-lg text-xs outline-none resize-none"
                      style={{
                        background: 'rgba(0,0,0,0.35)',
                        border: '1px solid rgba(192,132,252,0.35)',
                        color: '#e9d5ff',
                      }}
                    />
                    {wishGenerating && (
                      <div className="rounded-lg px-3 py-2 flex items-center gap-2"
                        style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(96,165,250,0.25)' }}
                      >
                        <img
                          src={goblinBayImg}
                          alt="Goblin Bay"
                          className="w-8 h-8 object-cover rounded-md"
                        />
                        <p className="text-[11px] text-blue-200">Goblin Bay sedang merangkai jawaban romantis buat kamu... ✨</p>
                      </div>
                    )}

                    <button
                      onClick={submitWish}
                      disabled={
                        wishGenerating ||
                        wishInput.trim().length < 3 ||
                        !birthDay ||
                        !birthMonth ||
                        (parseInt(birthDay, 10) < 1 || parseInt(birthDay, 10) > 31) ||
                        (parseInt(birthMonth, 10) < 1 || parseInt(birthMonth, 10) > 12)
                      }
                      className="w-full py-2.5 mt-2 rounded-lg text-xs font-black uppercase tracking-wide disabled:opacity-50"
                      style={{
                        background: 'linear-gradient(180deg, #7c3aed 0%, #5b21b6 100%)',
                        border: '1px solid rgba(192,132,252,0.5)',
                        color: '#f5f3ff',
                      }}
                    >
                      {wishGenerating ? '🧌 Goblin Bay lagi jawab...' : '✨ Kirim Wish ke Goblin Bay'}
                    </button>
                  </div>
                )}

                {wishStep === 'goblin_ack' && (
                  <div className="space-y-2">
                    <div className="flex items-end gap-2">
                      <img src={goblinBayImg} alt="Goblin Bay" className="w-10 h-10 rounded-md object-cover" />
                      <div className="rounded-2xl px-3 py-2" style={{ background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.35)' }}>
                        <p className="text-[10px] text-emerald-300/80 font-bold mb-0.5">Goblin Bay</p>
                        <p className="text-xs text-emerald-100">Wish yang sangat bagus, saya akan mewujudkannya... 💫</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setWishStep('done')}
                      className="w-full py-2.5 rounded-lg text-xs font-black uppercase tracking-wide"
                      style={{
                        background: 'linear-gradient(180deg, #059669 0%, #047857 100%)',
                        border: '1px solid rgba(16,185,129,0.5)',
                        color: '#ecfdf5',
                      }}
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* AI reply shown before other rewards */}
            {wishDone && wishReply && (
              <div className="mt-4 rounded-xl p-3"
                style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)' }}
              >
                <p className="text-[10px] text-emerald-300/80 mb-2 font-bold">Percakapan dengan Goblin Bay</p>

                {/* User bubble (right) */}
                <div className="flex justify-end mb-2">
                  <div className="max-w-[85%] rounded-2xl px-3 py-2"
                    style={{ background: 'rgba(124,58,237,0.28)', border: '1px solid rgba(192,132,252,0.4)' }}
                  >
                    <p className="text-[10px] text-purple-300/80 mb-0.5 font-bold text-right">Kamu</p>
                    <p className="text-xs text-purple-100 leading-relaxed text-right">{wishInput}</p>
                  </div>
                </div>

                {/* Goblin bubble (left) */}
                <div className="flex items-end gap-2">
                  <img
                    src={goblinBayImg}
                    alt="Goblin Bay"
                    className="w-10 h-10 object-cover rounded-md flex-shrink-0"
                    style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.4))' }}
                  />
                  <div className="max-w-[85%] rounded-2xl px-3 py-2"
                    style={{ background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.35)' }}
                  >
                    <p className="text-[10px] text-emerald-300/80 mb-0.5 font-bold">Goblin Bay</p>
                    {wishReply.split('\n').map((line, i) => (
                      <p key={i} className={`text-xs leading-relaxed ${line.trim() ? 'text-emerald-100' : 'h-2'}`}>
                        {line}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Prompt preview intentionally hidden from player UI */}
          </div>
        </div>
      )}

      {/* ── Non-birthday Prize Section ── */}
      {canShowOtherRewards && (hasPrize || reward) && (!isBirthdayReveal || hasPrize) && (
        <div className="w-full rounded-xl p-4 mb-4 text-center"
          style={{
            background: 'linear-gradient(135deg, rgba(62,40,20,0.9) 0%, rgba(40,26,12,0.95) 100%)',
            border: `2px solid ${borderColor}`,
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          }}
        >
          {/* Reward icon */}
          <div className="relative w-20 h-20 mx-auto mb-3 rounded-2xl flex items-center justify-center"
            style={{
              background: 'rgba(0,0,0,0.3)',
              border: `2px solid ${borderColor}`,
              boxShadow: `inset 0 0 20px ${hasCard ? 'rgba(192,132,252,0.1)' : 'rgba(180,140,60,0.1)'}`,
            }}
          >
            {reward ? (
              <img src={REWARD_IMAGES[reward.type] || pearlImg} alt="" className="w-12 h-12"
                style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))' }} />
            ) : (
              <span className="text-4xl">{box?.prize_icon || '🎁'}</span>
            )}
          </div>

          <p className="text-[9px] font-bold text-amber-600/60 uppercase tracking-wider mb-1">You received</p>
          <h3 className="text-base font-black text-amber-200 mb-1" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
            {box?.prize_icon || reward?.icon || ''} {box?.prize_name || reward?.name || 'Mystery Gift'}
          </h3>
          <p className="text-xs text-amber-500/60">{box?.prize_description || reward?.description || ''}</p>

          {reward?.value && (
            <div className="flex items-center justify-center gap-2 mt-3 py-2 rounded-lg"
              style={{ background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.3)' }}
            >
              <img src={dimsumImg} alt="" className="w-5 h-5" />
              <span className="text-sm font-bold text-amber-300">+{reward.value} Dimsum</span>
            </div>
          )}

          {/* Custom message from admin */}
          {box?.custom_message && (
            <div className="mt-2 rounded-lg px-3 py-2"
              style={{ background: 'rgba(180,140,60,0.1)', border: '1px solid rgba(180,140,60,0.2)' }}
            >
              <p className="text-[10px] text-amber-400 italic">"{box.custom_message}"</p>
            </div>
          )}
        </div>
      )}

      {/* ── Extra rewards (spin tickets etc.) ── */}
      {canShowOtherRewards && extraRewards && extraRewards.length > 0 && (
        <div className="w-full space-y-2 mb-4">
          {extraRewards.map((extra, i) => (
            <div key={i} className="w-full rounded-xl p-3 flex items-center gap-3"
              style={{
                background: 'linear-gradient(135deg, rgba(62,40,20,0.85), rgba(40,26,12,0.9))',
                border: '2px solid rgba(192,132,252,0.3)',
                boxShadow: '0 0 12px rgba(192,132,252,0.1)',
              }}
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                style={{ background: 'rgba(192,132,252,0.15)', border: '1px solid rgba(192,132,252,0.3)' }}
              >
                {extra.icon}
              </div>
              <div className="flex-1">
                <p className="text-sm font-black text-purple-200">{extra.name}</p>
                <p className="text-[10px] text-purple-400/70">{extra.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Spin wheel from Supabase box ── */}
      {canShowOtherRewards && !extraRewards && box?.include_spin_wheel && box.spin_count > 0 && (
        <div className="w-full rounded-xl p-3 flex items-center gap-3 mb-4"
          style={{
            background: 'linear-gradient(135deg, rgba(62,40,20,0.85), rgba(40,26,12,0.9))',
            border: '2px solid rgba(192,132,252,0.3)',
            boxShadow: '0 0 12px rgba(192,132,252,0.1)',
          }}
        >
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
            style={{ background: 'rgba(192,132,252,0.15)', border: '1px solid rgba(192,132,252,0.3)' }}
          >
            🎰
          </div>
          <div className="flex-1">
            <p className="text-sm font-black text-purple-200">🎰 Lucky Spin x{box.spin_count}</p>
            <p className="text-[10px] text-purple-400/70">You won {box.spin_count} spins on the Lucky Wheel!</p>
          </div>
        </div>
      )}

      {/* ── Action Buttons ── */}
      <div className="sticky bottom-0 z-10 w-full space-y-2 pb-1 pt-2"
        style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0), rgba(8,6,3,0.88) 35%)' }}
      >
        {canShowOtherRewards && hasSpinReward && onSpinWheel && (
          <button onClick={onSpinWheel}
            className="w-full py-3.5 rounded-xl text-sm font-black uppercase tracking-wider transition active:scale-[0.97] relative overflow-hidden flex items-center justify-center gap-2"
            style={{
              background: 'linear-gradient(180deg, #7c3aed 0%, #5b21b6 40%, #4c1d95 100%)',
              border: '2px solid rgba(192,132,252,0.5)',
              boxShadow: '0 4px 20px rgba(139,92,246,0.4), inset 0 2px 0 rgba(255,255,255,0.1)',
              color: '#f5f3ff',
              textShadow: '0 2px 4px rgba(0,0,0,0.5)',
            }}
          >
            🎰 Spin for Prizes!
            <div className="absolute inset-0 opacity-15" style={{
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
              animation: 'shimmer 2.5s ease-in-out infinite',
            }} />
          </button>
        )}

        <button onClick={onClose}
          disabled={!canShowOtherRewards}
          className="w-full py-3 rounded-xl text-sm font-bold transition active:scale-[0.97]"
          style={{
            background: 'linear-gradient(180deg, rgba(80,50,20,0.8) 0%, rgba(50,30,10,0.9) 100%)',
            border: '2px solid rgba(180,140,60,0.3)',
            color: '#d4a547',
            opacity: canShowOtherRewards ? 1 : 0.5,
          }}
        >
          {!canShowOtherRewards ? '💌 Submit Wish First' : hasSpinReward ? 'Skip & Collect' : '✨ Collect'}
        </button>
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

/* ─── History Phase ────────────────────────────────────────────────────── */

const HistoryPhase: React.FC<{
  boxes: MysteryBoxWithDetails[];
  loading: boolean;
  isWishFlowPending: (boxId: string) => boolean;
  onContinueWish: (box: MysteryBoxWithDetails) => void;
}> = ({ boxes, loading, isWishFlowPending, onContinueWish }) => {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <div className="w-8 h-8 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
        <p className="text-xs text-amber-500/60 mt-3">Loading...</p>
      </div>
    );
  }

  if (boxes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <img src={chestClosed} alt="" className="w-16 h-16 opacity-30 mb-3" />
        <p className="text-sm text-amber-500/40 font-bold">No mystery boxes yet</p>
        <p className="text-[10px] text-amber-600/30 mt-1">Ask admin for a mystery box code!</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm space-y-2 pb-4">
      {boxes.map((box) => {
        const hasCard = !!box.card_title;
        const hasSpin = box.include_spin_wheel && box.spin_count > 0;

        return (
          <div key={box.id} className="rounded-xl p-3"
            style={{
              background: 'linear-gradient(135deg, rgba(62,40,20,0.85) 0%, rgba(40,26,12,0.9) 100%)',
              border: `2px solid ${box.status === 'opened' ? hasCard ? 'rgba(192,132,252,0.3)' : 'rgba(16,185,129,0.3)' : 'rgba(251,191,36,0.3)'}`,
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                style={{
                  background: box.status === 'opened'
                    ? hasCard ? 'rgba(192,132,252,0.15)' : 'rgba(16,185,129,0.15)'
                    : 'rgba(251,191,36,0.15)',
                }}
              >
                {box.status === 'opened' ? (box.card_icon || box.prize_icon || '✅') : '📦'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-amber-200 truncate">
                  {box.card_title || box.prize_name || box.name || 'Mystery Box'}
                </p>
                <p className="text-[9px] text-amber-500/50 font-mono">
                  {box.redemption_code}
                </p>
                <button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(box.redemption_code || '');
                    } catch {
                      // ignore clipboard failure silently
                    }
                  }}
                  className="mt-1 text-[9px] font-bold px-2 py-0.5 rounded bg-amber-900/30 text-amber-300"
                >
                  📋 Copy Code
                </button>
                {/* Tags for multi-content boxes */}
                <div className="flex gap-1 mt-0.5">
                  {hasCard && (
                    <span className="text-[7px] font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">🎂 Card</span>
                  )}
                  {box.prize_name && (
                    <span className="text-[7px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">🎁 Prize</span>
                  )}
                  {hasSpin && (
                    <span className="text-[7px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">🎰 Spin</span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                  box.status === 'opened'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-amber-500/20 text-amber-400'
                }`}>
                  {box.status === 'opened' ? 'Opened' : 'Pending'}
                </span>
              </div>
            </div>

            {/* Show card message preview if opened */}
            {box.status === 'opened' && box.card_message && (
              <div className="mt-2 rounded-lg px-2 py-1.5"
                style={{
                  background: box.card_background_color || 'rgba(192,132,252,0.1)',
                  border: '1px solid rgba(192,132,252,0.15)',
                }}
              >
                <p className="text-[9px] italic" style={{ color: box.card_text_color || '#c4b5fd' }}>
                  {box.card_message.length > 80 ? box.card_message.substring(0, 80) + '...' : box.card_message}
                </p>
                {hasCard && isWishFlowPending(box.id) && (
                  <button
                    onClick={() => onContinueWish(box)}
                    className="mt-2 w-full py-1.5 rounded-lg text-[10px] font-bold"
                    style={{
                      background: 'linear-gradient(180deg, #7c3aed 0%, #5b21b6 100%)',
                      border: '1px solid rgba(192,132,252,0.45)',
                      color: '#f5f3ff',
                    }}
                  >
                    Continue Birthday Steps
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
