import type { Bullet, GameSnapshot, Minion, Obstacle, Particle, Pickup, PickupType, Player, Turret } from '../types/game';
import { GAME_CONFIG } from '../constants/config';

/** Create a fresh player at map centre. */
export function createPlayer(): Player {
  return {
    x: GAME_CONFIG.mapWidth / 2,
    y: GAME_CONFIG.mapHeight / 2,
    vx: 0,
    vy: 0,
    angle: 0,
    radius: 25,
  };
}

/** Fire bullets from the player based on current weapon. */
export function createBullets(player: Player, weapon: string, doubleBullets: boolean, time: number): Bullet[] {
  const dmg = GAME_CONFIG.bulletDamage;
  const speed = GAME_CONFIG.bulletSpeed;

  let spreads: number[];
  if (weapon === 'shotgun') {
    const s = GAME_CONFIG.shotgunSpread;
    spreads = Array.from({ length: GAME_CONFIG.shotgunBullets }, (_, i) =>
      -s * 2 + (s * 4 * i) / (GAME_CONFIG.shotgunBullets - 1),
    );
  } else {
    spreads = [-0.08, 0, 0.08];
  }

  // Determine visual type based on weapon
  const visualType: Bullet['visualType'] = weapon === 'shotgun' ? 'fire' : weapon === 'rapid' ? 'water' : 'default';

  const bullets: Bullet[] = spreads.map((spread) => {
    const angle = player.angle + spread;
    return {
      x: player.x + Math.cos(angle) * player.radius,
      y: player.y + Math.sin(angle) * player.radius,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 4,
      damage: dmg,
      visualType,
      animFrame: 0,
      spawnTime: time,
    };
  });

  if (doubleBullets) {
    const extra = bullets.map((b) => ({
      ...b,
      x: b.x + Math.cos(player.angle + Math.PI / 2) * 6,
      y: b.y + Math.sin(player.angle + Math.PI / 2) * 6,
    }));
    bullets.push(...extra);
  }

  return bullets;
}

/** Create a turret bullet aimed at a target position. */
export function createTurretBullet(turret: Turret, targetX: number, targetY: number, time: number): Bullet {
  const angle = Math.atan2(targetY - turret.y, targetX - turret.x);
  return {
    x: turret.x + Math.cos(angle) * turret.radius,
    y: turret.y + Math.sin(angle) * turret.radius,
    vx: Math.cos(angle) * GAME_CONFIG.turretBulletSpeed,
    vy: Math.sin(angle) * GAME_CONFIG.turretBulletSpeed,
    radius: 5,
    damage: GAME_CONFIG.turretDamage,
    fromTurret: true,
    visualType: 'fire_arrow',
    animFrame: 0,
    spawnTime: time,
  };
}

/** Create a boss bullet aimed at the player. */
export function createBossBullet(bossX: number, bossY: number, targetX: number, targetY: number, bossType: string, time: number): Bullet {
  const angle = Math.atan2(targetY - bossY, targetX - bossX);
  const vType: Bullet['visualType'] = bossType === 'boss_viking' ? 'fire_spell' :
    bossType === 'boss_goblin' ? 'water_spell' : 'boss_fire';
  return {
    x: bossX + Math.cos(angle) * 40,
    y: bossY + Math.sin(angle) * 40,
    vx: Math.cos(angle) * GAME_CONFIG.bossBulletSpeed,
    vy: Math.sin(angle) * GAME_CONFIG.bossBulletSpeed,
    radius: 7,
    damage: GAME_CONFIG.bossBulletDamage,
    fromBoss: true,
    visualType: vType,
    animFrame: 0,
    spawnTime: time,
  };
}

/** Spawn a minion from a random direction relative to the player position. */
export function createMinion(playerX: number, playerY: number): Minion {
  const angle = Math.random() * Math.PI * 2;
  const dist = 400 + Math.random() * 200;
  let mx = playerX + Math.cos(angle) * dist;
  let my = playerY + Math.sin(angle) * dist;
  mx = Math.max(30, Math.min(GAME_CONFIG.mapWidth - 30, mx));
  my = Math.max(30, Math.min(GAME_CONFIG.mapHeight - 30, my));

  const isElite = Math.random() < GAME_CONFIG.eliteGoblinChance;

  return {
    x: mx,
    y: my,
    radius: isElite ? 34 : 20,
    health: isElite ? GAME_CONFIG.eliteGoblinHealth : GAME_CONFIG.minionHealth,
    maxHealth: isElite ? GAME_CONFIG.eliteGoblinHealth : GAME_CONFIG.minionHealth,
    angle: 0,
    speed: isElite ? GAME_CONFIG.eliteGoblinSpeed : GAME_CONFIG.minionSpeed,
    damage: isElite ? GAME_CONFIG.eliteGoblinDamage : GAME_CONFIG.collisionDamage,
    scoreValue: isElite ? GAME_CONFIG.pointsPerEliteGoblin : GAME_CONFIG.pointsPerMinion,
    type: isElite ? 'elite' : 'normal',
    facingRight: true,
  };
}

