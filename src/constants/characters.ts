import type { CharacterOption } from '../types/game';
import agreePng from '../assets/agree.webp';
import agreedasterPng from '../assets/agreedaster.webp';

export const CHARACTER_OPTIONS: CharacterOption[] = [
  {
    id: 'agree',
    name: 'Mode Tempur',
    image: agreePng,
    description: 'Siap tempur, manis, dan pede maksimal.',
  },
  {
    id: 'agreedaster',
    name: 'Dasterr Tempur',
    image: agreedasterPng,
    description: 'Santai, lucu, tapi tetap barbar saat lawan datang.',
  },
];
