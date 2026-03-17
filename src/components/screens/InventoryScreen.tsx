import React, { useState, useEffect } from 'react';
import type { GameStoreData, InventoryItem, MysteryBoxReward } from '../../store/gameStore';
import { getTotalStars, getTicketProgress, redeemInventoryItem } from '../../store/gameStore';
import { fetchUserInventory, fetchUserMysteryBoxes, fetchUserVoucherRedemptions } from '../../lib/gameService';
import type { InventoryRow, MysteryBoxWithDetails, VoucherRedemptionRow } from '../../lib/gameService';
import { LEVELS } from '../../constants/levels';
import { playClickSound, playRedeemSound } from '../../utils/uiAudio';
import dimsumImg from '../../assets/dimsum.png';
import chestClosed from '../../assets/underwater/Neutral/æhest_closed.webp';
import chestOpen from '../../assets/underwater/Neutral/æhest_open.webp';
import coinImg from '../../assets/underwater/Bonus/Coin.webp';
import crownImg from '../../assets/underwater/Bonus/Crown.webp';
import shieldImg from '../../assets/underwater/Bonus/Shield.webp';
import pearlImg from '../../assets/underwater/Bonus/Pearl.webp';
import heartImg from '../../assets/underwater/Bonus/Heart.webp';
import swordIcon from '../../assets/water-fire-sprite-magic/Icons/PNG/Icons_Fire Arrow.webp';
import arenaBg from '../../assets/arena_background.webp';

// Spin prize images
import shoesImg from '../../assets/shoes.png';
import jamImg from '../../assets/jam.png';
import bajuImg from '../../assets/baju.png';

const WA_REDEEM_URL = 'https://wa.me/6285777131454';

interface InventoryScreenProps {
  storeData: GameStoreData;
  onBack: () => void;
  onDataChange?: (data: GameStoreData) => void;
  userId?: string;
}

type TabId = 'overview' | 'items' | 'rewards' | 'tickets';

type RewardView = MysteryBoxReward & {
  waStatus?: VoucherRedemptionRow['status'];
  waMessage?: string;
  waVoucherCode?: string | null;
  waCreatedAt?: string;
};

// Map item IDs to actual images
const ITEM_IMAGES: Record<string, string> = {
  spin_jam: jamImg, spin_sepatu: shoesImg, spin_baju: bajuImg, spin_dimsum: dimsumImg,
};
const TYPE_IMAGES: Record<string, string> = {
  consumable: heartImg, cosmetic: crownImg, special: pearlImg,
};
const REWARD_IMAGES: Record<string, string> = {
  birthday_card: heartImg, inventory_item: shieldImg, dimsum_bonus: dimsumImg,
  cosmetic: crownImg, spin_ticket: pearlImg,
};