/** Spawn a boss enemy near the player. */
export function createBoss(playerX: number, playerY: number): Minion {
  const angle = Math.random() * Math.PI * 2;
  const dist = 500 + Math.random() * 200;
  let bx = playerX + Math.cos(angle) * dist;
  let by = playerY + Math.sin(angle) * dist;
  bx = Math.max(80, Math.min(GAME_CONFIG.mapWidth - 80, bx));
  by = Math.max(80, Math.min(GAME_CONFIG.mapHeight - 80, by));

  // Randomly select boss type
  const bossTypes = ['boss_viking', 'boss_goblin', 'boss_caveman'] as const;
  const bossType = bossTypes[Math.floor(Math.random() * bossTypes.length)];

  switch (bossType) {
    case 'boss_viking':
      return {
        x: bx, y: by,
        radius: GAME_CONFIG.bossVikingRadius,
        health: GAME_CONFIG.bossVikingHealth,
        maxHealth: GAME_CONFIG.bossVikingHealth,
        angle: 0,
        speed: GAME_CONFIG.bossVikingSpeed,
        damage: GAME_CONFIG.bossVikingDamage,
        scoreValue: GAME_CONFIG.bossVikingScore,
        type: 'boss_viking',
        animFrame: 0,
        lastAttack: 0,
        bossState: 'idle',
        chargeTimer: 0,
        facingRight: true,
        hurtTimer: 0,
      };
    case 'boss_goblin':
      return {
        x: bx, y: by,
        radius: GAME_CONFIG.bossGoblinRadius,
        health: GAME_CONFIG.bossGoblinHealth,
        maxHealth: GAME_CONFIG.bossGoblinHealth,
        angle: 0,
        speed: GAME_CONFIG.bossGoblinSpeed,
        damage: GAME_CONFIG.bossGoblinDamage,
        scoreValue: GAME_CONFIG.bossGoblinScore,
        type: 'boss_goblin',
        animFrame: 0,
        lastAttack: 0,
        bossState: 'idle',
        chargeTimer: 0,
        facingRight: true,
        hurtTimer: 0,
      };
    case 'boss_caveman':
    default:
      return {
        x: bx, y: by,
        radius: GAME_CONFIG.bossCavemanRadius,
        health: GAME_CONFIG.bossCavemanHealth,
        maxHealth: GAME_CONFIG.bossCavemanHealth,
        angle: 0,
        speed: GAME_CONFIG.bossCavemanSpeed,
        damage: GAME_CONFIG.bossCavemanDamage,
        scoreValue: GAME_CONFIG.bossCavemanScore,
        type: 'boss_caveman',
        animFrame: 0,
        lastAttack: 0,
        bossState: 'idle',
        chargeTimer: 0,
        facingRight: true,
        hurtTimer: 0,
      };
  }
}

/** Generate turrets spread across the map. */
export function createTurrets(): Turret[] {
  const turrets: Turret[] = [];
  const margin = 200;
  const safeZone = 400;
  const cx = GAME_CONFIG.mapWidth / 2;
  const cy = GAME_CONFIG.mapHeight / 2;

  for (let i = 0; i < GAME_CONFIG.turretCount; i++) {
    let x: number, y: number;
    do {
      x = margin + Math.random() * (GAME_CONFIG.mapWidth - margin * 2);
      y = margin + Math.random() * (GAME_CONFIG.mapHeight - margin * 2);
    } while (Math.hypot(x - cx, y - cy) < safeZone);

    turrets.push({
      x,
      y,
      radius: GAME_CONFIG.turretRadius,
      health: GAME_CONFIG.turretHealth,
      maxHealth: GAME_CONFIG.turretHealth,
      lastShot: 0,
      range: GAME_CONFIG.turretRange,
      fireRate: GAME_CONFIG.turretFireRate,
      damage: GAME_CONFIG.turretDamage,
      scoreValue: GAME_CONFIG.turretScore,
    });
  }
  return turrets;
}

