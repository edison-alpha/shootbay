import React from 'react';
import type { DialogueMessage } from '../../types/game';
import { IMAGE_ASSETS } from '../../constants/assets';
import { DialogueBubble } from '../ui/DialogueBubble';

interface DialogueScreenProps {
  messages: DialogueMessage[];
  currentIndex: number;
  playerName: string;
  profilePhoto: string | null;
  characterImage: string;
  characterName: string;
  onNext: () => void;
  /** Label for the final button (e.g. "Mulai" or "Lanjut Wish"). */
  finalLabel?: string;
  zIndex?: number;
}

/**
 * Generic dialogue overlay used for both the opening conversation
 * and the milestone conversation.
 */
export const DialogueScreen: React.FC<DialogueScreenProps> = ({
  messages,
  currentIndex,
  playerName,
  profilePhoto,
  characterImage,
  characterName,
  onNext,
  finalLabel = 'Mulai',
  zIndex = 70,
}) => {
  const isLast = currentIndex === messages.length - 1;

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{
        zIndex,
        backgroundImage: `url(${IMAGE_ASSETS.arena_background})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute inset-0 bg-black/20" />
      <div className="absolute inset-x-0 bottom-0 h-52 bg-gradient-to-t from-black/50 to-transparent" />

      <div
        className="absolute inset-0 flex flex-col justify-end px-4 pt-8 sm:px-8"
        style={{
          paddingBottom: 'max(64px, calc(64px + env(safe-area-inset-bottom, 0px)))',
        }}
      >
        <DialogueBubble
          message={messages[currentIndex]}
          playerName={playerName}
          profilePhoto={profilePhoto}
          characterImage={characterImage}
          characterName={characterName}
        />

        <div
          className="absolute inset-x-0 bottom-0 flex items-center justify-between px-4 text-white sm:px-8"
          style={{
            paddingBottom: 'max(12px, env(safe-area-inset-bottom, 12px))',
          }}
        >
          <div className="rounded-full bg-black/40 px-3 py-1 text-[11px] font-bold tracking-[0.25em] backdrop-blur-sm sm:text-xs">
            {currentIndex + 1}/{messages.length}
          </div>
          <button
            onClick={onNext}
            className="rounded-full bg-black/50 px-4 py-2 text-xs font-black uppercase tracking-[0.25em] text-white backdrop-blur-sm transition hover:bg-black/65 sm:px-5 sm:text-sm"
          >
            {isLast ? finalLabel : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
};
