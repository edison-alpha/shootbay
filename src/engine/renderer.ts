import type { GameSnapshot } from '../types/game';
import { GAME_CONFIG } from '../constants/config';

// ── Cached DPR to avoid reading every frame ──────────────────────────────
let cachedDpr = 1;
let lastCanvasW = 0;
let lastCanvasH = 0;

export function setupCanvas(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): void {
  cachedDpr = Math.min(window.devicePixelRatio || 1, 2);
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const nextW = Math.floor(vw * cachedDpr);
  const nextH = Math.floor(vh * cachedDpr);
  if (canvas.width !== nextW || canvas.height !== nextH) {
    canvas.width = nextW;
    canvas.height = nextH;
    canvas.style.width = `${vw}px`;
    canvas.style.height = `${vh}px`;
    ctx.setTransform(cachedDpr, 0, 0, cachedDpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'medium'; // 'medium' is faster than 'high'
    lastCanvasW = nextW;
    lastCanvasH = nextH;
  }
}

function drawRotatedImage(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number, angle: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();
}

function drawCenteredImage(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number): void {
  ctx.drawImage(img, x - w / 2, y - h / 2, w, h);
}

function drawFlippedImage(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number, flipX: boolean): void {
  if (!flipX) {
    ctx.drawImage(img, x - w / 2, y - h / 2, w, h);
    return;
  }
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(-1, 1);
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();
}

function drawShadow(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.beginPath();
  ctx.ellipse(x, y + radius * 0.7, radius * 0.8, radius * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
}

function isImageReady(img?: HTMLImageElement): img is HTMLImageElement {
  return !!img && img.complete && img.naturalWidth > 0;
}

// Pickup rendering config
const PICKUP_SPRITE_MAP: Record<string, { imgKey: string; fallbackEmoji: string; color: string; glowColor: string }> = {
  heart:          { imgKey: 'pickup_heart',        fallbackEmoji: '❤️',  color: '#ef4444', glowColor: 'rgba(239, 68, 68, 0.4)' },
  weapon_shotgun: { imgKey: 'pickup_bomb',         fallbackEmoji: '💣',  color: '#f97316', glowColor: 'rgba(249, 115, 22, 0.4)' },
  weapon_rapid:   { imgKey: 'pickup_acceleration', fallbackEmoji: '⚡',  color: '#3b82f6', glowColor: 'rgba(59, 130, 246, 0.4)' },
  powerup_double: { imgKey: 'pickup_pearl',        fallbackEmoji: '✨',  color: '#a855f7', glowColor: 'rgba(168, 85, 247, 0.4)' },
  shield:         { imgKey: 'pickup_shield',       fallbackEmoji: '🛡️',  color: '#22d3ee', glowColor: 'rgba(34, 211, 238, 0.4)' },
  speed_boost:    { imgKey: 'pickup_acceleration', fallbackEmoji: '🏃',  color: '#22c55e', glowColor: 'rgba(34, 197, 94, 0.4)' },
  coin:           { imgKey: 'pickup_coin',         fallbackEmoji: '🪙',  color: '#fbbf24', glowColor: 'rgba(251, 191, 36, 0.4)' },
  energy_pack:    { imgKey: 'energy_10',           fallbackEmoji: '⚡',  color: '#22d3ee', glowColor: 'rgba(34, 211, 238, 0.4)' },
  dimsum:         { imgKey: 'pickup_dimsum',       fallbackEmoji: '🥟',  color: '#fbbf24', glowColor: 'rgba(251, 191, 36, 0.5)' },
};

// Boss animation frame keys
const BOSS_ANIM_MAP: Record<string, { idle: string[]; attack: string[]; hurt: string; walk: string[] }> = {
  boss_viking: {
    idle: ['boss_viking_idle', 'boss_viking_idle_1', 'boss_viking_idle_2'],
    attack: ['boss_viking_attack', 'boss_viking_attack_1', 'boss_viking_attack_2'],
    hurt: 'boss_viking_hurt',
    walk: ['boss_viking_walk', 'boss_viking_walk_1', 'boss_viking_run'],
  },
  boss_goblin: {
    idle: ['boss_goblin_idle', 'boss_goblin_idle_1', 'boss_goblin_idle_2'],
    attack: ['boss_goblin_attack', 'boss_goblin_attack_1', 'boss_goblin_attack_2'],
    hurt: 'boss_goblin_hurt',
    walk: ['boss_goblin_walk', 'boss_goblin_run'],
  },
  boss_caveman: {
    idle: ['boss_caveman_idle', 'boss_caveman_idle_1', 'boss_caveman_idle_2'],
    attack: ['boss_caveman_attack', 'boss_caveman_attack_1', 'boss_caveman_attack_2'],
    hurt: 'boss_caveman_hurt',
    walk: ['boss_caveman_walk', 'boss_caveman_run'],
  },
};

// Animated bullet sprite maps
const BULLET_SPRITE_MAP: Record<string, string[]> = {
  fire: ['fire_ball_1', 'fire_ball_2', 'fire_ball_3', 'fire_ball_4', 'fire_ball_5', 'fire_ball_6', 'fire_ball_7', 'fire_ball_8'],
  water: ['water_ball_1', 'water_ball_2', 'water_ball_3', 'water_ball_4', 'water_ball_5', 'water_ball_6'],
  fire_arrow: ['fire_arrow_1', 'fire_arrow_2', 'fire_arrow_3', 'fire_arrow_4'],
  water_arrow: ['water_arrow_1', 'water_arrow_2', 'water_arrow_3', 'water_arrow_4'],
  fire_spell: ['fire_spell_1', 'fire_spell_4'],
  water_spell: ['water_spell_1', 'water_spell_4'],
  boss_fire: ['fire_ball_4', 'fire_ball_5', 'fire_ball_6', 'fire_ball_7'],
};

export function renderFrame(ctx: CanvasRenderingContext2D, state: GameSnapshot, time: number, vw: number, vh: number): void {
  ctx.clearRect(0, 0, vw, vh);
  if (state.state !== 'playing') return;

  const cam = state.camera;
  const shakeX = state.shake.offsetX || 0;
  const shakeY = state.shake.offsetY || 0;

  ctx.save();
  ctx.translate(shakeX, shakeY);

  // ── Background ─────────────────────────────────────────────────────
  const bg = state.images.arena_background;
  if (bg?.complete) {
    const tileW = bg.width;
    const tileH = bg.height;
    const startX = Math.floor(cam.x / tileW) * tileW;
    const startY = Math.floor(cam.y / tileH) * tileH;
    for (let tx = startX; tx < cam.x + vw; tx += tileW) {
      for (let ty = startY; ty < cam.y + vh; ty += tileH) {
        ctx.drawImage(bg, tx - cam.x, ty - cam.y, tileW, tileH);
      }
    }
  } else {
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, vw, vh);
  }

  // ── Grid (simplified — fewer lines, no per-line beginPath) ─────────
  ctx.strokeStyle = 'rgba(100, 120, 200, 0.06)';
  ctx.lineWidth = 1;
  const gridSize = 200;
  const gridStartX = Math.floor(cam.x / gridSize) * gridSize;
  const gridStartY = Math.floor(cam.y / gridSize) * gridSize;
  ctx.beginPath();
  for (let gx = gridStartX; gx < cam.x + vw; gx += gridSize) {
    const sx = gx - cam.x;
    ctx.moveTo(sx, 0);
    ctx.lineTo(sx, vh);
  }
  for (let gy = gridStartY; gy < cam.y + vh; gy += gridSize) {
    const sy = gy - cam.y;
    ctx.moveTo(0, sy);
    ctx.lineTo(vw, sy);
  }
  ctx.stroke();

  // ── Map decorations ────────────────────────────────────────────────
  renderMapDecorations(ctx, state, cam.x, cam.y, vw, vh);

  // ── Map boundary (simplified — no shadowBlur) ──────────────────────
  ctx.strokeStyle = 'rgba(255, 50, 50, 0.4)';
  ctx.lineWidth = 3;
  ctx.strokeRect(-cam.x, -cam.y, GAME_CONFIG.mapWidth, GAME_CONFIG.mapHeight);

  // ── Obstacles ──────────────────────────────────────────────────────
  const obstacles = state.obstacles;
  for (let oi = 0; oi < obstacles.length; oi++) {
    const obs = obstacles[oi];
    const sx = obs.x - cam.x;
    const sy = obs.y - cam.y;
    if (sx < -60 || sx > vw + 60 || sy < -60 || sy > vh + 60) continue;

    const obsImg = state.images[obs.spriteKey];
    if (isImageReady(obsImg)) {
      const size = obs.radius * 2.2;
      drawCenteredImage(ctx, obsImg, sx, sy, size, size);
    } else {
      const colors: Record<string, string> = { bomb: '#ff4444', barrel: '#8b6f47', stone: '#6b7280', net: '#4b5563', seaweed: '#22c55e' };
      ctx.fillStyle = colors[obs.type] || '#666';
      ctx.beginPath();
      ctx.arc(sx, sy, obs.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ── Turrets (simplified — removed shadows, gradients, setLineDash) ─
  const turrets = state.turrets;
  for (let ti = 0; ti < turrets.length; ti++) {
    const t = turrets[ti];
    const sx = t.x - cam.x;
    const sy = t.y - cam.y;
    if (sx < -80 || sx > vw + 80 || sy < -80 || sy > vh + 80) continue;

    drawShadow(ctx, sx, sy, t.radius);

    // Simplified turret body — flat colors instead of gradients
    ctx.fillStyle = 'rgba(60, 30, 15, 0.5)';
    ctx.beginPath();
    ctx.arc(sx, sy, t.radius + 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#c9500a';
    ctx.beginPath();
    ctx.arc(sx, sy, t.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 200, 100, 0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Core
    ctx.fillStyle = '#ff6644';
    ctx.beginPath();
    ctx.arc(sx, sy, t.radius * 0.35, 0, Math.PI * 2);
    ctx.fill();

    // Barrel
    const barrelAngle = Math.atan2(state.player.y - t.y, state.player.x - t.x);
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(barrelAngle);
    ctx.fillStyle = '#555';
    ctx.fillRect(t.radius * 0.2, -3, t.radius * 1.1, 6);
    ctx.fillStyle = '#ffaa44';
    ctx.fillRect(t.radius * 1.2, -2, 4, 4);
    ctx.restore();

    // Health bar
    const ratio = Math.max(0, t.health / t.maxHealth);
    const barW = t.radius * 2.4;
    const barH = 5;
    const barX = sx - barW / 2;
    const barY = sy - t.radius - 16;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
    if (ratio > 0) {
      ctx.fillStyle = ratio > 0.5 ? '#22c55e' : ratio > 0.25 ? '#eab308' : '#ef4444';
      ctx.fillRect(barX, barY, barW * ratio, barH);
    }
  }

  // ── Pickups (simplified glow — no shadowBlur) ──────────────────────
  const pickups = state.pickups;
  for (let pi = 0; pi < pickups.length; pi++) {
    const p = pickups[pi];
    const sx = p.x - cam.x;
    const sy = p.y - cam.y;
    if (sx < -40 || sx > vw + 40 || sy < -40 || sy > vh + 40) continue;

    const floatPhase = p.floatOffset ?? 0;
    const floatY = sy + Math.sin(time / 400 + floatPhase) * 4;

    // Mystery box
    if (p.type === 'mystery_box') {
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = 'rgba(251, 191, 36, 0.3)';
      ctx.beginPath();
      ctx.arc(sx, floatY, p.radius + 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      const chestKey = p.chestState === 'open' ? 'chest_open' : p.chestState === 'ajar' ? 'chest_ajar' : 'chest_closed';
      const chestImg = state.images[chestKey];
      const chestSize = p.radius * 2.6;

      if (isImageReady(chestImg)) {
        drawCenteredImage(ctx, chestImg, sx, floatY, chestSize, chestSize);
      } else {
        ctx.fillStyle = '#8B6914';
        ctx.fillRect(sx - 15, floatY - 12, 30, 24);
        ctx.fillStyle = '#DAA520';
        ctx.fillRect(sx - 4, floatY - 4, 8, 8);
      }

      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fbbf24';
      ctx.fillText(p.chestState === 'open' ? '✨ OPEN!' : '🎁 Mystery', sx, floatY - p.radius - 8);
      continue;
    }

    // Energy pack
    if (p.type === 'energy_pack') {
      const bobScale = 1 + Math.sin(time / 300 + floatPhase) * 0.08;
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = 'rgba(34, 211, 238, 0.3)';
      ctx.beginPath();
      ctx.arc(sx, floatY, p.radius + 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      const energyKey = `energy_${p.energyVariant ?? 10}`;
      const energyImg = state.images[energyKey];
      if (isImageReady(energyImg)) {
        const imgSize = p.radius * 2.6 * bobScale;
        drawCenteredImage(ctx, energyImg, sx, floatY, imgSize, imgSize);
      } else {
        ctx.fillStyle = '#22d3ee';
        ctx.beginPath();
        ctx.arc(sx, floatY, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      continue;
    }

    // Standard pickups
    const config = PICKUP_SPRITE_MAP[p.type] || { imgKey: '', fallbackEmoji: '?', color: '#fff', glowColor: 'rgba(255,255,255,0.4)' };
    const bobScale = 1 + Math.sin(time / 300 + floatPhase) * 0.05;

    // Simple glow circle (no shadowBlur)
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = config.glowColor;
    ctx.beginPath();
    ctx.arc(sx, floatY, p.radius + 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    const spriteImg = state.images[config.imgKey];
    if (isImageReady(spriteImg)) {
      const imgSize = p.radius * 2.4 * bobScale;
      drawCenteredImage(ctx, spriteImg, sx, floatY, imgSize, imgSize);
    } else {
      ctx.fillStyle = config.color;
      ctx.beginPath();
      ctx.arc(sx, floatY, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  // ── Minions ────────────────────────────────────────────────────────
  const minions = state.minions;
  for (let mi = 0; mi < minions.length; mi++) {
    const m = minions[mi];
    const sx = m.x - cam.x;
    const sy = m.y - cam.y;
    const cullMargin = m.type.startsWith('boss_') ? 120 : 60;
    if (sx < -cullMargin || sx > vw + cullMargin || sy < -cullMargin || sy > vh + cullMargin) continue;

    drawShadow(ctx, sx, sy, m.radius);

    if (m.type.startsWith('boss_')) {
      renderBoss(ctx, state, m, sx, sy, time);
      continue;
    }

    if (m.type === 'elite') {
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(m.angle);
      const eliteImg = state.images['goblin_bay_local'];
      if (isImageReady(eliteImg)) {
        ctx.drawImage(eliteImg, -45, -45, 90, 90);
      } else {
        ctx.fillStyle = '#7f1d1d';
        ctx.beginPath();
        ctx.arc(0, 0, m.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      // Health bar
      const ratio = Math.max(0, m.health / m.maxHealth);
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(sx - 30, sy - 56, 60, 6);
      ctx.fillStyle = '#e11d48';
      ctx.fillRect(sx - 30, sy - 56, 60 * ratio, 6);
    } else if (isImageReady(state.images.goblin_minion)) {
      drawRotatedImage(ctx, state.images.goblin_minion, sx, sy, 50, 50, m.angle);
    } else {
      ctx.fillStyle = '#166534';
      ctx.beginPath();
      ctx.arc(sx, sy, m.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ── Player ─────────────────────────────────────────────────────────
  const px = state.player.x - cam.x;
  const py = state.player.y - cam.y;
  drawShadow(ctx, px, py, state.player.radius);

  if (state.shieldActive) {
    ctx.save();
    ctx.globalAlpha = 0.3 + Math.sin(time / 200) * 0.1;
    const waterShieldImg = state.images['water_spell_1'];
    if (isImageReady(waterShieldImg)) {
      ctx.globalCompositeOperation = 'lighter';
      const shieldSize = (state.player.radius + 20) * 2;
      drawRotatedImage(ctx, waterShieldImg, px, py, shieldSize, shieldSize, time / 500);
    } else {
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(px, py, state.player.radius + 12, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  if (state.speedMultiplier > 1) {
    ctx.save();
    ctx.fillStyle = '#22c55e';
    for (let tr = 1; tr <= 3; tr++) {
      const trailX = px - Math.cos(state.player.angle) * tr * 12;
      const trailY = py - Math.sin(state.player.angle) * tr * 12;
      ctx.globalAlpha = 0.15 / tr;
      ctx.beginPath();
      ctx.arc(trailX, trailY, state.player.radius * (1 - tr * 0.15), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  if (time - state.lastDamage < 200 && Math.floor(time / 50) % 2 === 0) ctx.globalAlpha = 0.5;

  if (isImageReady(state.images.trooper_character)) {
    drawRotatedImage(ctx, state.images.trooper_character, px, py, 70, 70, state.player.angle);
  } else {
    ctx.fillStyle = '#1d4ed8';
    ctx.beginPath();
    ctx.arc(px, py, state.player.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Player health bar (flat colors)
  const hpPct = Math.max(0, state.health / GAME_CONFIG.playerMaxHealth);
  const hpBarW = 60;
  const hpBarH = 7;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(px - hpBarW / 2 - 1, py + 40 - 1, hpBarW + 2, hpBarH + 2);
  if (hpPct > 0) {
    ctx.fillStyle = hpPct > 0.5 ? '#22c55e' : hpPct > 0.25 ? '#eab308' : '#ef4444';
    ctx.fillRect(px - hpBarW / 2, py + 40, hpBarW * hpPct, hpBarH);
  }

  // ── Bullets (simplified) ───────────────────────────────────────────
  const bullets = state.bullets;
  for (let bi = 0; bi < bullets.length; bi++) {
    const b = bullets[bi];
    const bx = b.x - cam.x;
    const by = b.y - cam.y;
    if (bx < -20 || bx > vw + 20 || by < -20 || by > vh + 20) continue;
    const bulletAngle = Math.atan2(b.vy, b.vx);

    // Sprite-based bullet rendering
    if (b.visualType && BULLET_SPRITE_MAP[b.visualType]) {
      const frames = BULLET_SPRITE_MAP[b.visualType];
      const frameIdx = (b.animFrame ?? 0) % frames.length;
      const spriteImg = state.images[frames[frameIdx]];

      if (isImageReady(spriteImg)) {
        const fSize = b.fromBoss ? 36 : b.fromTurret ? 28 : 24;
        drawRotatedImage(ctx, spriteImg, bx, by, fSize, fSize, bulletAngle);
        continue;
      }
    }

    // Default bullet — flat circle, no gradient/shadow
    ctx.fillStyle = b.fromBoss ? '#c084fc' : b.fromTurret ? '#ff6666' : '#ffcc00';
    ctx.beginPath();
    ctx.arc(bx, by, b.radius + 1, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Particles (capped rendering) ──────────────────────────────────
  const particles = state.particles;
  const maxRenderParticles = 80; // Cap visible particles
  const renderCount = Math.min(particles.length, maxRenderParticles);
  for (let pi = particles.length - renderCount; pi < particles.length; pi++) {
    const p = particles[pi];
    const ppx = p.x - cam.x;
    const ppy = p.y - cam.y;
    if (ppx < -60 || ppx > vw + 60 || ppy < -60 || ppy > vh + 60) continue;
    const size = p.size ?? 3;
    if (size <= 0.5) continue;

    const alpha = Math.max(0, Math.min(1, p.life));
    if (alpha < 0.05) continue;

    ctx.save();
    ctx.globalAlpha = alpha;

    // Score bubble particles
    if (p.isScoreBubble && p.text) {
      const bubbleImg = state.images['bubble_2'];
      if (isImageReady(bubbleImg)) {
        drawCenteredImage(ctx, bubbleImg, ppx, ppy, size, size);
      } else {
        ctx.fillStyle = 'rgba(100, 200, 255, 0.5)';
        ctx.beginPath();
        ctx.arc(ppx, ppy, size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.font = `bold ${p.fontSize ?? 12}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(p.text, ppx, ppy);
      ctx.restore();
      continue;
    }

    // Sprite-based particles
    if (p.spriteKey) {
      const spriteImg = state.images[p.spriteKey];
      if (isImageReady(spriteImg)) {
        if (p.glow) ctx.globalCompositeOperation = 'lighter';
        ctx.translate(ppx, ppy);
        if (p.rotation !== undefined) ctx.rotate(p.rotation);
        ctx.drawImage(spriteImg, -size / 2, -size / 2, size, size);
        ctx.restore();
        continue;
      }
    }

    if (p.glow) {
      ctx.globalCompositeOperation = 'lighter';
    }
    ctx.fillStyle = p.color || '#4ade80';
    ctx.beginPath();
    ctx.arc(ppx, ppy, Math.max(0.5, size), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ── Joystick ───────────────────────────────────────────────────────
  if (state.joysticks.left.active) {
    const jl = state.joysticks.left;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.beginPath();
    ctx.arc(jl.baseX, jl.baseY, 50, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.beginPath();
    ctx.arc(jl.baseX + jl.dx * 50, jl.baseY + jl.dy * 50, 18, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
  renderMinimap(ctx, state, vw, vh);
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER RENDERERS
// ═══════════════════════════════════════════════════════════════════════════

function renderBoss(
  ctx: CanvasRenderingContext2D, state: GameSnapshot,
  m: import('../types/game').Minion, sx: number, sy: number, time: number,
) {
  const bossAnim = BOSS_ANIM_MAP[m.type];
  if (!bossAnim) return;

  const bossState = m.bossState || 'idle';
  const bossSize = m.radius * 2.8;
  const facingRight = m.facingRight !== false;
  const animIdx = Math.floor((m.animFrame ?? 0) % 3);

  let spriteKey: string;
  if (bossState === 'hurt') {
    spriteKey = bossAnim.hurt;
  } else if (bossState === 'attacking') {
    spriteKey = bossAnim.attack[animIdx % bossAnim.attack.length];
  } else {
    const isMoving = Math.hypot(state.player.x - m.x, state.player.y - m.y) > m.radius * 3;
    if (isMoving) {
      spriteKey = bossAnim.walk[animIdx % bossAnim.walk.length];
    } else {
      spriteKey = bossAnim.idle[animIdx % bossAnim.idle.length];
    }
  }

  const bossImg = state.images[spriteKey];

  // Simple aura (no shadowBlur)
  const auraPulse = 0.12 + Math.sin(time / 250) * 0.06;
  const auraColors: Record<string, string> = {
    boss_viking: 'rgba(168, 85, 247, 0.25)',
    boss_goblin: 'rgba(239, 68, 68, 0.25)',
    boss_caveman: 'rgba(251, 191, 36, 0.25)',
  };
  ctx.globalAlpha = auraPulse;
  ctx.fillStyle = auraColors[m.type] || 'rgba(255,255,255,0.15)';
  ctx.beginPath();
  ctx.arc(sx, sy, m.radius + 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  if (isImageReady(bossImg)) {
    if (bossState === 'hurt') {
      ctx.globalAlpha = 0.7 + Math.sin(time / 50) * 0.3;
    }
    const bobY = sy + Math.sin(time / 300) * 3;
    drawFlippedImage(ctx, bossImg, sx, bobY, bossSize, bossSize, !facingRight);
    ctx.globalAlpha = 1;
  } else {
    const colors: Record<string, string> = {
      boss_viking: '#581c87',
      boss_goblin: '#7f1d1d',
      boss_caveman: '#78350f',
    };
    ctx.fillStyle = colors[m.type] || '#444';
    ctx.beginPath();
    ctx.arc(sx, sy, m.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  // Boss health bar (flat)
  const ratio = Math.max(0, m.health / m.maxHealth);
  const barW = m.radius * 2.8;
  const barH = 8;
  const barX = sx - barW / 2;
  const barY = sy - m.radius - 28;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.fillRect(barX - 2, barY - 2, barW + 4, barH + 4);
  if (ratio > 0) {
    const hpColors: Record<string, string> = {
      boss_viking: '#a855f7',
      boss_goblin: '#ef4444',
      boss_caveman: '#f59e0b',
    };
    ctx.fillStyle = hpColors[m.type] || '#a855f7';
    ctx.fillRect(barX, barY, barW * ratio, barH);
  }

  // Boss name
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  const bossNames: Record<string, string> = {
    boss_viking: '⚔️ Viking Leader',
    boss_goblin: '👹 Giant Goblin',
    boss_caveman: '🪨 Caveman Boss',
  };
  ctx.fillText(bossNames[m.type] || 'Boss', sx, barY - 6);
}

function renderMapDecorations(
  ctx: CanvasRenderingContext2D, state: GameSnapshot,
  camX: number, camY: number, vw: number, vh: number,
) {
  const decorKeys = [
    'obstacle_stone_1', 'obstacle_stone_2', 'obstacle_stone_3',
    'obstacle_stone_4', 'obstacle_stone_5', 'obstacle_stone_6',
    'obstacle_barrel_1', 'obstacle_barrel_2', 'obstacle_anchor',
    'obstacle_seaweed_1', 'obstacle_seaweed_2', 'obstacle_steering_wheel',
  ];
  const gridStep = 600;

  ctx.globalAlpha = 0.3;
  for (let dx = Math.floor(camX / gridStep) * gridStep - gridStep; dx < camX + vw + gridStep; dx += gridStep) {
    for (let dy = Math.floor(camY / gridStep) * gridStep - gridStep; dy < camY + vh + gridStep; dy += gridStep) {
      const hash = ((dx * 73856093) ^ (dy * 19349663)) & 0x7FFFFFFF;
      if (hash % 3 !== 0) continue;
      const ox = dx + (hash % 400) - 200;
      const oy = dy + ((hash >> 8) % 400) - 200;
      if (ox < 50 || ox > GAME_CONFIG.mapWidth - 50 || oy < 50 || oy > GAME_CONFIG.mapHeight - 50) continue;
      if (Math.abs(ox - GAME_CONFIG.mapWidth / 2) < 300 && Math.abs(oy - GAME_CONFIG.mapHeight / 2) < 300) continue;
      const sx = ox - camX;
      const sy = oy - camY;
      if (sx < -60 || sx > vw + 60 || sy < -60 || sy > vh + 60) continue;
      const decorKey = decorKeys[hash % decorKeys.length];
      const decorImg = state.images[decorKey];
      if (isImageReady(decorImg)) {
        const size = 40 + (hash % 30);
        drawCenteredImage(ctx, decorImg, sx, sy, size, size);
      }
    }
  }
  ctx.globalAlpha = 1;
}

function renderMinimap(ctx: CanvasRenderingContext2D, state: GameSnapshot, vw: number, vh: number) {
  const cam = state.camera;
  const mmSize = Math.min(90, vw * 0.18);
  const mmPad = 12;
  const mmX = vw - mmSize - mmPad;
  const mmY = vh - mmSize - mmPad;
  const scaleX = mmSize / GAME_CONFIG.mapWidth;
  const scaleY = mmSize / GAME_CONFIG.mapHeight;

  ctx.globalAlpha = 0.7;
  ctx.fillStyle = 'rgba(10, 10, 20, 0.85)';
  ctx.fillRect(mmX, mmY, mmSize, mmSize);
  ctx.strokeStyle = 'rgba(100, 120, 200, 0.3)';
  ctx.lineWidth = 1;
  ctx.strokeRect(mmX, mmY, mmSize, mmSize);
  ctx.globalAlpha = 1;

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 1;
  ctx.strokeRect(mmX + cam.x * scaleX, mmY + cam.y * scaleY, vw * scaleX, vh * scaleY);

  // Turrets
  ctx.fillStyle = '#ff6b35';
  for (let i = 0; i < state.turrets.length; i++) {
    const t = state.turrets[i];
    ctx.fillRect(mmX + t.x * scaleX - 2, mmY + t.y * scaleY - 2, 4, 4);
  }

  // Minions (limit to 30 for perf)
  const minionLimit = Math.min(state.minions.length, 30);
  for (let i = 0; i < minionLimit; i++) {
    const m = state.minions[i];
    if (m.type.startsWith('boss_')) {
      ctx.fillStyle = '#a855f7';
      ctx.fillRect(mmX + m.x * scaleX - 2, mmY + m.y * scaleY - 2, 5, 5);
    } else {
      ctx.fillStyle = 'rgba(74, 222, 128, 0.5)';
      ctx.fillRect(mmX + m.x * scaleX - 1, mmY + m.y * scaleY - 1, 2, 2);
    }
  }

  // Dimsum pickups only on minimap (skip other pickups)
  ctx.fillStyle = '#fbbf24';
  for (let i = 0; i < state.pickups.length; i++) {
    const p = state.pickups[i];
    if (p.type === 'dimsum' || p.type === 'mystery_box') {
      ctx.fillRect(mmX + p.x * scaleX - 1, mmY + p.y * scaleY - 1, 3, 3);
    }
  }

  // Player dot
  ctx.fillStyle = '#60a5fa';
  ctx.beginPath();
  ctx.arc(mmX + state.player.x * scaleX, mmY + state.player.y * scaleY, 3, 0, Math.PI * 2);
  ctx.fill();
}
