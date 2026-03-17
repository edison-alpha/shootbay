import React from 'react';

interface NameEntryScreenProps {
  playerName: string;
  onChange: (name: string) => void;
  onSubmit: () => void;
}

export const NameEntryScreen: React.FC<NameEntryScreenProps> = ({ playerName, onChange, onSubmit }) => (
  <div
    className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
    style={{
      padding: 'max(16px, env(safe-area-inset-top, 16px)) max(16px, env(safe-area-inset-right, 16px)) max(16px, env(safe-area-inset-bottom, 16px)) max(16px, env(safe-area-inset-left, 16px))',
    }}
  >
    <div className="w-full max-w-sm rounded-[28px] border border-white/10 bg-[#171717]/95 p-5 text-center shadow-2xl sm:p-6">
      <div className="mb-4 text-xs font-black uppercase tracking-[0.35em] text-yellow-400">Profile Setup</div>
      <h1 className="mb-2 text-2xl font-black text-white sm:text-3xl">Enter your name</h1>
      <p className="mb-5 text-sm text-zinc-400">Compact form only, lalu lanjut ke foto profil game.</p>
      <input
        type="text"
        value={playerName}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Your name"
        className="mb-4 w-full rounded-2xl border border-white/10 bg-zinc-800 px-4 py-3 text-center text-base text-white outline-none transition focus:border-yellow-400"
        onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
      />
      <button
        onClick={onSubmit}
        disabled={!playerName.trim()}
        className="w-full rounded-2xl bg-yellow-500 py-3 text-sm font-black uppercase tracking-[0.22em] text-black transition hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Submit
      </button>
    </div>
  </div>
);
