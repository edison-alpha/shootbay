import type { GameSnapshot } from '../types/game';
import { GAME_CONFIG } from '../constants/config';
import { clamp } from '../utils/math';
import {
  createBullets,
  createMinion,
  createBoss,
  createBossBullet,
  createDeathParticles,
  createBossDeathParticles,
  createTurretBullet,
  createRandomPickup,
  createPickup,
  createObstacle,
  createMuzzleFlash,
  createImpactSparks,
  createExplosion,
  createBombExplosion,
  createPickupSparkle,
  createShieldEffect,
  createChestOpenEffect,
  createScoreBubble,
  createEnergyCollectEffect,
  spawnLevelDimsum,
} from './entities';
import { playSoundEffect } from '../utils/audio';

export interface PhysicsEvents {
  onScoreChange: (score: number) => void;
  onHealthChange: (health: number) => void;
  onLivesChange: (lives: number) => void;
  onGameOver: () => void;
  onMilestone: (milestone: number) => void;
  onBirthday: () => void;
  onDimsumCollected: (collected: number, total: number) => void;
  onLevelComplete: () => void;
}

function triggerShake(state: GameSnapshot, intensity: number, duration: number) {
  state.shake.intensity = Math.max(state.shake.intensity, intensity);
  state.shake.duration = Math.max(state.shake.duration, duration);
}

function isBoss(type: string): boolean {
  return type === 'boss_viking' || type === 'boss_goblin' || type === 'boss_caveman';
}

function applyPlayerDamage(state: GameSnapshot, damage: number, time: number, events: PhysicsEvents): boolean {
  if (state.shieldActive) {
    const reducedDamage = Math.floor(damage * 0.3);
    if (reducedDamage > 0) {
      state.health -= reducedDamage;
      events.onHealthChange(state.health);
    }
    return state.health <= 0;
  }
  state.health -= damage;
  state.lastDamage = time;
  events.onHealthChange(state.health);
  return state.health <= 0;
}

function handlePlayerDeath(state: GameSnapshot, time: number, events: PhysicsEvents): boolean {
  state.lives--;
  events.onLivesChange(state.lives);
  if (state.lives <= 0) {
    triggerShake(state, 15, 0.5);
    state.minions.length = 0;
    state.bullets.length = 0;
    state.particles.length = 0;
    state.state = 'gameover';
    events.onGameOver();
    return true;
  }
  state.health = GAME_CONFIG.playerMaxHealth;
  events.onHealthChange(state.health);
  state.lastDamage = time;
  return false;
}

function checkDimsumCompletion(state: GameSnapshot, events: PhysicsEvents): boolean {
  // Check if all dimsum collected → level complete
  if (state.dimsumTotal > 0 && state.dimsumCollected >= state.dimsumTotal) {
    state.minions.length = 0;
    state.bullets.length = 0;
    state.particles.length = 0;
    state.state = 'levelComplete';
    playSoundEffect(state.audio['milestone_sound']);
    events.onLevelComplete();
    return true;
  }
  return false;
}

/** Legacy score-based milestone check — kept for non-level gameplay fallback */
function checkScoreMilestones(state: GameSnapshot, events: PhysicsEvents): boolean {
  if (state.dimsumTotal > 0) return false; // Skip score milestones in level mode
  if (state.score >= GAME_CONFIG.finalGoal) {
    state.minions.length = 0;
    state.bullets.length = 0;
    state.particles.length = 0;
    state.state = 'birthday';
    events.onBirthday();
    return true;
  }
  if (
    state.milestoneIndex < GAME_CONFIG.wishMilestones.length &&
    state.score >= GAME_CONFIG.wishMilestones[state.milestoneIndex]
  ) {
    const reached = GAME_CONFIG.wishMilestones[state.milestoneIndex];
    state.milestoneIndex++;
    state.state = 'milestoneDialogue';
    playSoundEffect(state.audio['milestone_sound']);
    events.onMilestone(reached);
    return true;
  }
  return false;
}