/** Create a pickup at a given position. */
export function createPickup(x: number, y: number, type?: PickupType): Pickup {
  const types: PickupType[] = ['heart', 'weapon_shotgun', 'weapon_rapid', 'powerup_double', 'shield', 'speed_boost', 'coin', 'energy_pack'];

  // Chance for mystery box
  if (!type && Math.random() < GAME_CONFIG.mysteryBoxChance) {
    return {
      x,
      y,
      radius: 22,
      type: 'mystery_box',
      life: GAME_CONFIG.pickupLifetime * 1.5,
      floatOffset: Math.random() * Math.PI * 2,
      chestState: 'closed',
      chestTimer: 0,
    };
  }

  // Energy pack variant
  const chosenType = type ?? types[Math.floor(Math.random() * types.length)];
  const energyVariant = chosenType === 'energy_pack'
    ? [1, 2, 3, 5, 7, 10, 15, 20, 25, 30][Math.floor(Math.random() * 10)]
    : undefined;

  return {
    x,
    y,
    radius: 18,
    type: chosenType,
    life: GAME_CONFIG.pickupLifetime,
    floatOffset: Math.random() * Math.PI * 2,
    energyVariant,
  };
}

/** Spawn a random pickup near the player. */
export function createRandomPickup(playerX: number, playerY: number): Pickup {
  const angle = Math.random() * Math.PI * 2;
  const dist = 150 + Math.random() * 250;
  const x = Math.max(50, Math.min(GAME_CONFIG.mapWidth - 50, playerX + Math.cos(angle) * dist));
  const y = Math.max(50, Math.min(GAME_CONFIG.mapHeight - 50, playerY + Math.sin(angle) * dist));
  return createPickup(x, y);
}

/** Create a dimsum pickup at a specific position (does not expire). */
export function createDimsumPickup(x: number, y: number): Pickup {
  return {
    x,
    y,
    radius: 20,
    type: 'dimsum',
    life: 999999, // Dimsum never expires — must be collected
    floatOffset: Math.random() * Math.PI * 2,
  };
}

/** Spawn dimsum pickups across the map for a level. */
export function spawnLevelDimsum(mapWidth: number, mapHeight: number, count: number, playerX: number, playerY: number): Pickup[] {
  const dimsum: Pickup[] = [];
  const margin = 100;
  const minDistFromPlayer = 200;
  const minDistBetween = 150;

  for (let i = 0; i < count; i++) {
    let attempts = 0;
    let x: number, y: number;
    do {
      x = margin + Math.random() * (mapWidth - margin * 2);
      y = margin + Math.random() * (mapHeight - margin * 2);
      attempts++;
    } while (
      attempts < 50 &&
      (Math.hypot(x - playerX, y - playerY) < minDistFromPlayer ||
       dimsum.some(d => Math.hypot(d.x - x, d.y - y) < minDistBetween))
    );
    dimsum.push(createDimsumPickup(x, y));
  }
  return dimsum;
}

/** Create a map obstacle near the player. */
export function createObstacle(playerX: number, playerY: number): Obstacle {
  const angle = Math.random() * Math.PI * 2;
  const dist = 200 + Math.random() * 350;
  let ox = playerX + Math.cos(angle) * dist;
  let oy = playerY + Math.sin(angle) * dist;
  ox = Math.max(80, Math.min(GAME_CONFIG.mapWidth - 80, ox));
  oy = Math.max(80, Math.min(GAME_CONFIG.mapHeight - 80, oy));

  const obstacleTypes: Array<{ type: Obstacle['type']; spriteKey: string; radius: number; damage: number; destructible: boolean; health?: number }> = [
    { type: 'bomb', spriteKey: 'obstacle_bomb', radius: 20, damage: GAME_CONFIG.bombDamage, destructible: true, health: 1 },
    { type: 'barrel', spriteKey: `obstacle_barrel_${Math.random() > 0.5 ? 1 : 2}`, radius: 22, damage: GAME_CONFIG.barrelDamage, destructible: true, health: 3 },
    { type: 'stone', spriteKey: `obstacle_stone_${Math.floor(Math.random() * 6) + 1}`, radius: 25, damage: 5, destructible: false },
    { type: 'net', spriteKey: 'obstacle_net', radius: 30, damage: 0, destructible: true, health: 2 },
    { type: 'seaweed', spriteKey: `obstacle_seaweed_${Math.random() > 0.5 ? 1 : 2}`, radius: 18, damage: 0, destructible: false },
  ];

  const chosen = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];

  return {
    x: ox,
    y: oy,
    radius: chosen.radius,
    type: chosen.type,
    spriteKey: chosen.spriteKey,
    damage: chosen.damage,
    destructible: chosen.destructible,
    health: chosen.health,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// ENHANCED VISUAL EFFECTS — professional particle factories
// ═══════════════════════════════════════════════════════════════════════════

/** Create death-burst particles at a position. */
export function createDeathParticles(x: number, y: number, count = 5, color?: string): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 100 + 50;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.8,
      color: color ?? '#4ade80',
      size: 3 + Math.random() * 2,
      sizeDecay: 4,
      glow: true,
    });
  }
  return particles;
}

