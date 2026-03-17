// ─── Game State Machine ─────────────────────────────────────────────────────
export type GameState =
  | 'intro'
  | 'signup'
  | 'login'
  | 'adminDashboard'
  | 'nameEntry'
  | 'photoCapture'
  | 'characterSelect'
  | 'dialogue'
  | 'tutorial'
  | 'milestoneDialogue'
  | 'battleLoading'
  | 'playing'
  | 'wish'
  | 'gameover'
  | 'birthday'
  | 'mainMenu'
  | 'levelSelect'
  | 'leaderboard'
  | 'inventory'
  | 'mysteryBox'
  | 'settings'
  | 'levelComplete'
  | 'spinWheel';

// ─── Dialogue ───────────────────────────────────────────────────────────────
export type DialogueSpeaker = 'Goblin Bay' | 'Player';

export interface DialogueMessage {
  speaker: DialogueSpeaker;
  side: 'left' | 'right';
  text: string;
}

// ─── Character Selection ────────────────────────────────────────────────────
export type CharacterId = 'agree' | 'agreedaster';

export interface CharacterOption {
  id: CharacterId;
  name: string;
  image: string;
  description: string;
}

// ─── Game Entities ──────────────────────────────────────────────────────────
export interface Vector2D {
  x: number;
  y: number;
}

export interface Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  radius: number;
}

export interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  fromTurret?: boolean;
  fromBoss?: boolean;
  /** Visual type for projectile rendering */
  visualType?: 'default' | 'fire' | 'water' | 'boss_fire' | 'fire_arrow' | 'water_arrow' | 'fire_spell' | 'water_spell';
  /** Animation frame index for sprite-based bullets */
  animFrame?: number;
  /** Spawn time for animation timing */
  spawnTime?: number;
}

export type MinionType = 'normal' | 'elite' | 'boss_viking' | 'boss_goblin' | 'boss_caveman';

export interface Minion {
  x: number;
  y: number;
  radius: number;
  health: number;
  maxHealth: number;
  angle: number;
  speed: number;
  damage: number;
  scoreValue: number;
  type: MinionType;
  /** Animation frame index (for boss sprites) */
  animFrame?: number;
  /** Last attack timestamp (for boss ranged attacks) */
  lastAttack?: number;
  /** Boss state: 'idle' | 'charging' | 'attacking' | 'hurt' */
  bossState?: 'idle' | 'charging' | 'attacking' | 'hurt';
  /** Charge timer for boss dash attacks */
  chargeTimer?: number;
  /** Direction the boss is facing */
  facingRight?: boolean;
  /** Hurt flash timer */
  hurtTimer?: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color?: string;
  size?: number;       // start size (default 3)
  sizeDecay?: number;  // shrink per second
  glow?: boolean;      // render with additive glow
  /** Optional image key for sprite-based particles */
  spriteKey?: string;
  /** Rotation angle for sprite particles */
  rotation?: number;
  /** Rotation speed */
  rotationSpeed?: number;
  /** Text to display (for score bubbles) */
  text?: string;
  /** Font size for text particles */
  fontSize?: number;
  /** Whether this is a score bubble particle */
  isScoreBubble?: boolean;
}

// ─── Turrets (destructible structures) ──────────────────────────────────────
export interface Turret {
  x: number;
  y: number;
  radius: number;
  health: number;
  maxHealth: number;
  lastShot: number;
  range: number;
  fireRate: number;
  damage: number;
  scoreValue: number;
}

// ─── Pickups ────────────────────────────────────────────────────────────────
export type PickupType =
  | 'heart'
  | 'weapon_shotgun'
  | 'weapon_rapid'
  | 'powerup_double'
  | 'shield'
  | 'speed_boost'
  | 'coin'
  | 'mystery_box'
  | 'energy_pack'
  | 'dimsum';

export interface Pickup {
  x: number;
  y: number;
  radius: number;
  type: PickupType;
  life: number; // despawn timer (seconds remaining)
  /** Float animation offset */
  floatOffset?: number;
  /** Mystery box state: closed → ajar → open */
  chestState?: 'closed' | 'ajar' | 'open';
  /** Timer for chest opening animation */
  chestTimer?: number;
  /** Energy pack variant (1-50) */
  energyVariant?: number;
}

// ─── Map Obstacles (hazards) ────────────────────────────────────────────────
export interface Obstacle {
  x: number;
  y: number;
  radius: number;
  type: 'bomb' | 'barrel' | 'stone' | 'net' | 'seaweed';
  /** Sprite key for rendering */
  spriteKey: string;
  /** Damage dealt on collision */
  damage: number;
  /** Whether it destroys on impact */
  destructible: boolean;
  /** Health for destructible obstacles */
  health?: number;
  /** Whether already triggered */
  triggered?: boolean;
}

// ─── Weapons ────────────────────────────────────────────────────────────────
export type WeaponType = 'default' | 'shotgun' | 'rapid';

// ─── Active Power-ups ───────────────────────────────────────────────────────
export interface ActivePowerUp {
  type: 'double_bullets' | 'shield' | 'speed_boost';
  remaining: number; // seconds left
}

// ─── Input State ────────────────────────────────────────────────────────────
export interface JoystickState {
  active: boolean;
  id: number | null;
  baseX: number;
  baseY: number;
  dx: number;
  dy: number;
}

export interface MouseState {
  x: number;
  y: number;
  down: boolean;
}

// ─── Camera ─────────────────────────────────────────────────────────────────
export interface Camera {
  x: number;
  y: number;
}

// ─── Screen Shake ───────────────────────────────────────────────────────────
export interface ScreenShake {
  intensity: number;  // current shake amplitude (pixels)
  duration: number;   // time remaining (seconds)
  offsetX: number;    // computed offset for this frame
  offsetY: number;
}

// ─── Game Snapshot (mutable ref for the game loop) ──────────────────────────
export interface GameSnapshot {
  score: number;
  health: number;
  lives: number;
  player: Player;
  bullets: Bullet[];
  minions: Minion[];
  particles: Particle[];
  turrets: Turret[];
  pickups: Pickup[];
  obstacles: Obstacle[];
  powerUps: ActivePowerUp[];
  weapon: WeaponType;
  camera: Camera;
  shake: ScreenShake;
  keys: Record<string, boolean>;
  mouse: MouseState;
  joysticks: {
    left: JoystickState;
    right: JoystickState;
  };
  lastShot: number;
  lastSpawn: number;
  lastDamage: number;
  lastPickupSpawn: number;
  /** Boss spawn tracking */
  lastBossSpawn: number;
  bossesKilled: number;
  images: Record<string, HTMLImageElement>;
  audio: Record<string, HTMLAudioElement>;
  milestoneIndex: number;
  state: GameState;
  /** Speed boost multiplier */
  speedMultiplier: number;
  /** Shield active flag */
  shieldActive: boolean;
  /** Last obstacle spawn time */
  lastObstacleSpawn: number;
  /** Total score animation bubbles tracker */
  lastScoreBubble: number;
  /** Dimsum collected in current level */
  dimsumCollected: number;
  /** Total dimsum in current level */
  dimsumTotal: number;
  /** Current level ID */
  currentLevelId: number;
  /** Level start time for timing */
  levelStartTime: number;
  /** Last dimsum spawn time */
  lastDimsumSpawn: number;
  /** Game is paused (overlay shown but world still renders) */
  paused: boolean;
}
