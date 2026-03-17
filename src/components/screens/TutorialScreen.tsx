import React from 'react';
import arenaBg from '../../assets/arena_background.webp';
import dimsumImg from '../../assets/dimsum.png';

interface TutorialScreenProps {
  onContinue: () => void;
}

export const TutorialScreen: React.FC<TutorialScreenProps> = ({ onContinue }) => (
  <div
    className="absolute inset-0 z-[65] flex items-center justify-center overflow-hidden"
    style={{
      backgroundImage: `url(${arenaBg})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      padding: 'max(12px, env(safe-area-inset-top, 12px)) max(12px, env(safe-area-inset-right, 12px)) max(12px, env(safe-area-inset-bottom, 12px)) max(12px, env(safe-area-inset-left, 12px))',
    }}
  >
    <div className="absolute inset-0 bg-black/55 pointer-events-none" />

    <div className="relative z-10 flex max-h-full w-full max-w-lg flex-col overflow-hidden rounded-2xl p-4 sm:p-5"
      style={{
        background: 'linear-gradient(135deg, rgba(62,40,20,0.95) 0%, rgba(30,18,8,0.98) 100%)',
        border: '2px solid rgba(180,140,60,0.5)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,215,0,0.15)',
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-1 shrink-0">
        <img src={dimsumImg} alt="" className="w-6 h-6" style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.4))' }} />
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-500/80">Tutorial</span>
      </div>
      <h2 className="mb-3 shrink-0 text-lg font-black text-amber-100 sm:text-xl"
        style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}
      >
        Cara Bermain
      </h2>

      {/* Content */}
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1 sm:space-y-2.5">
        {/* Movement */}
        <TutorialCard
          emoji="👆"
          title="Gerak"
          desc="Sentuh dan tahan sisi kiri layar untuk menggerakkan karaktermu ke segala arah di arena."
          borderColor="rgba(180,140,60,0.2)"
          bgColor="rgba(180,140,60,0.05)"
          titleColor="text-amber-200"
        />

        {/* Attack */}
        <TutorialCard
          emoji="🎯"
          title="Serang"
          desc="Sentuh sisi kanan layar untuk membidik dan menembak musuh goblin yang mendekat."
          borderColor="rgba(180,140,60,0.2)"
          bgColor="rgba(180,140,60,0.05)"
          titleColor="text-amber-200"
        />

        {/* Collect Dimsum */}
        <TutorialCard
          emoji="🥟"
          title="Kumpulkan Dimsum"
          desc="Setiap level memiliki sejumlah dimsum yang tersebar di arena. Dekati dimsum untuk mengumpulkannya. Kumpulkan semua dimsum di level untuk mendapat 3 bintang!"
          borderColor="rgba(251,191,36,0.3)"
          bgColor="rgba(251,191,36,0.08)"
          titleColor="text-amber-300"
          highlight
        />

        {/* Star Rating */}
        <TutorialCard
          emoji="⭐"
          title="Penilaian Bintang"
          desc="⭐ 1 Bintang = Kumpulkan 33%+ dimsum. ⭐⭐ 2 Bintang = 66%+ dimsum. ⭐⭐⭐ 3 Bintang = Semua dimsum terkumpul!"
          borderColor="rgba(251,191,36,0.2)"
          bgColor="rgba(251,191,36,0.05)"
          titleColor="text-amber-300"
        />

        {/* Boss Enemy */}
        <TutorialCard
          emoji="👹"
          title="Boss Enemy"
          desc="Boss kuat muncul di level tertentu! Mereka punya HP tinggi dan serangan dahsyat. Kalahkan untuk membuka akses ke dimsum di area mereka."
          borderColor="rgba(239,68,68,0.2)"
          bgColor="rgba(239,68,68,0.05)"
          titleColor="text-red-400"
        />

        {/* Power-ups */}
        <TutorialCard
          emoji="✨"
          title="Power-Up & Item"
          desc="Kumpulkan item: ❤️ Health, 🛡️ Shield, 🏃 Speed, 💣 Shotgun, ⚡ Rapid Fire, 🪙 Coin, ✨ Double Bullets. Item muncul dari peti atau musuh yang dikalahkan."
          borderColor="rgba(56,189,248,0.2)"
          bgColor="rgba(56,189,248,0.05)"
          titleColor="text-sky-400"
        />

        {/* Ticket System */}
        <TutorialCard
          emoji="🎫"
          title="Sistem Ticket"
          desc="Setiap 6 dimsum yang kamu kumpulkan (total dari semua level) akan otomatis menjadi 1 Ticket. Ticket digunakan untuk membuka Mystery Box!"
          borderColor="rgba(52,211,153,0.2)"
          bgColor="rgba(52,211,153,0.05)"
          titleColor="text-emerald-400"
        />

        {/* Mystery Box */}
        <TutorialCard
          emoji="🎁"
          title="Mystery Box & Kode Rahasia"
          desc="Gunakan Ticket + Kode Rahasia untuk membuka Mystery Box. Di dalamnya ada berbagai hadiah: item spesial, bonus dimsum, kosmetik, kartu ucapan, atau bahkan Lucky Spin!"
          borderColor="rgba(192,132,252,0.2)"
          bgColor="rgba(192,132,252,0.05)"
          titleColor="text-purple-400"
        />

        {/* Objective */}
        <TutorialCard
          emoji="🏆"
          title="Tujuan"
          desc="Taklukkan semua 6 level, kumpulkan semua dimsum, raih 3 bintang di setiap level, dan buka semua Mystery Box untuk menjadi juara!"
          borderColor="rgba(251,191,36,0.3)"
          bgColor="rgba(251,191,36,0.08)"
          titleColor="text-amber-200"
          highlight
        />
      </div>

      {/* Continue Button */}
      <button
        onClick={onContinue}
        className="mt-3 w-full shrink-0 rounded-xl py-3 text-sm font-black uppercase tracking-[0.2em] transition active:scale-[0.97] relative overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #b45309 0%, #92400e 40%, #78350f 100%)',
          border: '2px solid rgba(251,191,36,0.5)',
          boxShadow: '0 4px 16px rgba(180,100,10,0.4), inset 0 2px 0 rgba(255,215,0,0.2)',
          color: '#fef3c7',
          textShadow: '0 2px 4px rgba(0,0,0,0.5)',
        }}
      >
        Lanjut ke Percakapan
      </button>
    </div>
  </div>
);

/* ── Tutorial Card Component ─────────────────────────────────────────── */

const TutorialCard: React.FC<{
  emoji: string;
  title: string;
  desc: string;
  borderColor: string;
  bgColor: string;
  titleColor: string;
  highlight?: boolean;
}> = ({ emoji, title, desc, borderColor, bgColor, titleColor, highlight }) => (
  <div className="rounded-xl p-3 sm:p-3.5"
    style={{
      background: bgColor,
      border: `1.5px solid ${borderColor}`,
      boxShadow: highlight ? `inset 0 0 12px ${bgColor}` : 'none',
    }}
  >
    <div className={`mb-1 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.15em] ${titleColor}`}>
      <span>{emoji}</span> {title}
    </div>
    <p className="text-[11px] leading-[1.5] text-amber-400/70 sm:text-xs">{desc}</p>
  </div>
);
