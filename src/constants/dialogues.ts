import type { DialogueMessage } from '../types/game';

/**
 * Build the opening dialogue sequence.
 * Updated for dimsum collection game flow:
 * Levels → Collect Dimsum → Stars → Tickets → Mystery Box
 */
export const buildOpeningDialogues = (playerName: string): DialogueMessage[] => [
  {
    speaker: 'Goblin Bay',
    side: 'left',
    text: `Hoi ${playerName || 'petualang'}! Selamat datang — arena pertarungan Goblin Bay!`,
  },
  {
    speaker: 'Player',
    side: 'right',
    text: `Hai Goblin! Aku ${playerName || 'petualang'}. Apa yang harus aku lakukan di sini?`,
  },
  {
    speaker: 'Goblin Bay',
    side: 'left',
    text: 'Misimu sederhana: lawan goblin, kumpulkan semua dimsum 🥟 di setiap level! Ada 6 level menantang yang harus kamu taklukkan.',
  },
  {
    speaker: 'Player',
    side: 'right',
    text: 'Dimsum? Jadi aku harus mengumpulkan dimsum sambil bertarung?',
  },
  {
    speaker: 'Goblin Bay',
    side: 'left',
    text: 'Tepat! Setiap level punya sejumlah dimsum yang tersebar di arena. Kumpulkan semua untuk mendapat ⭐ 3 bintang! Kamu juga bisa dapat 1 atau 2 bintang tergantung berapa banyak dimsum yang dikumpulkan.',
  },
  {
    speaker: 'Player',
    side: 'right',
    text: 'Lalu dimsum yang terkumpul bisa dipakai untuk apa?',
  },
  {
    speaker: 'Goblin Bay',
    side: 'left',
    text: 'Setiap 6 dimsum yang kamu kumpulkan akan otomatis menjadi 1 🎫 Ticket! Ticket bisa digunakan untuk membuka Mystery Box dengan memasukkan kode rahasia.',
  },
  {
    speaker: 'Player',
    side: 'right',
    text: 'Mystery Box? Ada apa di dalamnya?',
  },
  {
    speaker: 'Goblin Bay',
    side: 'left',
    text: 'Di dalam Mystery Box ada berbagai hadiah menarik — bisa berupa item spesial, bonus dimsum, kosmetik, atau bahkan Lucky Spin untuk hadiah fisik! Semuanya tergantung kode yang kamu masukkan. 🎁',
  },
  {
    speaker: 'Player',
    side: 'right',
    text: 'Keren! Aku sudah tidak sabar. Ayo mulai petualangannya!',
  },
];

/**
 * Build the level-complete dialogue.
 * Shown when player finishes a level (replaces old milestone dialogue).
 */
export const buildMilestoneDialogues = (
  playerName: string,
  milestone: number,
): DialogueMessage[] => [
  {
    speaker: 'Goblin Bay',
    side: 'left',
    text: `Luar biasa, ${playerName || 'petualang'}! Kamu berhasil menyelesaikan level ${milestone}!`,
  },
  {
    speaker: 'Player',
    side: 'right',
    text: 'Asyik! Aku sudah mengumpulkan banyak dimsum. Ayo lanjut ke level berikutnya!',
  },
];
