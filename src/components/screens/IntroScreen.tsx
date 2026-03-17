import React from 'react';
import introPng from '../../assets/intro.webp';
import { ProgressBar } from '../ui/ProgressBar';

interface IntroScreenProps {
  loadingProgress: number;
  fading: boolean;
}

export const IntroScreen: React.FC<IntroScreenProps> = ({ loadingProgress, fading }) => (
  <div
    className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-black"
    style={{ opacity: fading ? 0 : 1, transition: 'opacity 0.8s ease-in-out' }}
  >
    <img src={introPng} alt="Game Intro" className="absolute inset-0 h-full w-full object-contain" />

    <div
      className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black via-black/60 to-transparent px-6 pt-12"
      style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom, 24px))' }}
    >
      <ProgressBar value={loadingProgress} />
    </div>
  </div>
);