export const InventoryScreen: React.FC<InventoryScreenProps> = ({
  storeData, onBack, onDataChange, userId,
}) => {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [selectedReward, setSelectedReward] = useState<RewardView | null>(null);
  const [supabaseInventory, setSupabaseInventory] = useState<InventoryRow[]>([]);
  const [supabaseBoxes, setSupabaseBoxes] = useState<MysteryBoxWithDetails[]>([]);
  const [voucherRedemptions, setVoucherRedemptions] = useState<VoucherRedemptionRow[]>([]);
  const [loadingRemote, setLoadingRemote] = useState(false);
  const totalStars = getTotalStars(storeData);
  const ticketProgress = getTicketProgress(storeData);

  // Fetch inventory + mystery boxes from Supabase
  useEffect(() => {
    if (!userId) return;
    setLoadingRemote(true);
    Promise.all([
      fetchUserInventory(userId),
      fetchUserMysteryBoxes(userId),
      fetchUserVoucherRedemptions(userId),
    ]).then(([inv, boxes, vouchers]) => {
      setSupabaseInventory(inv);
      setSupabaseBoxes(boxes);
      setVoucherRedemptions(vouchers);
    }).finally(() => setLoadingRemote(false));
  }, [userId]);

  // Merge local inventory with Supabase inventory
  const mergedInventory: InventoryItem[] = [
    ...storeData.inventory,
    ...supabaseInventory
      .filter(si => !storeData.inventory.some(li => li.id === si.id || li.name === si.item_name))
      .map(si => ({
        id: si.id,
        name: si.item_name,
        description: `${si.item_type} item`,
        icon: si.item_icon || '📦',
        quantity: si.quantity,
        type: (si.item_type === 'cosmetic' ? 'cosmetic' : si.item_type === 'special' ? 'special' : 'consumable') as InventoryItem['type'],
        redeemed: si.redeemed,
      })),
  ];

  // Convert Supabase mystery boxes to local MysteryBoxReward format for display
  const mergedRewards: RewardView[] = [
    ...storeData.mysteryBoxRewards,
    ...supabaseBoxes
      .filter(sb => sb.status === 'opened')
      .filter(sb => !storeData.mysteryBoxRewards.some(lr => lr.id === sb.id))
      .map(sb => ({
        id: sb.id,
        type: (sb.card_title ? 'birthday_card' : 'inventory_item') as MysteryBoxReward['type'],
        name: sb.prize_name || sb.card_title || sb.name,
        description: sb.prize_description || sb.card_message || 'Mystery box reward',
        icon: sb.prize_icon || sb.card_icon || '🎁',
        message: sb.card_message || sb.custom_message || undefined,
        claimed: true,
        claimedAt: sb.opened_at ? new Date(sb.opened_at).getTime() : Date.now(),
      })),
  ];

  const latestVoucher = voucherRedemptions[0];
  const rewardsWithVoucherMeta: RewardView[] = mergedRewards.map((r) => {
    if (!latestVoucher) return r;
    if (r.type !== 'spin_ticket' && r.type !== 'inventory_item') return r;
    return {
      ...r,
      waStatus: latestVoucher.status,
      waMessage: latestVoucher.message,
      waVoucherCode: latestVoucher.voucher_code,
      waCreatedAt: latestVoucher.created_at,
    };
  });

  const tabIcons: Record<TabId, string> = {
    overview: coinImg, items: shieldImg, rewards: chestOpen, tickets: chestClosed,
  };
  const tabLabels: Record<TabId, string> = {
    overview: 'Overview', items: 'Items', rewards: 'Rewards', tickets: 'Tickets',
  };

  const handleRedeem = (item: InventoryItem) => {
    playRedeemSound();
    const result = redeemInventoryItem(storeData, item.id);
    if (result && onDataChange) {
      onDataChange(result);
      const updated = result.inventory.find(i => i.id === item.id);
      setSelectedItem(updated || null);
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col overflow-hidden"
      style={{
        backgroundImage: `url(${arenaBg})`, backgroundSize: 'cover', backgroundPosition: 'center',
        paddingTop: 'max(8px, env(safe-area-inset-top, 8px))',
        paddingBottom: 'max(8px, env(safe-area-inset-bottom, 8px))',
      }}
    >
      <div className="absolute inset-0 bg-black/45 pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex items-center gap-2 px-3 py-2 mx-2 mb-2"
        style={{
          background: 'linear-gradient(180deg, rgba(62,40,20,0.92) 0%, rgba(40,26,12,0.95) 100%)',
          borderRadius: '12px', border: '2px solid rgba(180,140,60,0.5)',
          boxShadow: '0 3px 10px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,215,0,0.15)',
        }}
      >
        <button onClick={() => { playClickSound(); onBack(); }}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition active:scale-90"
          style={{ background: 'linear-gradient(180deg, rgba(80,50,20,0.8), rgba(50,30,10,0.9))', border: '1px solid rgba(180,140,60,0.4)' }}
        >
          <span className="text-amber-400 text-lg font-black">‹</span>
        </button>
        <div className="flex items-center gap-2 flex-1">
          <img src={shieldImg} alt="" className="w-6 h-6" style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.4))' }} />
          <h1 className="text-sm font-black text-amber-100 tracking-wide" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>INVENTORY</h1>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="relative z-10 flex gap-1 px-2 mb-2">
        {(['overview', 'items', 'rewards', 'tickets'] as TabId[]).map(tab => (
          <button key={tab}
            onClick={() => { playClickSound(); setActiveTab(tab); }}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg transition"
            style={{
              background: activeTab === tab
                ? 'linear-gradient(180deg, rgba(180,140,60,0.25), rgba(62,40,20,0.9))'
                : 'rgba(0,0,0,0.25)',
              border: `1.5px solid ${activeTab === tab ? 'rgba(180,140,60,0.5)' : 'rgba(80,60,30,0.2)'}`,
            }}
          >
            <img src={tabIcons[tab]} alt="" className="w-4 h-4" style={{ filter: activeTab === tab ? 'brightness(1.3)' : 'brightness(0.5) grayscale(0.4)' }} />
            <span className={`text-[8px] font-bold uppercase tracking-wider ${activeTab === tab ? 'text-amber-300' : 'text-amber-700'}`}>{tabLabels[tab]}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 overflow-y-auto px-3 pb-4">
        {activeTab === 'overview' && <OverviewTab storeData={storeData} totalStars={totalStars} ticketProgress={ticketProgress} itemCount={mergedInventory.length} />}
        {activeTab === 'items' && <ItemsTab items={mergedInventory} loading={loadingRemote} onSelectItem={(item) => { playClickSound(); setSelectedItem(item); }} />}
        {activeTab === 'rewards' && <RewardsTab rewards={rewardsWithVoucherMeta} loading={loadingRemote} onSelectReward={(r) => { playClickSound(); setSelectedReward(r); }} />}
        {activeTab === 'tickets' && <TicketsTab storeData={storeData} ticketProgress={ticketProgress} />}
      </div>

      {/* Item Detail Modal */}
      {selectedItem && (
        <ItemDetailModal item={selectedItem} onClose={() => setSelectedItem(null)} onRedeem={handleRedeem} />
      )}

      {/* Reward Detail Modal */}
      {selectedReward && (
        <RewardDetailModal reward={selectedReward} onClose={() => setSelectedReward(null)} />
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════ */
/* Item Detail Modal — with barcode + WhatsApp redeem                        */
/* ═══════════════════════════════════════════════════════════════════════════ */

const ItemDetailModal: React.FC<{
  item: InventoryItem; onClose: () => void; onRedeem: (item: InventoryItem) => void;
}> = ({ item, onClose, onRedeem }) => {
  const [confirming, setConfirming] = useState(false);
  const itemImage = ITEM_IMAGES[item.id] || TYPE_IMAGES[item.type] || shieldImg;

  const rarityColors: Record<string, { border: string; glow: string; label: string; text: string }> = {
    special: { border: 'rgba(192,132,252,0.5)', glow: 'rgba(192,132,252,0.15)', label: '⚡ SPECIAL', text: 'text-purple-300' },
    cosmetic: { border: 'rgba(52,211,153,0.5)', glow: 'rgba(52,211,153,0.15)', label: '✨ COSMETIC', text: 'text-emerald-300' },
    consumable: { border: 'rgba(251,191,36,0.5)', glow: 'rgba(251,191,36,0.15)', label: '🔮 CONSUMABLE', text: 'text-amber-300' },
  };
  const rarity = rarityColors[item.type] || rarityColors.consumable;

  return (
    <div className="absolute inset-0 z-[60] flex items-center justify-center px-6"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-sm rounded-2xl overflow-hidden animate-modal-in max-h-[90vh] overflow-y-auto"
        style={{
          background: 'linear-gradient(135deg, rgba(62,40,20,0.98), rgba(30,18,8,0.99))',
          border: `2px solid ${rarity.border}`,
          boxShadow: `0 12px 40px rgba(0,0,0,0.6), 0 0 30px ${rarity.glow}`,
        }}
      >
        {/* Close */}
        <button onClick={() => { playClickSound(); onClose(); }}
          className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center z-10 transition active:scale-90"
          style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(180,140,60,0.3)' }}
        >
          <span className="text-amber-400 text-sm font-bold">✕</span>
        </button>

        {/* Item showcase */}
        <div className="relative px-6 pt-8 pb-4 flex flex-col items-center"
          style={{ background: `linear-gradient(180deg, ${rarity.glow}, transparent 80%)` }}
        >
          <div className={`text-[9px] font-black uppercase tracking-widest mb-3 ${rarity.text}`}>{rarity.label}</div>
          <div className="relative mb-4">
            <div className="w-24 h-24 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.3)', border: `2px solid ${rarity.border}`, boxShadow: `inset 0 0 20px ${rarity.glow}` }}
            >
              <img src={itemImage} alt={item.name} className="w-16 h-16 object-contain" style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))' }} />
            </div>
            <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #b45309, #78350f)', border: '2px solid rgba(251,191,36,0.5)' }}
            >
              <span className="text-[10px] font-black text-amber-200">x{item.quantity}</span>
            </div>
          </div>
          <h2 className="text-lg font-black text-amber-100 text-center mb-1" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>{item.name}</h2>
          <p className="text-xs text-amber-500/70 text-center max-w-[250px]">{item.description}</p>
        </div>

        {/* Status + Actions */}
        <div className="px-6 pb-6">
          {/* Status */}
          <div className="flex items-center justify-center gap-2 mb-3 py-2 rounded-lg"
            style={{
              background: item.redeemed ? 'rgba(52,211,153,0.1)' : 'rgba(251,191,36,0.1)',
              border: `1px solid ${item.redeemed ? 'rgba(52,211,153,0.3)' : 'rgba(251,191,36,0.3)'}`,
            }}
          >
            <span className="text-sm">{item.redeemed ? '✅' : '📦'}</span>
            <span className={`text-[10px] font-bold uppercase tracking-wider ${item.redeemed ? 'text-emerald-400' : 'text-amber-400'}`}>
              {item.redeemed ? 'Redeemed' : 'Not Redeemed'}
            </span>
          </div>

          {/* Barcode for redemption */}
          <div className="rounded-xl p-3 mb-3" style={{ background: '#fff' }}>
            <BarcodeDisplay code={item.id.toUpperCase()} />
            <div className="text-[10px] font-mono font-bold text-gray-600 mt-1.5 text-center">{item.id.toUpperCase()}</div>
          </div>

          {/* Redeem buttons */}
          {!item.redeemed && !confirming && (
            <div className="space-y-2">
              <button onClick={() => { playClickSound(); setConfirming(true); }}
                className="w-full py-3 rounded-xl text-sm font-black uppercase tracking-wider transition active:scale-[0.97] relative overflow-hidden"
                style={{
                  background: 'linear-gradient(180deg, #059669, #047857, #065f46)',
                  border: '2px solid rgba(52,211,153,0.5)', color: '#ecfdf5',
                  boxShadow: '0 4px 16px rgba(5,150,105,0.4)',
                }}
              >
                🎁 Redeem Item
              </button>
              <a href={`${WA_REDEEM_URL}?text=${encodeURIComponent(`Hai, saya ingin redeem item: ${item.name} (${item.id})`)}`}
                target="_blank" rel="noopener noreferrer"
                onClick={() => playClickSound()}
                className="w-full py-3 rounded-xl text-sm font-bold uppercase tracking-wider transition active:scale-[0.97] flex items-center justify-center gap-2"
                style={{
                  background: 'linear-gradient(180deg, #25D366, #128C7E)',
                  border: '2px solid rgba(37,211,102,0.5)', color: '#fff',
                  boxShadow: '0 4px 16px rgba(37,211,102,0.3)',
                }}
              >
              Redeem
              </a>
            </div>
          )}

          {/* Confirmation */}
          {!item.redeemed && confirming && (
            <div className="space-y-2">
              <p className="text-xs text-amber-400/80 text-center mb-2">Yakin ingin redeem item ini?</p>
              <div className="flex gap-2">
                <button onClick={() => { playClickSound(); setConfirming(false); }}
                  className="flex-1 py-3 rounded-xl text-xs font-bold transition active:scale-95"
                  style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(180,140,60,0.3)', color: '#b4a060' }}
                >Cancel</button>
                <button onClick={() => { onRedeem(item); setConfirming(false); }}
                  className="flex-1 py-3 rounded-xl text-xs font-black uppercase transition active:scale-95"
                  style={{ background: 'linear-gradient(180deg, #059669, #047857)', border: '2px solid rgba(52,211,153,0.5)', color: '#ecfdf5' }}
                >✅ Confirm</button>
              </div>
            </div>
          )}

          {/* Already redeemed */}
          {item.redeemed && (
            <div className="space-y-2">
              <div className="text-center py-2 rounded-xl" style={{ background: 'rgba(52,211,153,0.05)', border: '1px solid rgba(52,211,153,0.1)' }}>
                <p className="text-xs text-emerald-500/70">✨ Item telah di-redeem!</p>
                {item.redeemedAt && <p className="text-[8px] text-emerald-600/50 mt-1">{new Date(item.redeemedAt).toLocaleDateString('id-ID', { dateStyle: 'long' })}</p>}
              </div>
              <a href={`${WA_REDEEM_URL}?text=${encodeURIComponent(`Hai, saya ingin mengklaim hadiah: ${item.name} (${item.id})`)}`}
                target="_blank" rel="noopener noreferrer"
                onClick={() => playClickSound()}
                className="w-full py-3 rounded-xl text-sm font-bold uppercase tracking-wider transition active:scale-[0.97] flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(180deg, #25D366, #128C7E)', border: '2px solid rgba(37,211,102,0.5)', color: '#fff' }}
              >
                📱 Claim Manual
              </a>
            </div>
          )}

          <button onClick={() => { playClickSound(); onClose(); }}
            className="w-full mt-3 py-2.5 rounded-xl text-xs font-bold transition active:scale-95"
            style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(180,140,60,0.2)', color: '#b4a060' }}
          >Close</button>
        </div>
      </div>

      <style>{`
        @keyframes modal-in { from { opacity: 0; transform: scale(0.9) translateY(20px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        .animate-modal-in { animation: modal-in 0.3s ease-out; }
      `}</style>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════ */
/* Reward Detail Modal — with birthday card & full details                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

const RewardDetailModal: React.FC<{
  reward: RewardView; onClose: () => void;
}> = ({ reward, onClose }) => {
  const isBirthdayCard = reward.type === 'birthday_card';
  const isSpinTicket = reward.type === 'spin_ticket';
  const isDimsum = reward.type === 'dimsum_bonus';
  const config = REWARD_TYPE_CONFIG[reward.type] || REWARD_TYPE_CONFIG.inventory_item;

  return (
    <div className="absolute inset-0 z-[60] flex items-center justify-center px-6"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-sm rounded-2xl overflow-hidden animate-modal-in max-h-[90vh] overflow-y-auto relative"
        style={{
          background: 'linear-gradient(135deg, rgba(62,40,20,0.98), rgba(30,18,8,0.99))',
          border: `2px solid ${config.borderColor}`,
          boxShadow: `0 12px 40px rgba(0,0,0,0.6), 0 0 30px ${config.glowColor}`,
        }}
      >
        {/* Close */}
        <button onClick={() => { playClickSound(); onClose(); }}
          className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center z-10 transition active:scale-90"
          style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(180,140,60,0.3)' }}
        >
          <span className="text-amber-400 text-sm font-bold">✕</span>
        </button>

        {/* Type badge at top */}
        <div className="flex justify-center pt-5 pb-1">
          <span className={`text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${config.badgeColor} ${config.badgeBg}`}
            style={{ border: `1px solid ${config.borderColor}` }}
          >
            {config.label}
          </span>
        </div>

        {/* ═══ Birthday Card special layout ═══ */}
        {isBirthdayCard && (
          <div className="px-6 pt-4 pb-6">
            {/* Decorative elements */}
            <div className="absolute top-10 right-5 text-2xl opacity-20 animate-pulse">✨</div>
            <div className="absolute top-16 left-5 text-xl opacity-15 animate-pulse" style={{ animationDelay: '0.7s' }}>🎈</div>

            <div className="text-center mb-4">
              <div className="text-6xl mb-3" style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))' }}>🎂</div>
              <h2 className="text-xl font-black text-purple-200 mb-1" style={{ textShadow: '0 2px 6px rgba(0,0,0,0.5)' }}>
                {reward.name}
              </h2>
              <div className="w-20 h-0.5 mx-auto rounded-full mb-1" style={{ background: 'linear-gradient(90deg, transparent, rgba(192,132,252,0.6), transparent)' }} />
              <p className="text-[10px] text-purple-400/60">{reward.description}</p>
            </div>

            {/* Full birthday message */}
            {reward.message && (
              <div className="rounded-2xl p-5 mb-4 relative overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, rgba(192,132,252,0.1), rgba(139,92,246,0.05))',
                  border: '2px solid rgba(192,132,252,0.25)',
                  boxShadow: 'inset 0 0 30px rgba(192,132,252,0.05)',
                }}
              >
                {/* Decorative corner dots */}
                <div className="absolute top-2 left-2 w-1.5 h-1.5 rounded-full bg-purple-400/20" />
                <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-purple-400/20" />
                <div className="absolute bottom-2 left-2 w-1.5 h-1.5 rounded-full bg-purple-400/20" />
                <div className="absolute bottom-2 right-2 w-1.5 h-1.5 rounded-full bg-purple-400/20" />

                {reward.message.split('\n').map((line, i) => (
                  <p key={i} className={`text-sm leading-relaxed ${line.trim() ? '' : 'h-3'}`}
                    style={{ color: '#e9d5ff', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
                  >
                    {line}
                  </p>
                ))}
              </div>
            )}

            {/* Decorative footer */}
            <div className="text-center mb-2">
              <div className="flex items-center justify-center gap-2 text-xs text-purple-400/50">
                <span>✨</span>
                <span className="italic">With love and warm wishes</span>
                <span>💝</span>
              </div>
            </div>
          </div>
        )}

        {/* ═══ Spin Ticket layout ═══ */}
        {isSpinTicket && (
          <div className="px-6 pt-4 pb-6">
            <div className="text-center mb-4">
              <div className="relative inline-block">
                <div className="text-6xl mb-3" style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))' }}>🎰</div>
                {reward.spins && (
                  <div className="absolute -top-1 -right-3 w-7 h-7 rounded-full flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', border: '2px solid rgba(96,165,250,0.5)' }}
                  >
                    <span className="text-[10px] font-black text-white">×{reward.spins}</span>
                  </div>
                )}
              </div>
              <h2 className="text-lg font-black text-blue-200 mb-1" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                {reward.name}
              </h2>
              <p className="text-xs text-blue-400/70">{reward.description}</p>
            </div>

            {reward.spins && (
              <div className="rounded-xl p-4 mb-3 text-center"
                style={{ background: 'rgba(96,165,250,0.08)', border: '1.5px solid rgba(96,165,250,0.25)' }}
              >
                <p className="text-sm font-bold text-blue-300">🎰 {reward.spins} Lucky Spins</p>
                <p className="text-[9px] text-blue-400/60 mt-1">Use them in the Lucky Spin wheel to win prizes!</p>
              </div>
            )}
          </div>
        )}

        {/* ═══ Dimsum Bonus layout ═══ */}
        {isDimsum && (
          <div className="px-6 pt-4 pb-6">
            <div className="text-center mb-4">
              <div className="w-20 h-20 mx-auto rounded-2xl flex items-center justify-center mb-3"
                style={{ background: 'rgba(251,191,36,0.1)', border: '2px solid rgba(251,191,36,0.3)', boxShadow: 'inset 0 0 20px rgba(251,191,36,0.1)' }}
              >
                <img src={dimsumImg} alt="" className="w-14 h-14" style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))' }} />
              </div>
              <h2 className="text-lg font-black text-amber-100 mb-1" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                {reward.name}
              </h2>
              <p className="text-xs text-amber-500/70">{reward.description}</p>
            </div>

            {reward.value && (
              <div className="rounded-xl p-4 mb-3 flex items-center justify-center gap-2"
                style={{ background: 'rgba(251,191,36,0.1)', border: '1.5px solid rgba(251,191,36,0.3)' }}
              >
                <img src={dimsumImg} alt="" className="w-6 h-6" />
                <span className="text-lg font-black text-amber-300">+{reward.value} Dimsum</span>
              </div>
            )}
          </div>
        )}

        {/* ═══ Generic reward layout (inventory_item, cosmetic) ═══ */}
        {!isBirthdayCard && !isSpinTicket && !isDimsum && (
          <div className="px-6 pt-4 pb-6">
            <div className="text-center mb-4">
              <div className="w-20 h-20 mx-auto rounded-2xl flex items-center justify-center mb-3"
                style={{ background: 'rgba(0,0,0,0.3)', border: `2px solid ${config.borderColor}`, boxShadow: `inset 0 0 20px ${config.glowColor}` }}
              >
                <img src={REWARD_IMAGES[reward.type] || pearlImg} alt="" className="w-12 h-12"
                  style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))' }} />
              </div>
              <h2 className="text-lg font-black text-amber-100 mb-1" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                {reward.name}
              </h2>
              <p className="text-xs text-amber-500/70">{reward.description}</p>
            </div>

            {reward.value && (
              <div className="flex items-center justify-center gap-2 mb-3 py-2.5 rounded-lg"
                style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}
              >
                <img src={dimsumImg} alt="" className="w-5 h-5" />
                <span className="text-sm font-bold text-amber-300">+{reward.value} Dimsum</span>
              </div>
            )}

            {reward.message && (
              <div className="rounded-xl p-3 mb-3"
                style={{ background: 'rgba(0,0,0,0.2)', border: `1px solid ${config.borderColor}` }}
              >
                <p className="text-xs text-amber-400/70 italic">"{reward.message}"</p>
              </div>
            )}
          </div>
        )}

        {/* ═══ Footer: claim date + close ═══ */}
        <div className="px-6 pb-6">
          {reward.claimedAt && (
            <div className="flex items-center justify-center gap-2 mb-3 py-2 rounded-lg"
              style={{ background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.15)' }}
            >
              <span className="text-[9px]">✅</span>
              <span className="text-[9px] text-emerald-400/70 font-bold">
                Claimed on {new Date(reward.claimedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>
          )}

          {reward.waStatus && (
            <div className="mb-3 rounded-lg px-3 py-2"
              style={{ background: 'rgba(37,211,102,0.08)', border: '1px solid rgba(37,211,102,0.25)' }}
            >
              <p className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider mb-0.5">WhatsApp Redemption</p>
              <p className="text-[10px] text-emerald-200/90">Status: {reward.waStatus}</p>
              {reward.waVoucherCode && <p className="text-[9px] text-emerald-300/80">Kode: {reward.waVoucherCode}</p>}
              {reward.waCreatedAt && <p className="text-[8px] text-emerald-400/60">{new Date(reward.waCreatedAt).toLocaleString('id-ID')}</p>}
            </div>
          )}

          <button onClick={() => { playClickSound(); onClose(); }}
            className="w-full py-2.5 rounded-xl text-xs font-bold transition active:scale-95"
            style={{ background: 'rgba(0,0,0,0.3)', border: `1px solid ${config.borderColor}`, color: '#b4a060' }}
          >Close</button>
        </div>
      </div>

      <style>{`
        @keyframes modal-in { from { opacity: 0; transform: scale(0.9) translateY(20px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        .animate-modal-in { animation: modal-in 0.3s ease-out; }
      `}</style>
    </div>
  );
};

/* ─── Overview Tab ─────────────────────────────────────────────────────── */

const OverviewTab: React.FC<{
  storeData: GameStoreData; totalStars: number; ticketProgress: { current: number; needed: number }; itemCount: number;
}> = ({ storeData, totalStars, ticketProgress, itemCount }) => (
  <div className="space-y-2.5">
    <div className="grid grid-cols-2 gap-2">
      <ResourceCard icon={dimsumImg} label="Total Dimsum" value={storeData.totalDimsum} />
      <ResourceCard icon={coinImg} label="Stars" value={totalStars} />
      <ResourceCard icon={chestClosed} label="Tickets" value={storeData.tickets} />
      <ResourceCard icon={shieldImg} label="Items" value={itemCount} />
    </div>

    <SectionPanel title="Level Progress" icon={swordIcon}>
      <div className="space-y-1.5">
        {LEVELS.map(level => {
          const progress = storeData.levels[level.id];
          const stars = progress?.stars || 0;
          const dim = progress?.dimsumCollected || 0;
          return (
            <div key={level.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
              style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(180,140,60,0.1)' }}
            >
              <span className="text-[9px] font-bold text-amber-600/60 w-5 text-center">{level.id}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-amber-200 truncate">{level.name}</p>
                <div className="flex items-center gap-0.5 mt-0.5">
                  {[1, 2, 3].map(s => (
                    <span key={s} className="text-[8px]" style={{ filter: stars >= s ? 'none' : 'grayscale(1) opacity(0.3)' }}>
                      {stars >= s ? '⭐' : '☆'}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-0.5">
                <img src={dimsumImg} alt="" className="w-3 h-3" />
                <span className={`text-[9px] font-bold ${dim === level.dimsumCount ? 'text-emerald-400' : 'text-amber-500/60'}`}>{dim}/{level.dimsumCount}</span>
              </div>
            </div>
          );
        })}
      </div>
    </SectionPanel>

    <SectionPanel title="Ticket Progress" icon={chestClosed}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] text-amber-400/70">Next ticket in</span>
        <div className="flex items-center gap-1">
          <img src={dimsumImg} alt="" className="w-3 h-3" />
          <span className="text-[10px] font-bold text-amber-300">{ticketProgress.current}/{ticketProgress.needed}</span>
        </div>
      </div>
      <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(180,140,60,0.15)' }}>
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${(ticketProgress.current / ticketProgress.needed) * 100}%`, background: 'linear-gradient(90deg, #b45309, #f59e0b, #fbbf24)' }} />
      </div>
    </SectionPanel>
  </div>
);

/* ─── Items Tab ────────────────────────────────────────────────────────── */

const ItemsTab: React.FC<{ items: InventoryItem[]; loading: boolean; onSelectItem: (item: InventoryItem) => void }> = ({ items, loading, onSelectItem }) => {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="w-8 h-8 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
        <p className="text-xs text-amber-500/60">Loading items...</p>
      </div>
    );
  }
  if (items.length === 0) {
    return <EmptyState icon={shieldImg} title="No Items Yet" desc="Complete levels and open mystery boxes to get items!" />;
  }
  return (
    <div className="grid grid-cols-3 gap-2">
      {items.map(item => {
        const itemImage = ITEM_IMAGES[item.id] || TYPE_IMAGES[item.type] || shieldImg;
        return (
          <button key={item.id} onClick={() => onSelectItem(item)}
            className="relative rounded-xl p-2 flex flex-col items-center text-center transition active:scale-95"
            style={{
              background: 'linear-gradient(135deg, rgba(62,40,20,0.85), rgba(40,26,12,0.9))',
              border: `2px solid ${item.redeemed ? 'rgba(52,211,153,0.3)' : 'rgba(180,140,60,0.25)'}`,
            }}
          >
            <img src={itemImage} alt="" className="w-8 h-8 mb-1" style={{ filter: `drop-shadow(0 2px 3px rgba(0,0,0,0.4)) ${item.redeemed ? 'grayscale(0.3)' : ''}` }} />
            <p className="text-[9px] font-bold text-amber-200 truncate w-full">{item.name}</p>
            <p className="text-[8px] text-amber-600/50">x{item.quantity}</p>
            {item.redeemed && (
              <div className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: 'rgba(5,150,105,0.8)' }}>
                <span className="text-[7px]">✓</span>
              </div>
            )}
            {!item.redeemed && (
              <div className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center animate-pulse" style={{ background: 'rgba(251,191,36,0.3)', border: '1px solid rgba(251,191,36,0.5)' }}>
                <span className="text-[7px]">!</span>
              </div>
            )}
            {item.type === 'special' && !item.redeemed && (
              <div className="absolute inset-0 rounded-xl pointer-events-none" style={{ boxShadow: 'inset 0 0 12px rgba(192,132,252,0.15)' }} />
            )}
          </button>
        );
      })}
    </div>
  );
};

/* ─── Rewards Tab — clickable with detail, grouped by type ─────────────── */

const REWARD_TYPE_CONFIG: Record<string, { label: string; badgeColor: string; badgeBg: string; borderColor: string; glowColor: string }> = {
  birthday_card: { label: '🎂 Birthday Card', badgeColor: 'text-purple-300', badgeBg: 'bg-purple-500/20', borderColor: 'rgba(192,132,252,0.3)', glowColor: 'rgba(192,132,252,0.1)' },
  spin_ticket: { label: '🎰 Spin Ticket', badgeColor: 'text-blue-300', badgeBg: 'bg-blue-500/20', borderColor: 'rgba(96,165,250,0.3)', glowColor: 'rgba(96,165,250,0.1)' },
  dimsum_bonus: { label: '🥟 Dimsum Bonus', badgeColor: 'text-amber-300', badgeBg: 'bg-amber-500/20', borderColor: 'rgba(251,191,36,0.3)', glowColor: 'rgba(251,191,36,0.1)' },
  inventory_item: { label: '📦 Item', badgeColor: 'text-emerald-300', badgeBg: 'bg-emerald-500/20', borderColor: 'rgba(52,211,153,0.3)', glowColor: 'rgba(52,211,153,0.1)' },
  cosmetic: { label: '✨ Cosmetic', badgeColor: 'text-pink-300', badgeBg: 'bg-pink-500/20', borderColor: 'rgba(244,114,182,0.3)', glowColor: 'rgba(244,114,182,0.1)' },
};

const RewardsTab: React.FC<{ rewards: RewardView[]; loading: boolean; onSelectReward: (r: RewardView) => void }> = ({ rewards, loading, onSelectReward }) => {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="w-8 h-8 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
        <p className="text-xs text-amber-500/60">Loading rewards...</p>
      </div>
    );
  }
  if (rewards.length === 0) {
    return <EmptyState icon={chestOpen} title="No Rewards Yet" desc="Use tickets to open mystery boxes and collect rewards!" />;
  }

  // Group rewards by type
  const grouped: Record<string, RewardView[]> = {};
  for (const r of rewards) {
    if (!grouped[r.type]) grouped[r.type] = [];
    grouped[r.type].push(r);
  }

  // Order: birthday_card first, then spin_ticket, then others
  const typeOrder = ['birthday_card', 'spin_ticket', 'dimsum_bonus', 'inventory_item', 'cosmetic'];
  const sortedTypes = Object.keys(grouped).sort((a, b) => {
    const ia = typeOrder.indexOf(a);
    const ib = typeOrder.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });

  return (
    <div className="space-y-4">
      {/* Summary badges */}
      <div className="flex flex-wrap gap-1.5">
        {sortedTypes.map(type => {
          const config = REWARD_TYPE_CONFIG[type] || { label: type, badgeColor: 'text-amber-300', badgeBg: 'bg-amber-500/20', borderColor: 'rgba(180,140,60,0.3)', glowColor: 'rgba(180,140,60,0.1)' };
          return (
            <span key={type} className={`text-[9px] font-bold px-2 py-1 rounded-lg ${config.badgeColor} ${config.badgeBg}`}
              style={{ border: `1px solid ${config.borderColor}` }}
            >
              {config.label} ×{grouped[type].length}
            </span>
          );
        })}
      </div>

      {/* Grouped reward list */}
      {sortedTypes.map(type => {
        const config = REWARD_TYPE_CONFIG[type] || { label: type, badgeColor: 'text-amber-300', badgeBg: 'bg-amber-500/20', borderColor: 'rgba(180,140,60,0.3)', glowColor: 'rgba(180,140,60,0.1)' };
        const typeRewards = grouped[type];
        return (
          <div key={type}>
            {/* Section header */}
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`text-[9px] font-black uppercase tracking-wider ${config.badgeColor}`}>{config.label}</span>
              <div className="flex-1 h-px" style={{ background: config.borderColor }} />
            </div>

            <div className="space-y-2">
              {typeRewards.map(reward => (
                <button key={reward.id} onClick={() => onSelectReward(reward)}
                  className="w-full rounded-xl p-3 flex items-start gap-3 text-left transition active:scale-[0.98]"
                  style={{
                    background: 'linear-gradient(135deg, rgba(62,40,20,0.85), rgba(40,26,12,0.9))',
                    border: `2px solid ${config.borderColor}`,
                    boxShadow: `inset 0 0 15px ${config.glowColor}`,
                  }}
                >
                  {/* Icon */}
                  <div className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{
                      background: `linear-gradient(135deg, rgba(0,0,0,0.3), ${config.glowColor})`,
                      border: `1.5px solid ${config.borderColor}`,
                    }}
                  >
                    {reward.type === 'birthday_card' ? (
                      <span className="text-2xl">🎂</span>
                    ) : reward.type === 'spin_ticket' ? (
                      <span className="text-2xl">🎰</span>
                    ) : (
                      <img src={REWARD_IMAGES[reward.type] || pearlImg} alt="" className="w-7 h-7" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold text-amber-200 truncate">{reward.name}</p>
                    </div>
                    <p className="text-[9px] text-amber-500/60 mt-0.5 truncate">{reward.description}</p>

                    {/* Birthday card preview */}
                    {reward.type === 'birthday_card' && reward.message && (
                      <div className="mt-1.5 rounded-lg px-2 py-1.5"
                        style={{ background: 'rgba(192,132,252,0.08)', border: '1px solid rgba(192,132,252,0.15)' }}
                      >
                        <p className="text-[8px] text-purple-300/70 italic truncate">
                          {reward.message.substring(0, 60)}...
                        </p>
                        <p className="text-[7px] text-purple-400/50 mt-0.5 font-bold">Tap to read full message →</p>
                      </div>
                    )}

                    {/* Spin ticket count */}
                    {reward.type === 'spin_ticket' && reward.spins && (
                      <div className="mt-1 flex items-center gap-1">
                        <span className="text-[9px] font-bold text-blue-400/80">🎰 {reward.spins} spins available</span>
                      </div>
                    )}

                    {/* Dimsum value */}
                    {reward.type === 'dimsum_bonus' && reward.value && (
                      <div className="mt-1 flex items-center gap-1">
                        <img src={dimsumImg} alt="" className="w-3 h-3" />
                        <span className="text-[9px] font-bold text-amber-400/80">+{reward.value} Dimsum</span>
                      </div>
                    )}

                    {/* Claimed date */}
                    {reward.claimedAt && (
                      <p className="text-[7px] text-amber-700/40 mt-1">
                        {new Date(reward.claimedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    )}

                    {reward.waStatus && (
                      <p className="text-[8px] text-emerald-400/70 mt-0.5 font-bold">
                        WhatsApp: {reward.waStatus}
                      </p>
                    )}
                  </div>

                  <span className="text-amber-600/40 text-sm mt-1">›</span>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ─── Tickets Tab ──────────────────────────────────────────────────────── */

const TicketsTab: React.FC<{ storeData: GameStoreData; ticketProgress: { current: number; needed: number } }> = ({ storeData, ticketProgress }) => (
  <div className="space-y-2.5">
    <div className="rounded-xl p-4 flex flex-col items-center"
      style={{ background: 'linear-gradient(135deg, rgba(62,40,20,0.85), rgba(40,26,12,0.9))', border: '2px solid rgba(180,140,60,0.3)' }}
    >
      <img src={chestClosed} alt="" className="w-16 h-16 mb-2" style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))' }} />
      <p className="text-2xl font-black text-amber-300 drop-shadow-lg">{storeData.tickets}</p>
      <p className="text-[10px] font-bold text-amber-600/60 uppercase tracking-wider">Available Tickets</p>
    </div>

    <div className="rounded-xl p-3" style={{ background: 'linear-gradient(135deg, rgba(62,40,20,0.8), rgba(40,26,12,0.85))', border: '2px solid rgba(180,140,60,0.2)' }}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-bold text-amber-500/70">Next ticket progress</span>
        <div className="flex items-center gap-1">
          <img src={dimsumImg} alt="" className="w-3 h-3" />
          <span className="text-[10px] font-bold text-amber-300">{ticketProgress.current}/{ticketProgress.needed}</span>
        </div>
      </div>
      <div className="h-3 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(180,140,60,0.15)' }}>
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${(ticketProgress.current / ticketProgress.needed) * 100}%`, background: 'linear-gradient(90deg, #b45309, #f59e0b, #fbbf24)' }} />
      </div>
      <p className="text-[9px] text-amber-700/50 mt-1.5 text-center">Collect 6 dimsum across all levels to earn 1 ticket</p>
    </div>

    <div className="rounded-xl p-3" style={{ background: 'linear-gradient(135deg, rgba(62,40,20,0.8), rgba(40,26,12,0.85))', border: '2px solid rgba(180,140,60,0.2)' }}>
      <p className="text-[10px] font-bold text-amber-500/70 mb-2">Ticket Stats</p>
      <div className="space-y-1">
        <StatRow label="Total Earned" value={storeData.tickets + storeData.ticketsUsed} />
        <StatRow label="Used" value={storeData.ticketsUsed} />
        <StatRow label="Remaining" value={storeData.tickets} />
      </div>
    </div>
  </div>
);

/* ─── Shared Components ────────────────────────────────────────────────── */

const ResourceCard: React.FC<{ icon: string; label: string; value: number }> = ({ icon, label, value }) => (
  <div className="rounded-xl p-3 flex items-center gap-2.5"
    style={{ background: 'linear-gradient(135deg, rgba(62,40,20,0.85), rgba(40,26,12,0.9))', border: '2px solid rgba(180,140,60,0.25)' }}
  >
    <img src={icon} alt="" className="w-8 h-8" style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.4))' }} />
    <div>
      <p className="text-lg font-black text-amber-300 drop-shadow">{value}</p>
      <p className="text-[8px] font-bold text-amber-600/60 uppercase tracking-wider">{label}</p>
    </div>
  </div>
);

