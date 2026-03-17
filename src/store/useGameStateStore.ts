import { create } from 'zustand';
import type { GameStoreData } from './gameStore';
import { loadGameData } from './gameStore';

interface GameStateStore {
  storeData: GameStoreData;
  setStoreData: (next: GameStoreData) => void;
  resetStoreData: () => void;
}

export const useGameStateStore = create<GameStateStore>((set) => ({
  storeData: loadGameData(),
  setStoreData: (next) => set({ storeData: next }),
  resetStoreData: () => set({ storeData: loadGameData() }),
}));

