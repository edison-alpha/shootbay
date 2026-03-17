/**
 * Level Configuration — defines each level's parameters.
 * Each level has a dimsum target, enemy configuration, and map settings.
 */

export interface LevelConfig {
  id: number;
  name: string;
  description: string;
  dimsumCount: number;        // Total dimsum to collect
  timeLimit: number;          // Time limit in seconds (0 = no limit)
  enemySpawnRate: number;     // Seconds between spawns
  maxEnemies: number;
  bossEnabled: boolean;
  turretCount: number;
  mapWidth: number;
  mapHeight: number;
  theme: 'ocean' | 'forest' | 'volcano' | 'sky' | 'dungeon';
  bgColor: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'extreme';
  icon: string;
  unlockRequirement: number;  // Stars needed to unlock (0 = free)
}

export const LEVELS: LevelConfig[] = [
  {
    id: 1,
    name: 'Dimsum Garden',
    description: 'A peaceful garden with scattered dimsum. Perfect for beginners!',
    dimsumCount: 3,
    timeLimit: 120,
    enemySpawnRate: 3.0,
    maxEnemies: 8,
    bossEnabled: false,
    turretCount: 2,
    mapWidth: 2000,
    mapHeight: 2000,
    theme: 'ocean',
    bgColor: '#0a1628',
    difficulty: 'easy',
    icon: '🌿',
    unlockRequirement: 0,
  },
  {
    id: 2,
    name: 'Bamboo Kitchen',
    description: 'More dimsum hidden among bamboo forests and crafty goblins.',
    dimsumCount: 4,
    timeLimit: 150,
    enemySpawnRate: 2.5,
    maxEnemies: 12,
    bossEnabled: false,
    turretCount: 3,
    mapWidth: 2500,
    mapHeight: 2500,
    theme: 'forest',
    bgColor: '#0d1f0d',
    difficulty: 'easy',
    icon: '🎋',
    unlockRequirement: 0,
  },
  {
    id: 3,
    name: 'Dragon Wok',
    description: 'The dragon guards its dimsum fiercely. Watch out for fire!',
    dimsumCount: 5,
    timeLimit: 180,
    enemySpawnRate: 2.0,
    maxEnemies: 15,
    bossEnabled: true,
    turretCount: 4,
    mapWidth: 3000,
    mapHeight: 3000,
    theme: 'volcano',
    bgColor: '#1a0a0a',
    difficulty: 'medium',
    icon: '🐉',
    unlockRequirement: 3,
  },
  {
    id: 4,
    name: 'Cloud Steamer',
    description: 'Dimsum steaming in the sky! Navigate through aerial dangers.',
    dimsumCount: 6,
    timeLimit: 180,
    enemySpawnRate: 1.8,
    maxEnemies: 18,
    bossEnabled: true,
    turretCount: 5,
    mapWidth: 3000,
    mapHeight: 3000,
    theme: 'sky',
    bgColor: '#0a1a2a',
    difficulty: 'medium',
    icon: '☁️',
    unlockRequirement: 6,
  },
  {
    id: 5,
    name: 'Goblin Feast',
    description: 'The goblins stole all the dimsum! Reclaim them from their dungeon.',
    dimsumCount: 7,
    timeLimit: 200,
    enemySpawnRate: 1.5,
    maxEnemies: 20,
    bossEnabled: true,
    turretCount: 6,
    mapWidth: 3500,
    mapHeight: 3500,
    theme: 'dungeon',
    bgColor: '#0f0a1a',
    difficulty: 'hard',
    icon: '👹',
    unlockRequirement: 10,
  },
  {
    id: 6,
    name: 'Emperor\'s Banquet',
    description: 'The grand finale! Collect the emperor\'s legendary golden dimsum.',
    dimsumCount: 8,
    timeLimit: 240,
    enemySpawnRate: 1.2,
    maxEnemies: 25,
    bossEnabled: true,
    turretCount: 8,
    mapWidth: 4000,
    mapHeight: 4000,
    theme: 'volcano',
    bgColor: '#1a0f00',
    difficulty: 'extreme',
    icon: '👑',
    unlockRequirement: 15,
  },
];

export function getLevelById(id: number): LevelConfig | undefined {
  return LEVELS.find(l => l.id === id);
}

export function getMaxStars(): number {
  return LEVELS.length * 3;
}

export function getTotalDimsumInAllLevels(): number {
  return LEVELS.reduce((sum, l) => sum + l.dimsumCount, 0);
}
