import React from 'react';
import type { DialogueMessage } from '../../types/game';
import goblinBayPng from '../../assets/goblinbay.webp';

interface DialogueBubbleProps {
  message: DialogueMessage;
  playerName: string;
  profilePhoto: string | null;
  characterImage: string;
  characterName: string;
}

/**
 * A single dialogue bubble with speaker avatar.
 * Goblin Bay appears on the left; the player on the right.
 */
export const DialogueBubble: React.FC<DialogueBubbleProps> = ({
  message,
  playerName,
  profilePhoto,
  characterImage,
  characterName,
}) => {
  if (message.side === 'left') {
    return (
      <div className="flex items-end gap-3 justify-start">
        <img
          src={goblinBayPng}
          alt="Goblin Bay"
          className="h-[20vh] max-h-[180px] w-auto object-contain drop-shadow-2xl sm:h-[28vh] sm:max-h-[280px]"
        />
        <div className="max-w-[70vw] sm:max-w-[56vw]">
          <div className="relative rounded-[32px] rounded-bl-md bg-white px-5 py-4 text-zinc-800 shadow-2xl sm:px-7 sm:py-5">
            <div className="mb-2 text-[11px] font-black uppercase tracking-[0.28em] text-zinc-500 sm:text-xs">
              {message.speaker}
            </div>
            <p className="text-sm font-semibold leading-6 sm:text-lg sm:leading-8">{message.text}</p>
            <div className="absolute bottom-4 -left-3 h-6 w-6 rounded-full bg-white" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-end gap-3 justify-end">
      <div className="max-w-[70vw] sm:max-w-[56vw]">
        <div className="relative rounded-[32px] rounded-br-md bg-white px-5 py-4 text-zinc-800 shadow-2xl sm:px-7 sm:py-5">
          <div className="mb-2 text-[11px] font-black uppercase tracking-[0.28em] text-zinc-500 sm:text-xs">
            {playerName || 'Player'}
          </div>
          <p className="text-sm font-semibold leading-6 sm:text-lg sm:leading-8">{message.text}</p>
          <div className="absolute bottom-4 -right-3 h-6 w-6 rounded-full bg-white" />
        </div>
      </div>
      <div className="relative h-[18vh] w-[18vh] max-h-[150px] max-w-[150px] overflow-hidden rounded-[28px] border-4 border-white/70 bg-zinc-700 shadow-2xl sm:h-[24vh] sm:w-[24vh] sm:max-h-[220px] sm:max-w-[220px]">
        {profilePhoto ? (
          <img src={profilePhoto} alt={playerName || 'Player'} className="h-full w-full object-cover" />
        ) : (
          <img src={characterImage} alt={characterName} className="h-full w-full object-cover" />
        )}
      </div>
    </div>
  );
};
