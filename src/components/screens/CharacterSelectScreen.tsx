import React from 'react';
import type { CharacterId, CharacterOption } from '../../types/game';
import { CHARACTER_OPTIONS } from '../../constants/characters';

interface CharacterSelectScreenProps {
  selectedId: CharacterId;
  onSelect: (id: CharacterId) => void;
  onContinue: () => void;
}

export const CharacterSelectScreen: React.FC<CharacterSelectScreenProps> = ({
  selectedId,
  onSelect,
  onContinue,
}) => (
  <div
    className="absolute inset-0 z-[61] flex flex-col bg-[#111]/95 backdrop-blur-sm"
    style={{
      paddingBottom: 'max(12px, env(safe-area-inset-bottom, 12px))',
      paddingTop: 'max(12px, env(safe-area-inset-top, 12px))',
    }}
  >
    {/* Full-screen flex container */}
    <div className="flex min-h-0 flex-1 flex-col px-4 sm:mx-auto sm:max-w-2xl sm:px-6">
      {/* Header — fixed size */}
      <div className="shrink-0 pt-2">
        <div className="mb-1 text-[10px] font-black uppercase tracking-[0.35em] text-yellow-400 sm:text-xs">
          Pilih Karakter
        </div>
        <h2 className="mb-0.5 text-lg font-black text-white sm:text-2xl">Pilih karakter lucu kamu</h2>
        <p className="text-xs leading-5 text-zinc-400 sm:text-sm">
          Pilih partner tempur favoritmu sebelum masuk tutorial.
        </p>
      </div>

      {/* Character cards — flex-1 but min-h-0 prevents overflow */}
      <div className="mt-2 flex min-h-0 flex-1 flex-col gap-2 sm:flex-row sm:gap-4">
        {CHARACTER_OPTIONS.map((character: CharacterOption) => {
          const isActive = character.id === selectedId;
          return (
            <button
              key={character.id}
              onClick={() => onSelect(character.id)}
              className={`flex min-h-0 flex-1 flex-col overflow-hidden rounded-[18px] border-2 p-2 text-left transition active:scale-[0.98] sm:rounded-[28px] sm:p-3 ${
                isActive
                  ? 'border-yellow-400 bg-yellow-500/10 shadow-[0_0_0_1px_rgba(250,204,21,0.35)]'
                  : 'border-white/10 bg-white/5 hover:bg-white/10'
              }`}
            >
              {/* Image fills available card space */}
              <div className="min-h-0 flex-1 overflow-hidden rounded-[14px] bg-zinc-900 sm:rounded-[20px]">
                <img
                  src={character.image}
                  alt={character.name}
                  className="h-full w-full object-contain"
                />
              </div>
              <div className="mt-1 shrink-0 text-sm font-black text-white sm:mt-2 sm:text-lg">
                {character.name}
              </div>
              <div className="shrink-0 text-[10px] leading-3 text-zinc-400 sm:text-sm">
                {character.description}
              </div>
            </button>
          );
        })}
      </div>

      {/* Button — always accessible at bottom */}
      <div className="shrink-0 pb-1 pt-2">
        <button
          onClick={onContinue}
          className="w-full rounded-2xl bg-yellow-500 py-2.5 text-sm font-black uppercase tracking-[0.22em] text-black transition hover:bg-yellow-400 sm:py-3"
        >
          Lanjut ke Tutorial
        </button>
      </div>
    </div>
  </div>
);