/** Create boss death explosion — 38 particles total (30 burst + 8 energy). */
export function createBossDeathParticles(x: number, y: number): Particle[] {
  const particles: Particle[] = [];
  const colors = ['#ff6b35', '#ff4444', '#fbbf24', '#a855f7', '#ffffff'];

  // Burst — 30 particles
  for (let i = 0; i < 30; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 80 + Math.random() * 200;
    particles.push({
      x: x + (Math.random() - 0.5) * 20,
      y: y + (Math.random() - 0.5) * 20,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1 + Math.random() * 0.4,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 4 + Math.random() * 5,
      sizeDecay: 4,
      glow: true,
    });
  }

  // Energy sprite particles — 8 particles
  const energyKeys = ['energy_1', 'energy_5', 'energy_15', 'energy_35', 'energy_1', 'energy_5', 'energy_15', 'energy_35'];
  for (let i = 0; i < 8; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 60 + Math.random() * 80;
    particles.push({
      x: x + (Math.random() - 0.5) * 15,
      y: y + (Math.random() - 0.5) * 15,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1.2,
      size: 25 + Math.random() * 15,
      sizeDecay: 15,
      glow: true,
      spriteKey: energyKeys[i],
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 3,
    });
  }

  return particles;
}

/** Create score bubble particles — 4 bubbles. */
export function createScoreBubble(x: number, y: number, scoreText: string): Particle[] {
  const particles: Particle[] = [];
  const bubbleKeys = ['bubble_1', 'bubble_2', 'bubble_3', 'bubble_2'];
  for (let i = 0; i < 4; i++) {
    particles.push({
      x: x + (Math.random() - 0.5) * 10,
      y,
      vx: (Math.random() - 0.5) * 20,
      vy: -55 - Math.random() * 30,
      life: 1.5,
      size: 28 + Math.random() * 8,
      sizeDecay: 5,
      glow: false,
      spriteKey: bubbleKeys[i],
      rotation: 0,
      rotationSpeed: 0,
      text: i === 0 ? scoreText : undefined,
      fontSize: i === 0 ? 12 : undefined,
      isScoreBubble: true,
    });
  }
  return particles;
}

/** Create muzzle flash particles when shooting — 6 particles. */
export function createMuzzleFlash(x: number, y: number, angle: number): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < 6; i++) {
    const spread = angle + (Math.random() - 0.5) * 0.6;
    const speed = 120 + Math.random() * 80;
    particles.push({
      x,
      y,
      vx: Math.cos(spread) * speed,
      vy: Math.sin(spread) * speed,
      life: 0.3 + Math.random() * 0.15,
      color: i < 4 ? '#fbbf24' : '#fb923c',
      size: 2 + Math.random() * 2,
      sizeDecay: 10,
      glow: true,
    });
  }
  return particles;
}

/** Create impact sparks when a bullet hits something. */
export function createImpactSparks(x: number, y: number, count = 6, color = '#fbbf24'): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 80 + Math.random() * 100;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.5 + Math.random() * 0.3,
      color,
      size: 1.5 + Math.random() * 2,
      sizeDecay: 5,
      glow: true,
    });
  }
  return particles;
}

