import React, { useCallback } from 'react';
import type { GameSnapshot } from '../types/game';
import { playSoundEffect } from '../utils/audio';

/**
 * Provides high-level audio controls that operate on the game snapshot's
 * pre-loaded audio map.
 */
export function useAudioManager(
  gameRef: React.MutableRefObject<GameSnapshot>,
) {
  const startBackgroundMusic = useCallback(() => {
    const state = gameRef.current;
    const bgm = state.audio['background_music'];
    const vm = state.audio['victory_music'];

    if (vm) { vm.pause(); vm.currentTime = 0; }

    if (bgm) {
      bgm.loop = true;
      bgm.volume = 0.45;
      bgm.currentTime = 0;
      bgm.play().catch(() => {
        const retry = () => {
          bgm.play().catch(() => {});
          window.removeEventListener('pointerdown', retry);
          window.removeEventListener('touchstart', retry);
        };
        window.addEventListener('pointerdown', retry, { once: true });
        window.addEventListener('touchstart', retry, { once: true });
      });
    }
  }, [gameRef]);

  const stopBackgroundMusic = useCallback(() => {
    const bgm = gameRef.current.audio['background_music'];
    if (bgm) { bgm.pause(); bgm.currentTime = 0; }
  }, [gameRef]);

  const stopVictoryMusic = useCallback(() => {
    const vm = gameRef.current.audio['victory_music'];
    if (vm) { vm.pause(); vm.currentTime = 0; }
  }, [gameRef]);

  const playVictoryMusic = useCallback(() => {
    playSoundEffect(gameRef.current.audio['victory_music']);
  }, [gameRef]);

  return { startBackgroundMusic, stopBackgroundMusic, stopVictoryMusic, playVictoryMusic };
}