const SectionPanel: React.FC<{ title: string; icon: string; children: React.ReactNode }> = ({ title, icon, children }) => (
  <div className="rounded-xl overflow-hidden"
    style={{ background: 'linear-gradient(135deg, rgba(62,40,20,0.85), rgba(40,26,12,0.9))', border: '2px solid rgba(180,140,60,0.25)' }}
  >
    <div className="flex items-center gap-2 px-3 py-2" style={{ background: 'rgba(180,140,60,0.1)', borderBottom: '1px solid rgba(180,140,60,0.15)' }}>
      <img src={icon} alt="" className="w-4 h-4" />
      <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider">{title}</span>
    </div>
    <div className="p-3">{children}</div>
  </div>
);

const StatRow: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="flex items-center justify-between px-2 py-1 rounded-lg" style={{ background: 'rgba(0,0,0,0.15)' }}>
    <span className="text-[10px] text-amber-500/60">{label}</span>
    <span className="text-[10px] font-bold text-amber-300">{value}</span>
  </div>
);

const EmptyState: React.FC<{ icon: string; title: string; desc: string }> = ({ icon, title, desc }) => (
  <div className="flex flex-col items-center justify-center h-64 gap-3">
    <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
      style={{ background: 'linear-gradient(135deg, rgba(62,40,20,0.85), rgba(40,26,12,0.9))', border: '2px solid rgba(180,140,60,0.2)' }}
    >
      <img src={icon} alt="" className="w-10 h-10 opacity-40" />
    </div>
    <p className="text-sm font-bold text-amber-600/70 text-center">{title}</p>
    <p className="text-xs text-amber-700/50 text-center max-w-[200px]">{desc}</p>
  </div>
);

/* ── CSS Barcode Display ────────────────────────────────────────────────── */

const BarcodeDisplay: React.FC<{ code: string }> = ({ code }) => {
  const bars: { width: number; dark: boolean }[] = [];
  for (let i = 0; i < code.length; i++) {
    const charCode = code.charCodeAt(i);
    for (let b = 0; b < 4; b++) {
      const bit = (charCode >> b) & 1;
      bars.push({ width: bit ? 3 : 2, dark: b % 2 === 0 });
      bars.push({ width: bit ? 1 : 2, dark: b % 2 !== 0 });
    }
  }
  return (
    <div className="flex items-center justify-center gap-[1px] h-12">
      <div className="w-[2px] h-full bg-black" />
      <div className="w-[1px] h-full bg-white" />
      <div className="w-[2px] h-full bg-black" />
      {bars.map((bar, i) => (
        <div key={i} className="h-full" style={{ width: `${bar.width}px`, backgroundColor: bar.dark ? '#000' : '#fff' }} />
      ))}
      <div className="w-[2px] h-full bg-black" />
      <div className="w-[1px] h-full bg-white" />
      <div className="w-[2px] h-full bg-black" />
    </div>
  );
};