/** Create turret/bomb explosion — big, dramatic. */
export function createExplosion(x: number, y: number): Particle[] {
  const particles: Particle[] = [];
  const colors = ['#ff6b35', '#ff4444', '#fbbf24', '#ef4444', '#ffffff'];
  for (let i = 0; i < 20; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 60 + Math.random() * 200;
    particles.push({
      x: x + (Math.random() - 0.5) * 20,
      y: y + (Math.random() - 0.5) * 20,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.8 + Math.random() * 0.5,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 3 + Math.random() * 5,
      sizeDecay: 4,
      glow: true,
    });
  }
  // Add a slow expanding ring particle (large, slow decay)
  particles.push({
    x,
    y,
    vx: 0,
    vy: 0,
    life: 0.6,
    color: 'rgba(255, 107, 53, 0.4)',
    size: 30,
    sizeDecay: -40, // grows
    glow: true,
  });

  // Fire spell explosion effect
  particles.push({
    x, y, vx: 0, vy: 0, life: 0.8,
    size: 50, sizeDecay: 20, glow: true,
    spriteKey: 'fire_spell_1',
    rotation: Math.random() * Math.PI * 2,
    rotationSpeed: (Math.random() - 0.5) * 3,
  });

  return particles;
}

/** Create pickup collect sparkle effect. */
export function createPickupSparkle(x: number, y: number, color: string): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < 10; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 40 + Math.random() * 80;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.6 + Math.random() * 0.4,
      color,
      size: 2 + Math.random() * 3,
      sizeDecay: 3,
      glow: true,
    });
  }
  return particles;
}

/** Create mystery box open effect — sparkles + energy burst. */
export function createChestOpenEffect(x: number, y: number): Particle[] {
  const particles: Particle[] = [];
  const colors = ['#fbbf24', '#f59e0b', '#ffffff', '#22d3ee', '#a855f7'];

  for (let i = 0; i < 16; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 50 + Math.random() * 120;
    particles.push({
      x: x + (Math.random() - 0.5) * 10,
      y: y + (Math.random() - 0.5) * 10,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 30,
      life: 0.8 + Math.random() * 0.4,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 3 + Math.random() * 4,
      sizeDecay: 4,
      glow: true,
    });
  }

  // Energy sprites flying out
  const energyKeys = ['energy_1', 'energy_5', 'energy_10', 'energy_25'];
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2 - Math.PI / 2;
    particles.push({
      x, y, 
      vx: Math.cos(angle) * 80,
      vy: Math.sin(angle) * 80 - 40,
      life: 1.2,
      size: 24 + Math.random() * 16,
      sizeDecay: 12,
      glow: true,
      spriteKey: energyKeys[i],
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 6,
    });
  }

  return particles;
}

/** Create shield activation effect. */
export function createShieldEffect(x: number, y: number): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < 16; i++) {
    const angle = (i / 16) * Math.PI * 2;
    particles.push({
      x: x + Math.cos(angle) * 35,
      y: y + Math.sin(angle) * 35,
      vx: Math.cos(angle) * 30,
      vy: Math.sin(angle) * 30,
      life: 0.8,
      color: '#22d3ee',
      size: 4,
      sizeDecay: 3,
      glow: true,
    });
  }
  // Water spell effect around shield
  particles.push({
    x, y, vx: 0, vy: 0, life: 0.6,
    size: 60, sizeDecay: 30, glow: true,
    spriteKey: 'water_spell_1',
    rotation: 0,
    rotationSpeed: 2,
  });
  return particles;
}

/** Create bomb explosion effect with more drama. */
export function createBombExplosion(x: number, y: number): Particle[] {
  const particles: Particle[] = [];
  const colors = ['#ff4444', '#ff6b35', '#fbbf24', '#ffffff'];

  for (let i = 0; i < 24; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 100 + Math.random() * 250;
    particles.push({
      x: x + (Math.random() - 0.5) * 15,
      y: y + (Math.random() - 0.5) * 15,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.8 + Math.random() * 0.4,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 4 + Math.random() * 6,
      sizeDecay: 5,
      glow: true,
    });
  }

  // Expanding shockwave
  particles.push({
    x, y, vx: 0, vy: 0, life: 0.5,
    color: 'rgba(255, 68, 68, 0.4)',
    size: 20, sizeDecay: -80, glow: true,
  });

  // Fire spell explosion
  particles.push({
    x, y, vx: 0, vy: 0, life: 0.7,
    size: 60, sizeDecay: 25, glow: true,
    spriteKey: 'fire_spell_4',
    rotation: Math.random() * Math.PI * 2,
    rotationSpeed: (Math.random() - 0.5) * 5,
  });

  return particles;
}