export function updatePhysics(
  state: GameSnapshot, time: number, dt: number,
  viewportWidth: number, viewportHeight: number, events: PhysicsEvents,
): void {
  const mw = GAME_CONFIG.mapWidth;
  const mh = GAME_CONFIG.mapHeight;

  // ── Spawn level dimsum on first frame ─────────────────────────────
  if (state.dimsumTotal > 0 && state.lastDimsumSpawn === 0) {
    state.lastDimsumSpawn = time;
    const dimsumPickups = spawnLevelDimsum(mw, mh, state.dimsumTotal, state.player.x, state.player.y);
    state.pickups.push(...dimsumPickups);
  }

  if (state.shake.duration > 0) {
    state.shake.duration -= dt;
    const t = state.shake.intensity * Math.min(1, state.shake.duration * 4);
    state.shake.offsetX = (Math.random() - 0.5) * t * 2;
    state.shake.offsetY = (Math.random() - 0.5) * t * 2;
    if (state.shake.duration <= 0) {
      state.shake.intensity = 0;
      state.shake.offsetX = 0;
      state.shake.offsetY = 0;
    }
  }

  const hasSpeedBoost = state.powerUps.some((p) => p.type === 'speed_boost');
  state.speedMultiplier = hasSpeedBoost ? GAME_CONFIG.speedBoostMultiplier : 1;
  state.shieldActive = state.powerUps.some((p) => p.type === 'shield');

  let dx = 0, dy = 0;
  if (state.joysticks.left.active) {
    dx = state.joysticks.left.dx;
    dy = state.joysticks.left.dy;
  } else {
    if (state.keys['w'] || state.keys['arrowup']) dy -= 1;
    if (state.keys['s'] || state.keys['arrowdown']) dy += 1;
    if (state.keys['a'] || state.keys['arrowleft']) dx -= 1;
    if (state.keys['d'] || state.keys['arrowright']) dx += 1;
  }
  const len = Math.hypot(dx, dy);
  if (len > 0) { dx /= len; dy /= len; }

  const playerSpeed = GAME_CONFIG.trooperSpeed * state.speedMultiplier;
  state.player.x += dx * playerSpeed * dt;
  state.player.y += dy * playerSpeed * dt;
  state.player.x = clamp(state.player.x, state.player.radius, mw - state.player.radius);
  state.player.y = clamp(state.player.y, state.player.radius, mh - state.player.radius);

  const targetCamX = clamp(state.player.x - viewportWidth / 2, 0, Math.max(0, mw - viewportWidth));
  const targetCamY = clamp(state.player.y - viewportHeight / 2, 0, Math.max(0, mh - viewportHeight));
  const camSmooth = 1 - Math.pow(0.001, dt);
  state.camera.x += (targetCamX - state.camera.x) * camSmooth;
  state.camera.y += (targetCamY - state.camera.y) * camSmooth;

  const worldMouseX = state.mouse.x + state.camera.x;
  const worldMouseY = state.mouse.y + state.camera.y;
  state.player.angle = Math.atan2(worldMouseY - state.player.y, worldMouseX - state.player.x);

  let fireRate: number = GAME_CONFIG.fireRate;
  if (state.weapon === 'shotgun') fireRate = GAME_CONFIG.shotgunFireRate;
  else if (state.weapon === 'rapid') fireRate = GAME_CONFIG.rapidFireRate;

  if (state.mouse.down && time - state.lastShot > 1000 / fireRate) {
    state.lastShot = time;
    const hasDouble = state.powerUps.some((p) => p.type === 'double_bullets');
    state.bullets.push(...createBullets(state.player, state.weapon, hasDouble, time));
    const muzzleX = state.player.x + Math.cos(state.player.angle) * state.player.radius;
    const muzzleY = state.player.y + Math.sin(state.player.angle) * state.player.radius;
    state.particles.push(...createMuzzleFlash(muzzleX, muzzleY, state.player.angle));
    if (state.weapon === 'shotgun') triggerShake(state, 4, 0.15);
    playSoundEffect(state.audio['shoot_sound']);
  }

  if (time - state.lastSpawn > GAME_CONFIG.spawnRate * 1000 && state.minions.length < GAME_CONFIG.maxMinionsOnScreen) {
    state.lastSpawn = time;
    state.minions.push(createMinion(state.player.x, state.player.y));
  }

  const expectedBosses = Math.floor(state.score / GAME_CONFIG.bossSpawnScoreInterval);
  if (expectedBosses > state.bossesKilled + state.minions.filter(m => isBoss(m.type)).length) {
    state.minions.push(createBoss(state.player.x, state.player.y));
    triggerShake(state, 8, 0.3);
  }

  if (time - state.lastPickupSpawn > GAME_CONFIG.pickupSpawnRate * 1000) {
    state.lastPickupSpawn = time;
    if (state.pickups.length < 6) state.pickups.push(createRandomPickup(state.player.x, state.player.y));
  }

  if (time - state.lastObstacleSpawn > GAME_CONFIG.obstacleSpawnRate * 1000) {
    state.lastObstacleSpawn = time;
    if (state.obstacles.length < GAME_CONFIG.maxObstacles) state.obstacles.push(createObstacle(state.player.x, state.player.y));
  }

  for (let i = state.powerUps.length - 1; i >= 0; i--) {
    state.powerUps[i].remaining -= dt;
    if (state.powerUps[i].remaining <= 0) state.powerUps.splice(i, 1);
  }

  for (let i = state.pickups.length - 1; i >= 0; i--) {
    state.pickups[i].life -= dt;
    // Update chest timers
    const p = state.pickups[i];
    if (p.chestState === 'ajar' && p.chestTimer !== undefined) {
      p.chestTimer -= dt;
      if (p.chestTimer <= 0) p.chestState = 'open';
    }
    if (p.life <= 0) state.pickups.splice(i, 1);
  }

  for (let i = state.bullets.length - 1; i >= 0; i--) {
    const b = state.bullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (b.spawnTime) b.animFrame = Math.floor(((time - b.spawnTime) / 100) % 8);
    if (b.x < -50 || b.x > mw + 50 || b.y < -50 || b.y > mh + 50) state.bullets.splice(i, 1);
  }

  for (const turret of state.turrets) {
    const distToPlayer = Math.hypot(state.player.x - turret.x, state.player.y - turret.y);
    if (distToPlayer < turret.range && time - turret.lastShot > 1000 / turret.fireRate) {
      turret.lastShot = time;
      state.bullets.push(createTurretBullet(turret, state.player.x, state.player.y, time));
    }
  }

  for (let t = state.turrets.length - 1; t >= 0; t--) {
    const turret = state.turrets[t];
    for (let j = state.bullets.length - 1; j >= 0; j--) {
      const b = state.bullets[j];
      if (b.fromTurret || b.fromBoss) continue;
      if (Math.hypot(b.x - turret.x, b.y - turret.y) < b.radius + turret.radius) {
        turret.health -= b.damage;
        state.bullets.splice(j, 1);
        state.particles.push(...createImpactSparks(b.x, b.y, 4, '#ff6b35'));
        if (turret.health <= 0) {
          state.score += turret.scoreValue;
          events.onScoreChange(state.score);
          state.particles.push(...createExplosion(turret.x, turret.y));
          state.particles.push(...createScoreBubble(turret.x, turret.y, `+${turret.scoreValue}`));
          triggerShake(state, 10, 0.3);
          state.pickups.push(createPickup(turret.x, turret.y));
          state.turrets.splice(t, 1);
          playSoundEffect(state.audio['minion_hit_sound']);
          if (checkScoreMilestones(state, events)) return;
        }
        break;
      }
    }
  }

  // Obstacle-bullet collision
  for (let o = state.obstacles.length - 1; o >= 0; o--) {
    const obs = state.obstacles[o];
    if (!obs.destructible) continue;
    for (let j = state.bullets.length - 1; j >= 0; j--) {
      const b = state.bullets[j];
      if (b.fromTurret || b.fromBoss) continue;
      if (Math.hypot(b.x - obs.x, b.y - obs.y) < b.radius + obs.radius) {
        state.bullets.splice(j, 1);
        if (obs.health !== undefined) obs.health -= b.damage;
        if ((obs.health ?? 0) <= 0 || obs.type === 'bomb') {
          if (obs.type === 'bomb' && !obs.triggered) {
            obs.triggered = true;
            state.particles.push(...createBombExplosion(obs.x, obs.y));
            triggerShake(state, 12, 0.3);
            for (const m of state.minions) {
              if (Math.hypot(m.x - obs.x, m.y - obs.y) < GAME_CONFIG.bombExplosionRadius) m.health -= GAME_CONFIG.bombDamage;
            }
            const pd = Math.hypot(state.player.x - obs.x, state.player.y - obs.y);
            if (pd < GAME_CONFIG.bombExplosionRadius) {
              const died = applyPlayerDamage(state, Math.floor(GAME_CONFIG.bombDamage * 0.5), time, events);
              if (died && handlePlayerDeath(state, time, events)) return;
            }
          } else {
            state.particles.push(...createExplosion(obs.x, obs.y));
          }
          state.obstacles.splice(o, 1);
        } else {
          state.particles.push(...createImpactSparks(b.x, b.y, 3, '#8b7355'));
        }
        break;
      }
    }
  }

  // Obstacle-player collision
  for (let o = state.obstacles.length - 1; o >= 0; o--) {
    const obs = state.obstacles[o];
    const dist = Math.hypot(state.player.x - obs.x, state.player.y - obs.y);
    if (dist < state.player.radius + obs.radius) {
      if (obs.type === 'bomb' && !obs.triggered) {
        obs.triggered = true;
        state.particles.push(...createBombExplosion(obs.x, obs.y));
        triggerShake(state, 12, 0.3);
        const died = applyPlayerDamage(state, obs.damage, time, events);
        if (died && handlePlayerDeath(state, time, events)) return;
        state.obstacles.splice(o, 1);
      } else if (obs.type === 'barrel') {
        if (time - state.lastDamage > 500) {
          const died = applyPlayerDamage(state, obs.damage, time, events);
          triggerShake(state, 4, 0.1);
          if (died && handlePlayerDeath(state, time, events)) return;
        }
        const pushAngle = Math.atan2(state.player.y - obs.y, state.player.x - obs.x);
        state.player.x = obs.x + Math.cos(pushAngle) * (state.player.radius + obs.radius + 5);
        state.player.y = obs.y + Math.sin(pushAngle) * (state.player.radius + obs.radius + 5);
      } else if (obs.type === 'stone') {
        const pushAngle = Math.atan2(state.player.y - obs.y, state.player.x - obs.x);
        state.player.x = obs.x + Math.cos(pushAngle) * (state.player.radius + obs.radius + 2);
        state.player.y = obs.y + Math.sin(pushAngle) * (state.player.radius + obs.radius + 2);
      }
    }
  }

  // Turret/boss bullets hitting player
  for (let i = state.bullets.length - 1; i >= 0; i--) {
    const b = state.bullets[i];
    if (!b.fromTurret && !b.fromBoss) continue;
    if (Math.hypot(b.x - state.player.x, b.y - state.player.y) < b.radius + state.player.radius) {
      state.bullets.splice(i, 1);
      state.particles.push(...createImpactSparks(b.x, b.y, 5, '#ef4444'));
      triggerShake(state, 6, 0.2);
      if (time - state.lastDamage > 300) {
        const died = applyPlayerDamage(state, b.damage, time, events);
        if (died && handlePlayerDeath(state, time, events)) return;
      }
    }
  }

   // Pickup collection
  for (let i = state.pickups.length - 1; i >= 0; i--) {
    const p = state.pickups[i];
    if (Math.hypot(p.x - state.player.x, p.y - state.player.y) < p.radius + state.player.radius + 10) {
      // ── Dimsum collection ─────────────────────────────────────────
      if (p.type === 'dimsum') {
        state.pickups.splice(i, 1);
        state.dimsumCollected++;
        state.score += 50; // Bonus score per dimsum
        events.onScoreChange(state.score);
        events.onDimsumCollected(state.dimsumCollected, state.dimsumTotal);
        state.particles.push(...createPickupSparkle(p.x, p.y, '#fbbf24'));
        state.particles.push(...createScoreBubble(p.x, p.y, `🥟 ${state.dimsumCollected}/${state.dimsumTotal}`));
        triggerShake(state, 3, 0.1);
        playSoundEffect(state.audio['pickup_sound']);
        if (checkDimsumCompletion(state, events)) return;
        continue;
      }

      // Mystery box
      if (p.type === 'mystery_box') {
        if (p.chestState === 'closed') { p.chestState = 'ajar'; p.chestTimer = GAME_CONFIG.mysteryBoxOpenTime; continue; }
        if (p.chestState === 'ajar') continue;
        if (p.chestState === 'open') {
          state.pickups.splice(i, 1);
          state.particles.push(...createChestOpenEffect(p.x, p.y));
          triggerShake(state, 5, 0.2);
          const rewards = GAME_CONFIG.mysteryBoxRewards;
          const reward = rewards[Math.floor(Math.random() * rewards.length)];
          switch (reward) {
            case 'heart':
              state.health = Math.min(state.health + GAME_CONFIG.heartHealAmount, GAME_CONFIG.playerMaxHealth);
              events.onHealthChange(state.health);
              state.particles.push(...createScoreBubble(p.x, p.y, '❤️ +HP'));
              break;
            case 'weapon_shotgun':
              state.weapon = 'shotgun';
              setTimeout(() => { if (state.weapon === 'shotgun') state.weapon = 'default'; }, GAME_CONFIG.weaponDuration * 1000);
              state.particles.push(...createScoreBubble(p.x, p.y, '🔥 Shotgun!'));
              break;
            case 'weapon_rapid':
              state.weapon = 'rapid';
              setTimeout(() => { if (state.weapon === 'rapid') state.weapon = 'default'; }, GAME_CONFIG.weaponDuration * 1000);
              state.particles.push(...createScoreBubble(p.x, p.y, '💧 Rapid!'));
              break;
            case 'powerup_double': {
              const ex = state.powerUps.find(pu => pu.type === 'double_bullets');
              if (ex) ex.remaining = GAME_CONFIG.doubleBulletDuration;
              else state.powerUps.push({ type: 'double_bullets', remaining: GAME_CONFIG.doubleBulletDuration });
              state.particles.push(...createScoreBubble(p.x, p.y, '✨ Double!'));
              break;
            }
            case 'shield': {
              const ex = state.powerUps.find(pu => pu.type === 'shield');
              if (ex) ex.remaining = GAME_CONFIG.shieldDuration;
              else state.powerUps.push({ type: 'shield', remaining: GAME_CONFIG.shieldDuration });
              state.particles.push(...createShieldEffect(state.player.x, state.player.y));
              state.particles.push(...createScoreBubble(p.x, p.y, '🛡️ Shield!'));
              break;
            }
            case 'speed_boost': {
              const ex = state.powerUps.find(pu => pu.type === 'speed_boost');
              if (ex) ex.remaining = GAME_CONFIG.speedBoostDuration;
              else state.powerUps.push({ type: 'speed_boost', remaining: GAME_CONFIG.speedBoostDuration });
              state.particles.push(...createScoreBubble(p.x, p.y, '⚡ Speed!'));
              break;
            }
            case 'coin':
              state.score += GAME_CONFIG.coinPickupScore * 2;
              events.onScoreChange(state.score);
              state.particles.push(...createScoreBubble(p.x, p.y, `+${GAME_CONFIG.coinPickupScore * 2}`));
              if (checkScoreMilestones(state, events)) return;
              break;
            case 'energy_pack':
              state.health = Math.min(state.health + GAME_CONFIG.energyPackHeal, GAME_CONFIG.playerMaxHealth);
              state.score += GAME_CONFIG.energyPackScoreBonus;
              events.onHealthChange(state.health);
              events.onScoreChange(state.score);
              state.particles.push(...createEnergyCollectEffect(p.x, p.y, 25));
              state.particles.push(...createScoreBubble(p.x, p.y, `⚡ +${GAME_CONFIG.energyPackScoreBonus}`));
              if (checkScoreMilestones(state, events)) return;
              break;
          }
          continue;
        }
        continue;
      }

      state.pickups.splice(i, 1);
      const sparkleColors: Record<string, string> = {
        heart: '#ef4444', weapon_shotgun: '#f97316', weapon_rapid: '#3b82f6',
        powerup_double: '#a855f7', shield: '#22d3ee', speed_boost: '#22c55e',
        coin: '#fbbf24', energy_pack: '#22d3ee',
      };
      state.particles.push(...createPickupSparkle(p.x, p.y, sparkleColors[p.type] || '#fbbf24'));
      const scoreTexts: Record<string, string> = {
        heart: '❤️ +HP', weapon_shotgun: '🔥 Shotgun!', weapon_rapid: '💧 Rapid!',
        powerup_double: '✨ Double!', shield: '🛡️ Shield!', speed_boost: '⚡ Speed!',
        coin: `+${GAME_CONFIG.coinPickupScore}`, energy_pack: '⚡ Energy!',
      };
      state.particles.push(...createScoreBubble(p.x, p.y, scoreTexts[p.type] || '+?'));

      switch (p.type) {
        case 'heart':
          state.health = Math.min(state.health + GAME_CONFIG.heartHealAmount, GAME_CONFIG.playerMaxHealth);
          events.onHealthChange(state.health);
          break;
        case 'weapon_shotgun':
          state.weapon = 'shotgun';
          setTimeout(() => { if (state.weapon === 'shotgun') state.weapon = 'default'; }, GAME_CONFIG.weaponDuration * 1000);
          break;
        case 'weapon_rapid':
          state.weapon = 'rapid';
          setTimeout(() => { if (state.weapon === 'rapid') state.weapon = 'default'; }, GAME_CONFIG.weaponDuration * 1000);
          break;
        case 'powerup_double': {
          const ex = state.powerUps.find(pu => pu.type === 'double_bullets');
          if (ex) ex.remaining = GAME_CONFIG.doubleBulletDuration;
          else state.powerUps.push({ type: 'double_bullets', remaining: GAME_CONFIG.doubleBulletDuration });
          break;
        }
        case 'shield': {
          const ex = state.powerUps.find(pu => pu.type === 'shield');
          if (ex) ex.remaining = GAME_CONFIG.shieldDuration;
          else state.powerUps.push({ type: 'shield', remaining: GAME_CONFIG.shieldDuration });
          state.particles.push(...createShieldEffect(state.player.x, state.player.y));
          break;
        }
        case 'speed_boost': {
          const ex = state.powerUps.find(pu => pu.type === 'speed_boost');
          if (ex) ex.remaining = GAME_CONFIG.speedBoostDuration;
          else state.powerUps.push({ type: 'speed_boost', remaining: GAME_CONFIG.speedBoostDuration });
          break;
        }
        case 'coin':
          state.score += GAME_CONFIG.coinPickupScore;
          events.onScoreChange(state.score);
          if (checkScoreMilestones(state, events)) return;
          break;
        case 'energy_pack':
          state.health = Math.min(state.health + GAME_CONFIG.energyPackHeal, GAME_CONFIG.playerMaxHealth);
          state.score += GAME_CONFIG.energyPackScoreBonus;
          events.onHealthChange(state.health);
          events.onScoreChange(state.score);
          state.particles.push(...createEnergyCollectEffect(p.x, p.y, p.energyVariant ?? 10));
          if (checkScoreMilestones(state, events)) return;
          break;
      }
    }
  }

  // Minion movement + collision
  for (let i = state.minions.length - 1; i >= 0; i--) {
    const m = state.minions[i];
    const mdx = state.player.x - m.x;
    const mdy = state.player.y - m.y;
    const dist = Math.hypot(mdx, mdy);
    m.facingRight = mdx > 0;

    if (isBoss(m.type)) {
      m.animFrame = ((m.animFrame ?? 0) + dt * 8) % 10;
      if (m.hurtTimer && m.hurtTimer > 0) { m.hurtTimer -= dt; if (m.hurtTimer <= 0) m.bossState = 'idle'; }
      const attackRange = m.type === 'boss_viking' ? 350 : m.type === 'boss_goblin' ? 300 : 250;
      const attackRate = m.type === 'boss_viking' ? GAME_CONFIG.bossVikingFireRate : m.type === 'boss_goblin' ? 2.5 : 3;
      if (dist < attackRange) {
        if (!m.lastAttack || time - m.lastAttack > attackRate * 1000) {
          m.lastAttack = time;
          m.bossState = 'attacking';
          state.bullets.push(createBossBullet(m.x, m.y, state.player.x, state.player.y, m.type, time));
          m.chargeTimer = 0.5;
        }
      }
      if (m.chargeTimer && m.chargeTimer > 0) {
        m.chargeTimer -= dt;
        if (m.chargeTimer <= 0 && m.bossState === 'attacking') m.bossState = 'idle';
      }
      if (!m.chargeTimer || m.chargeTimer <= 0) {
        if (dist > 0) { m.x += (mdx / dist) * m.speed * dt; m.y += (mdy / dist) * m.speed * dt; m.angle = Math.atan2(mdy, mdx); }
      }
    } else {
      if (dist > 0) { m.x += (mdx / dist) * m.speed * dt; m.y += (mdy / dist) * m.speed * dt; m.angle = Math.atan2(mdy, mdx); }
    }

    m.x = clamp(m.x, m.radius, mw - m.radius);
    m.y = clamp(m.y, m.radius, mh - m.radius);

    if (dist < state.player.radius + m.radius) {
      if (time - state.lastDamage > 500) {
        const died = applyPlayerDamage(state, m.damage, time, events);
        triggerShake(state, isBoss(m.type) ? 10 : 5, isBoss(m.type) ? 0.3 : 0.15);
        if (died && handlePlayerDeath(state, time, events)) return;
      }
      const pushAngle = Math.atan2(m.y - state.player.y, m.x - state.player.x);
      m.x = state.player.x + Math.cos(pushAngle) * (state.player.radius + m.radius + 5);
      m.y = state.player.y + Math.sin(pushAngle) * (state.player.radius + m.radius + 5);
    }

    for (let j = state.bullets.length - 1; j >= 0; j--) {
      const b = state.bullets[j];
      if (b.fromTurret || b.fromBoss) continue;
      if (Math.hypot(b.x - m.x, b.y - m.y) < b.radius + m.radius) {
        m.health -= b.damage;
        state.bullets.splice(j, 1);
        const sparkColor = isBoss(m.type) ? '#a855f7' : m.type === 'elite' ? '#dc2626' : '#4ade80';
        state.particles.push(...createImpactSparks(b.x, b.y, 3, sparkColor));
        if (isBoss(m.type) && m.health > 0) { m.bossState = 'hurt'; m.hurtTimer = 0.3; }
        if (m.health <= 0) {
          state.score += m.scoreValue;
          events.onScoreChange(state.score);
          state.minions.splice(i, 1);
          playSoundEffect(state.audio['minion_hit_sound']);
          state.particles.push(...createScoreBubble(m.x, m.y, `+${m.scoreValue}`));
          if (isBoss(m.type)) {
            state.particles.push(...createBossDeathParticles(m.x, m.y));
            triggerShake(state, 15, 0.5);
            state.bossesKilled++;
            for (let d = 0; d < 3; d++) {
              const dropAngle = (d / 3) * Math.PI * 2;
              state.pickups.push(createPickup(m.x + Math.cos(dropAngle) * 40, m.y + Math.sin(dropAngle) * 40));
            }
          } else {
            state.particles.push(...createDeathParticles(m.x, m.y, 8, m.type === 'elite' ? '#dc2626' : '#4ade80'));
          }
          if (checkScoreMilestones(state, events)) return;
        }
        break;
      }
    }
  }

  // Particle decay — use swap-and-pop instead of splice for perf
  const MAX_PARTICLES = 120;
  let pi = 0;
  while (pi < state.particles.length) {
    const p = state.particles[pi];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt * 2;
    if (p.size !== undefined && p.sizeDecay !== undefined) { p.size -= p.sizeDecay * dt; if (p.size < 0) p.size = 0; }
    if (p.rotation !== undefined && p.rotationSpeed !== undefined) p.rotation += p.rotationSpeed * dt;
    if (p.isScoreBubble) p.vx *= 0.98;
    if (p.life <= 0) {
      // Swap with last element and pop (O(1) instead of O(n) splice)
      state.particles[pi] = state.particles[state.particles.length - 1];
      state.particles.pop();
    } else {
      pi++;
    }
  }
  // Hard cap particles to prevent accumulation
  if (state.particles.length > MAX_PARTICLES) {
    state.particles.length = MAX_PARTICLES;
  }
}
