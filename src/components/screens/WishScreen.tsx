import React, { useState, useEffect, useCallback } from 'react';
import bubbleImg from '../../assets/underwater/Neutral/Bubble_2.webp';

interface WishScreenProps {
  milestone: number;
  wishInput: string;
  onWishChange: (value: string) => void;
  onSubmit: () => void;
}

/**
 * Mandatory wish screen — the player CANNOT dismiss or close this screen
 * until they have typed a non-empty wish and pressed submit.
 * There is no close button, no backdrop click-to-dismiss, and the submit
 * button is disabled when the textarea is empty.
 */
export const WishScreen: React.FC<WishScreenProps> = ({ milestone, wishInput, onWishChange, onSubmit }) => {
  const [shake, setShake] = useState(false);
  const [charCount, setCharCount] = useState(0);

  const isValid = wishInput.trim().length >= 3;

  useEffect(() => {
    setCharCount(wishInput.trim().length);
  }, [wishInput]);

  // Block keyboard shortcuts that might dismiss the overlay
  useEffect(() => {
    const blockEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        // Shake to indicate you must write a wish
        setShake(true);
        setTimeout(() => setShake(false), 500);
      }
    };
    window.addEventListener('keydown', blockEscape, true);
    return () => window.removeEventListener('keydown', blockEscape, true);
  }, []);

  const handleSubmitClick = useCallback(() => {
    if (!isValid) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }
    onSubmit();
  }, [isValid, onSubmit]);

  // Prevent Enter from submitting empty
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmitClick();
    }
  }, [handleSubmitClick]);

  return (
    <div
      className="absolute inset-0 z-[100] flex items-center justify-center"
      style={{
        background: 'radial-gradient(ellipse at center, rgba(30,20,0,0.95) 0%, rgba(0,0,0,0.98) 100%)',
        backdropFilter: 'blur(14px)',
        padding: 'max(16px, env(safe-area-inset-top, 16px)) max(16px, env(safe-area-inset-right, 16px)) max(16px, env(safe-area-inset-bottom, 16px)) max(16px, env(safe-area-inset-left, 16px))',
      }}
      // Block click-through — NO onClick to dismiss
    >
      {/* Floating bubbles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(5)].map((_, i) => (
          <img
            key={i}
            src={bubbleImg}
            alt=""
            className="absolute opacity-10"
            style={{
              width: `${18 + i * 8}px`,
              left: `${5 + i * 18}%`,
              bottom: `-20px`,
              animation: `wish-float ${7 + i * 2}s ease-in-out infinite`,
              animationDelay: `${i * 0.8}s`,
            }}
          />
        ))}
      </div>

      <div
        className={`relative w-full max-w-lg overflow-hidden rounded-3xl p-5 text-center sm:p-8 transition-transform duration-300 ${shake ? 'animate-shake' : ''}`}
        style={{
          background: 'linear-gradient(145deg, rgba(23,23,23,0.97) 0%, rgba(35,25,0,0.95) 100%)',
          border: '1px solid rgba(251,191,36,0.25)',
          boxShadow: '0 25px 60px rgba(0,0,0,0.5), 0 0 60px rgba(251,191,36,0.08), inset 0 1px 0 rgba(255,255,255,0.06)',
        }}
      >
        {/* Golden glow at top */}
        <div
          className="absolute left-0 top-0 h-32 w-full pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at top, rgba(251,191,36,0.12) 0%, transparent 70%)',
          }}
        />

        {/* Star icon */}
        <div className="relative mb-3">
          <div
            className="mx-auto flex h-20 w-20 items-center justify-center rounded-full sm:h-24 sm:w-24"
            style={{
              background: 'radial-gradient(circle, rgba(251,191,36,0.15) 0%, rgba(251,191,36,0.05) 100%)',
              border: '2px solid rgba(251,191,36,0.2)',
              boxShadow: '0 0 30px rgba(251,191,36,0.15)',
              animation: 'wish-pulse 2s ease-in-out infinite',
            }}
          >
            <span className="text-5xl sm:text-6xl" style={{ filter: 'drop-shadow(0 0 15px rgba(251,191,36,0.5))' }}>
              🌟
            </span>
          </div>
        </div>

        <h2
          className="relative mb-1 text-2xl font-black uppercase tracking-[0.15em] sm:text-3xl"
          style={{
            color: '#fbbf24',
            textShadow: '0 0 20px rgba(251,191,36,0.4), 0 2px 4px rgba(0,0,0,0.5)',
          }}
        >
          Make a Wish!
        </h2>

        <p className="relative mb-2 text-sm text-zinc-400 sm:text-base">
          Milestone reached — <span className="font-bold text-yellow-500">{milestone}</span> points
        </p>

        {/* Mandatory notice */}
        <div
          className="relative mb-4 flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 mx-auto w-fit"
          style={{
            background: 'rgba(251,191,36,0.08)',
            border: '1px solid rgba(251,191,36,0.15)',
          }}
        >
          <span className="text-[10px]">⚠️</span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-yellow-500/80">
            Kamu wajib menulis wish untuk melanjutkan!
          </span>
        </div>

        {/* Textarea */}
        <div className="relative mb-2">
          <textarea
            value={wishInput}
            onChange={(e) => onWishChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tulis wish kamu di sini... (minimal 3 karakter)"
            autoFocus
            className="h-28 w-full resize-none rounded-2xl p-4 text-sm text-white placeholder:text-zinc-500 outline-none sm:h-36 sm:text-base"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: `1px solid ${isValid ? 'rgba(251,191,36,0.3)' : wishInput.length > 0 ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.08)'}`,
              boxShadow: isValid ? '0 0 15px rgba(251,191,36,0.08)' : undefined,
              transition: 'border-color 0.2s, box-shadow 0.2s',
            }}
          />
          <div className="flex items-center justify-between px-1 mt-1">
            <span className={`text-[10px] ${isValid ? 'text-green-400' : charCount > 0 ? 'text-yellow-500' : 'text-zinc-500'}`}>
              {charCount > 0 ? (isValid ? '✓ Siap submit!' : `${3 - charCount} karakter lagi...`) : 'Ketik wish kamu...'}
            </span>
            <span className="text-[10px] text-zinc-500/60">{charCount} karakter</span>
          </div>
        </div>

        {/* Submit button — disabled when empty */}
        <button
          onClick={handleSubmitClick}
          disabled={!isValid}
          className="relative w-full overflow-hidden rounded-2xl py-3.5 text-sm font-black uppercase tracking-[0.22em] transition-all duration-200 active:scale-[0.97] sm:py-4 sm:text-base"
          style={{
            background: isValid
              ? 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)'
              : 'linear-gradient(135deg, #3f3f46 0%, #27272a 100%)',
            color: isValid ? '#000' : '#71717a',
            border: isValid ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(255,255,255,0.05)',
            boxShadow: isValid ? '0 8px 25px rgba(234,179,8,0.3), inset 0 1px 0 rgba(255,255,255,0.2)' : 'none',
            cursor: isValid ? 'pointer' : 'not-allowed',
            opacity: isValid ? 1 : 0.7,
          }}
        >
          <span className="relative z-10">
            {isValid ? '✨ Submit Wish ✨' : '✍️ Tulis wish dulu...'}
          </span>
        </button>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes wish-float {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.08; }
          50% { transform: translateY(-${window.innerHeight}px) scale(0.5); opacity: 0; }
        }
        @keyframes wish-pulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 30px rgba(251,191,36,0.15); }
          50% { transform: scale(1.05); box-shadow: 0 0 40px rgba(251,191,36,0.25); }
        }
        .animate-shake {
          animation: shake-horizontal 0.4s ease-in-out;
        }
        @keyframes shake-horizontal {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-5px); }
          80% { transform: translateX(5px); }
        }
      `}</style>
    </div>
  );
};