/** Create energy pack collect effect. */
export function createEnergyCollectEffect(x: number, y: number, variant: number): Particle[] {
  const particles: Particle[] = [];

  // Energy sprite ascending
  particles.push({
    x, y,
    vx: 0, vy: -50,
    life: 1.2,
    size: 40,
    sizeDecay: 15,
    glow: true,
    spriteKey: `energy_${variant}`,
    rotation: 0,
    rotationSpeed: 2,
  });

  // Sparkle ring
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    particles.push({
      x: x + Math.cos(angle) * 20,
      y: y + Math.sin(angle) * 20,
      vx: Math.cos(angle) * 50,
      vy: Math.sin(angle) * 50,
      life: 0.6,
      color: '#22d3ee',
      size: 3,
      sizeDecay: 4,
      glow: true,
    });
  }

  return particles;
}

// ═══════════════════════════════════════════════════════════════════════════
// SNAPSHOT FACTORIES
// ═══════════════════════════════════════════════════════════════════════════

/** Create a blank game snapshot for initialisation / restart. */
export function createInitialGameSnapshot(): GameSnapshot {
  return {
    score: 0,
    health: GAME_CONFIG.playerMaxHealth,
    lives: GAME_CONFIG.playerLives,
    player: createPlayer(),
    bullets: [],
    minions: [],
    particles: [],
    turrets: createTurrets(),
    pickups: [],
    obstacles: [],
    powerUps: [],
    weapon: 'default',
    camera: { x: 0, y: 0 },
    shake: { intensity: 0, duration: 0, offsetX: 0, offsetY: 0 },
    keys: {},
    mouse: { x: window.innerWidth / 2, y: window.innerHeight / 2, down: false },
    joysticks: {
      left: { active: false, id: null, baseX: 0, baseY: 0, dx: 0, dy: 0 },
      right: { active: false, id: null, baseX: 0, baseY: 0, dx: 0, dy: 0 },
    },
    lastShot: 0,
    lastSpawn: 0,
    lastDamage: 0,
    lastPickupSpawn: 0,
    lastBossSpawn: 0,
    bossesKilled: 0,
    images: {},
    audio: {},
    milestoneIndex: 0,
    state: 'intro',
    speedMultiplier: 1,
    shieldActive: false,
    lastObstacleSpawn: 0,
    lastScoreBubble: 0,
    dimsumCollected: 0,
    dimsumTotal: 0,
    currentLevelId: 1,
    levelStartTime: 0,
    lastDimsumSpawn: 0,
    paused: false,
  };
}

/** Mutate-reset a snapshot in place (keeps object identity for the game loop closure). */
export function resetGameSnapshot(g: GameSnapshot): void {
  g.score = 0;
  g.health = GAME_CONFIG.playerMaxHealth;
  g.lives = GAME_CONFIG.playerLives;
  g.player = createPlayer();
  g.bullets.length = 0;
  g.minions.length = 0;
  g.particles.length = 0;
  g.turrets = createTurrets();
  g.pickups.length = 0;
  g.obstacles.length = 0;
  g.powerUps.length = 0;
  g.weapon = 'default';
  g.camera = { x: 0, y: 0 };
  g.shake = { intensity: 0, duration: 0, offsetX: 0, offsetY: 0 };
  g.keys = {};
  g.mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2, down: false };
  g.joysticks = {
    left: { active: false, id: null, baseX: 0, baseY: 0, dx: 0, dy: 0 },
    right: { active: false, id: null, baseX: 0, baseY: 0, dx: 0, dy: 0 },
  };
  g.lastShot = 0;
  g.lastSpawn = 0;
  g.lastDamage = 0;
  g.lastPickupSpawn = 0;
  g.lastBossSpawn = 0;
  g.bossesKilled = 0;
  g.milestoneIndex = 0;
  g.state = 'nameEntry';
  g.speedMultiplier = 1;
  g.shieldActive = false;
  g.lastObstacleSpawn = 0;
  g.lastScoreBubble = 0;
  g.dimsumCollected = 0;
  g.dimsumTotal = 0;
  g.currentLevelId = 1;
  g.levelStartTime = 0;
  g.lastDimsumSpawn = 0;
  g.paused = false;
}
