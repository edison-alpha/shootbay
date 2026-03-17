import React, { useEffect, useRef, useState } from 'react';
import type { GameSnapshot, GameState } from '../types/game';
import { ALL_ASSETS } from '../constants/assets';
import { playIntroAudio } from '../utils/audio';

// ── Local image imports ────────────────────────────────────────────────
import goblinBayPng from '../assets/goblinbay.webp';
import charAgreePng from '../assets/agree.webp';
import charAgreedasterPng from '../assets/agreedaster.webp';
import charAgreeFront from '../assets/caractertentara.webp';
import charAgreedasterFront from '../assets/caracterdaster.webp';

// ── Boss character sprites ─────────────────────────────────────────────
// Viking Leader
import bossVikingIdle from '../assets/boss-caracter/Viking Leader/PNG/PNG Sequences/Right - Idle/Right - Idle_000.webp';
import bossVikingIdle1 from '../assets/boss-caracter/Viking Leader/PNG/PNG Sequences/Right - Idle/Right - Idle_003.webp';
import bossVikingIdle2 from '../assets/boss-caracter/Viking Leader/PNG/PNG Sequences/Right - Idle/Right - Idle_006.webp';
import bossVikingAttack from '../assets/boss-caracter/Viking Leader/PNG/PNG Sequences/Right - Attacking/Right - Attacking_000.webp';
import bossVikingAttack1 from '../assets/boss-caracter/Viking Leader/PNG/PNG Sequences/Right - Attacking/Right - Attacking_003.webp';
import bossVikingAttack2 from '../assets/boss-caracter/Viking Leader/PNG/PNG Sequences/Right - Attacking/Right - Attacking_006.webp';
import bossVikingHurt from '../assets/boss-caracter/Viking Leader/PNG/PNG Sequences/Right - Hurt/Right - Hurt_003.webp';
import bossVikingWalk from '../assets/boss-caracter/Viking Leader/PNG/PNG Sequences/Right - Walking/Right - Walking_000.webp';
import bossVikingWalk1 from '../assets/boss-caracter/Viking Leader/PNG/PNG Sequences/Right - Walking/Right - Walking_005.webp';
import bossVikingRun from '../assets/boss-caracter/Viking Leader/PNG/PNG Sequences/Right - Running/Right - Running_000.webp';

// Giant Goblin
import bossGoblinIdle from '../assets/boss-caracter/Giant Goblin/PNG/PNG Sequences/Front - Idle/Front - Idle_000.webp';
import bossGoblinIdle1 from '../assets/boss-caracter/Giant Goblin/PNG/PNG Sequences/Right - Idle/Right - Idle_000.webp';
import bossGoblinIdle2 from '../assets/boss-caracter/Giant Goblin/PNG/PNG Sequences/Right - Idle/Right - Idle_005.webp';
import bossGoblinAttack from '../assets/boss-caracter/Giant Goblin/PNG/PNG Sequences/Right - Attacking/Right - Attacking_000.webp';
import bossGoblinAttack1 from '../assets/boss-caracter/Giant Goblin/PNG/PNG Sequences/Right - Attacking/Right - Attacking_003.webp';
import bossGoblinAttack2 from '../assets/boss-caracter/Giant Goblin/PNG/PNG Sequences/Right - Attacking/Right - Attacking_006.webp';
import bossGoblinHurt from '../assets/boss-caracter/Giant Goblin/PNG/PNG Sequences/Right - Hurt/Right - Hurt_003.webp';
import bossGoblinWalk from '../assets/boss-caracter/Giant Goblin/PNG/PNG Sequences/Right - Walking/Right - Walking_000.webp';
import bossGoblinRun from '../assets/boss-caracter/Giant Goblin/PNG/PNG Sequences/Right - Running/Right - Running_000.webp';

// Caveman Boss
import bossCavemanIdle from '../assets/boss-caracter/Caveman Boss/PNG/PNG Sequences/Right - Idle/Right - Idle_000.webp';
import bossCavemanIdle1 from '../assets/boss-caracter/Caveman Boss/PNG/PNG Sequences/Right - Idle/Right - Idle_005.webp';
import bossCavemanIdle2 from '../assets/boss-caracter/Caveman Boss/PNG/PNG Sequences/Right - Idle/Right - Idle_010.webp';
import bossCavemanAttack from '../assets/boss-caracter/Caveman Boss/PNG/PNG Sequences/Right - Attacking/Right - Attacking_000.webp';
import bossCavemanAttack1 from '../assets/boss-caracter/Caveman Boss/PNG/PNG Sequences/Right - Attacking/Right - Attacking_003.webp';
import bossCavemanAttack2 from '../assets/boss-caracter/Caveman Boss/PNG/PNG Sequences/Right - Attacking/Right - Attacking_006.webp';
import bossCavemanHurt from '../assets/boss-caracter/Caveman Boss/PNG/PNG Sequences/Right - Hurt/Right - Hurt_003.webp';
import bossCavemanWalk from '../assets/boss-caracter/Caveman Boss/PNG/PNG Sequences/Right - Walking/Right - Walking_000.webp';
import bossCavemanRun from '../assets/boss-caracter/Caveman Boss/PNG/PNG Sequences/Right - Running/Right - Running_000.webp';

// ── Underwater pickup sprites ──────────────────────────────────────────
import pickupHeart from '../assets/underwater/Bonus/Heart.webp';
import pickupShield from '../assets/underwater/Bonus/Shield.webp';
import pickupCoin from '../assets/underwater/Bonus/Coin.webp';
import pickupCrown from '../assets/underwater/Bonus/Crown.webp';
import pickupPearl from '../assets/underwater/Bonus/Pearl.webp';
import pickupAcceleration from '../assets/underwater/Bonus/Acceleration.webp';
import pickupSmallBomb from '../assets/underwater/Bonus/Small-bomb.webp';
import pickupMagnet from '../assets/underwater/Bonus/Magnet.webp';

// ── Mystery Box (Chest) ───────────────────────────────────────────────
import chestClosed from '../assets/underwater/Neutral/\u00e6hest_closed.webp';
import chestAjar from '../assets/underwater/Neutral/\u00e6hest_ajar.webp';
import chestOpen from '../assets/underwater/Neutral/\u00e6hest_open.webp';

// ── Dimsum sprite ─────────────────────────────────────────────────────
import dimsumSprite from '../assets/dimsum.png';

// ── Bubble sprites (score animation) ──────────────────────────────────
import bubble1 from '../assets/underwater/Neutral/Bubble_1.webp';
import bubble2 from '../assets/underwater/Neutral/Bubble_2.webp';
import bubble3 from '../assets/underwater/Neutral/Bubble_3.webp';

// ── Underwater obstacles (map hazards & decoration) ───────────────────
import obstacleStone1 from '../assets/underwater/Let/Stone_1.webp';
import obstacleStone2 from '../assets/underwater/Let/Stone_2.webp';
import obstacleStone3 from '../assets/underwater/Let/Stone_3.webp';
import obstacleStone4 from '../assets/underwater/Let/Stone_4.webp';
import obstacleStone5 from '../assets/underwater/Let/Stone_5.webp';
import obstacleStone6 from '../assets/underwater/Let/Stone_6.webp';
import obstacleBarrel1 from '../assets/underwater/Let/Barrel_1.webp';
import obstacleBarrel2 from '../assets/underwater/Let/Barrel_2.webp';
import obstacleBomb from '../assets/underwater/Let/Bomb.webp';
import obstacleAnchor from '../assets/underwater/Let/Anchor.webp';
import obstacleChain from '../assets/underwater/Let/Chain.webp';
import obstacleMast from '../assets/underwater/Let/Mast.webp';
import obstacleNet from '../assets/underwater/Let/Net.webp';
import obstacleSeaweed1 from '../assets/underwater/Let/Seaweed_1.webp';
import obstacleSeaweed2 from '../assets/underwater/Let/Seaweed_2.webp';
import obstacleSteeringWheel from '../assets/underwater/Let/Steering-wheel.webp';

// ── Fire/Water spell projectile frames ────────────────────────────────
import fireBall1 from '../assets/water-fire-sprite-magic/Fire Ball/PNG/Fire Ball_Frame_01.webp';
import fireBall2 from '../assets/water-fire-sprite-magic/Fire Ball/PNG/Fire Ball_Frame_02.webp';
import fireBall3 from '../assets/water-fire-sprite-magic/Fire Ball/PNG/Fire Ball_Frame_03.webp';
import fireBall4 from '../assets/water-fire-sprite-magic/Fire Ball/PNG/Fire Ball_Frame_04.webp';
import fireBall5 from '../assets/water-fire-sprite-magic/Fire Ball/PNG/Fire Ball_Frame_05.webp';
import fireBall6 from '../assets/water-fire-sprite-magic/Fire Ball/PNG/Fire Ball_Frame_06.webp';
import fireBall7 from '../assets/water-fire-sprite-magic/Fire Ball/PNG/Fire Ball_Frame_07.webp';
import fireBall8 from '../assets/water-fire-sprite-magic/Fire Ball/PNG/Fire Ball_Frame_08.webp';

import waterBall1 from '../assets/water-fire-sprite-magic/Water Ball/PNG/Water Ball_Frame_01.webp';
import waterBall2 from '../assets/water-fire-sprite-magic/Water Ball/PNG/Water Ball_Frame_02.webp';
import waterBall3 from '../assets/water-fire-sprite-magic/Water Ball/PNG/Water Ball_Frame_03.webp';
import waterBall4 from '../assets/water-fire-sprite-magic/Water Ball/PNG/Water Ball_Frame_04.webp';
import waterBall5 from '../assets/water-fire-sprite-magic/Water Ball/PNG/Water Ball_Frame_05.webp';
import waterBall6 from '../assets/water-fire-sprite-magic/Water Ball/PNG/Water Ball_Frame_06.webp';

import fireArrow1 from '../assets/water-fire-sprite-magic/Fire Arrow/PNG/Fire Arrow_Frame_01.webp';
import fireArrow2 from '../assets/water-fire-sprite-magic/Fire Arrow/PNG/Fire Arrow_Frame_02.webp';
import fireArrow3 from '../assets/water-fire-sprite-magic/Fire Arrow/PNG/Fire Arrow_Frame_03.webp';
import fireArrow4 from '../assets/water-fire-sprite-magic/Fire Arrow/PNG/Fire Arrow_Frame_04.webp';

import waterArrow1 from '../assets/water-fire-sprite-magic/Water Arrow/PNG/Water Arrow_Frame_01.webp';
import waterArrow2 from '../assets/water-fire-sprite-magic/Water Arrow/PNG/Water Arrow_Frame_02.webp';
import waterArrow3 from '../assets/water-fire-sprite-magic/Water Arrow/PNG/Water Arrow_Frame_03.webp';
import waterArrow4 from '../assets/water-fire-sprite-magic/Water Arrow/PNG/Water Arrow_Frame_04.webp';

import waterSpell1 from '../assets/water-fire-sprite-magic/Water Spell/PNG/Water Spell_Frame_01.webp';
import waterSpell4 from '../assets/water-fire-sprite-magic/Water Spell/PNG/Water Spell_Frame_04.webp';

import fireSpell1 from '../assets/water-fire-sprite-magic/Fire Spell/PNG/Fire Spell_Frame_01.webp';
import fireSpell4 from '../assets/water-fire-sprite-magic/Fire Spell/PNG/Fire Spell_Frame_04.webp';

// ── Spell icons ──────────────────────────────────────────────────────
import iconFireBall from '../assets/water-fire-sprite-magic/Icons/PNG/Icons_Fire Ball.webp';
import iconWaterBall from '../assets/water-fire-sprite-magic/Icons/PNG/Icons_Water Ball.webp';
import iconFireArrow from '../assets/water-fire-sprite-magic/Icons/PNG/Icons_Fire Arrow.webp';
import iconWaterArrow from '../assets/water-fire-sprite-magic/Icons/PNG/Icons_Water Arrow.webp';
import iconFireSpell from '../assets/water-fire-sprite-magic/Icons/PNG/Icons_Fire Spell.webp';
import iconWaterSpell from '../assets/water-fire-sprite-magic/Icons/PNG/Icons_Water Spell.webp';

// ── Energy effects ────────────────────────────────────────────────────
import energy1 from '../assets/energy-pack/energy/1.webp';
import energy2 from '../assets/energy-pack/energy/2.webp';
import energy3 from '../assets/energy-pack/energy/3.webp';
import energy5 from '../assets/energy-pack/energy/5.webp';
import energy7 from '../assets/energy-pack/energy/7.webp';
import energy10 from '../assets/energy-pack/energy/10.webp';
import energy15 from '../assets/energy-pack/energy/15.webp';
import energy20 from '../assets/energy-pack/energy/20.webp';
import energy25 from '../assets/energy-pack/energy/25.webp';
import energy30 from '../assets/energy-pack/energy/30.webp';
import energy35 from '../assets/energy-pack/energy/35.webp';
import energy40 from '../assets/energy-pack/energy/40.webp';
import energy45 from '../assets/energy-pack/energy/45.webp';
import energy50 from '../assets/energy-pack/energy/50.webp';

// ── Local asset registry ──────────────────────────────────────────────
const LOCAL_IMAGE_ASSETS: Record<string, string> = {
  goblin_bay_local: goblinBayPng,

  // ─── Default minion sprite (fallback for non-boss minions) ──────────
  goblin_minion: goblinBayPng,

  // ─── Player character sprites (selected at character select screen) ─
  // Default trooper_character uses agree front-facing; overridden in beginGameplay()
  trooper_character: charAgreeFront,
  char_agree: charAgreePng,
  char_agreedaster: charAgreedasterPng,
  char_agree_front: charAgreeFront,
  char_agreedaster_front: charAgreedasterFront,

  // ─── Boss Characters (multi-frame for animation) ───────────────────
  boss_viking_idle: bossVikingIdle,
  boss_viking_idle_1: bossVikingIdle1,
  boss_viking_idle_2: bossVikingIdle2,
  boss_viking_attack: bossVikingAttack,
  boss_viking_attack_1: bossVikingAttack1,
  boss_viking_attack_2: bossVikingAttack2,
  boss_viking_hurt: bossVikingHurt,
  boss_viking_walk: bossVikingWalk,
  boss_viking_walk_1: bossVikingWalk1,
  boss_viking_run: bossVikingRun,

  boss_goblin_idle: bossGoblinIdle,
  boss_goblin_idle_1: bossGoblinIdle1,
  boss_goblin_idle_2: bossGoblinIdle2,
  boss_goblin_attack: bossGoblinAttack,
  boss_goblin_attack_1: bossGoblinAttack1,
  boss_goblin_attack_2: bossGoblinAttack2,
  boss_goblin_hurt: bossGoblinHurt,
  boss_goblin_walk: bossGoblinWalk,
  boss_goblin_run: bossGoblinRun,

  boss_caveman_idle: bossCavemanIdle,
  boss_caveman_idle_1: bossCavemanIdle1,
  boss_caveman_idle_2: bossCavemanIdle2,
  boss_caveman_attack: bossCavemanAttack,
  boss_caveman_attack_1: bossCavemanAttack1,
  boss_caveman_attack_2: bossCavemanAttack2,
  boss_caveman_hurt: bossCavemanHurt,
  boss_caveman_walk: bossCavemanWalk,
  boss_caveman_run: bossCavemanRun,

  // ─── Pickup sprites ────────────────────────────────────────────────
  pickup_heart: pickupHeart,
  pickup_shield: pickupShield,
  pickup_coin: pickupCoin,
  pickup_crown: pickupCrown,
  pickup_pearl: pickupPearl,
  pickup_acceleration: pickupAcceleration,
  pickup_bomb: pickupSmallBomb,
  pickup_magnet: pickupMagnet,
  pickup_dimsum: dimsumSprite,

  // ─── Mystery Box (Chest) ──────────────────────────────────────────
  chest_closed: chestClosed,
  chest_ajar: chestAjar,
  chest_open: chestOpen,

  // ─── Bubble sprites (score / point animation) ─────────────────────
  bubble_1: bubble1,
  bubble_2: bubble2,
  bubble_3: bubble3,

  // ─── Fire Ball projectile frames (animated) ───────────────────────
  fire_ball_1: fireBall1,
  fire_ball_2: fireBall2,
  fire_ball_3: fireBall3,
  fire_ball_4: fireBall4,
  fire_ball_5: fireBall5,
  fire_ball_6: fireBall6,
  fire_ball_7: fireBall7,
  fire_ball_8: fireBall8,

  // ─── Water Ball projectile frames (animated) ──────────────────────
  water_ball_1: waterBall1,
  water_ball_2: waterBall2,
  water_ball_3: waterBall3,
  water_ball_4: waterBall4,
  water_ball_5: waterBall5,
  water_ball_6: waterBall6,

  // ─── Fire Arrow frames ────────────────────────────────────────────
  fire_arrow_1: fireArrow1,
  fire_arrow_2: fireArrow2,
  fire_arrow_3: fireArrow3,
  fire_arrow_4: fireArrow4,

  // ─── Water Arrow frames ───────────────────────────────────────────
  water_arrow_1: waterArrow1,
  water_arrow_2: waterArrow2,
  water_arrow_3: waterArrow3,
  water_arrow_4: waterArrow4,

  // ─── Spell effects ────────────────────────────────────────────────
  water_spell_1: waterSpell1,
  water_spell_4: waterSpell4,
  fire_spell_1: fireSpell1,
  fire_spell_4: fireSpell4,

  // ─── Spell icons ──────────────────────────────────────────────────
  icon_fire_ball: iconFireBall,
  icon_water_ball: iconWaterBall,
  icon_fire_arrow: iconFireArrow,
  icon_water_arrow: iconWaterArrow,
  icon_fire_spell: iconFireSpell,
  icon_water_spell: iconWaterSpell,

  // ─── Energy effects (power-up visuals) ────────────────────────────
  energy_1: energy1,
  energy_2: energy2,
  energy_3: energy3,
  energy_5: energy5,
  energy_7: energy7,
  energy_10: energy10,
  energy_15: energy15,
  energy_20: energy20,
  energy_25: energy25,
  energy_30: energy30,
  energy_35: energy35,
  energy_40: energy40,
  energy_45: energy45,
  energy_50: energy50,

  // ─── Map decorations & obstacles ──────────────────────────────────
  obstacle_stone_1: obstacleStone1,
  obstacle_stone_2: obstacleStone2,
  obstacle_stone_3: obstacleStone3,
  obstacle_stone_4: obstacleStone4,
  obstacle_stone_5: obstacleStone5,
  obstacle_stone_6: obstacleStone6,
  obstacle_barrel_1: obstacleBarrel1,
  obstacle_barrel_2: obstacleBarrel2,
  obstacle_bomb: obstacleBomb,
  obstacle_anchor: obstacleAnchor,
  obstacle_chain: obstacleChain,
  obstacle_mast: obstacleMast,
  obstacle_net: obstacleNet,
  obstacle_seaweed_1: obstacleSeaweed1,
  obstacle_seaweed_2: obstacleSeaweed2,
  obstacle_steering_wheel: obstacleSteeringWheel,
};

interface UseIntroLoaderResult {
  loadingProgress: number;
  introFading: boolean;
}

/**
 * Orchestrates the intro screen: preloads all remote + local assets,
 * plays the intro jingle, shows progress, then signals transition.
 */
export function useIntroLoader(
  gameState: GameState,
  gameRef: React.MutableRefObject<GameSnapshot>,
  onComplete: () => void,
): UseIntroLoaderResult {
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [introFading, setIntroFading] = useState(false);
  const introAudioRef = useRef<{ stop: () => void } | null>(null);
  const fadeTimerRef = useRef<number | null>(null);
  const completeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (gameState !== 'intro') return;

    let cancelled = false;
    let progress = 0;
    setLoadingProgress(0);
    setIntroFading(false);

    if (fadeTimerRef.current) {
      window.clearTimeout(fadeTimerRef.current);
      fadeTimerRef.current = null;
    }

    if (completeTimerRef.current) {
      window.clearTimeout(completeTimerRef.current);
      completeTimerRef.current = null;
    }

    // ── Intro audio ──────────────────────────────────────────────────
    const tryPlayAudio = () => {
      if (!introAudioRef.current) {
        introAudioRef.current = playIntroAudio();
      }
    };

    try { tryPlayAudio(); } catch { /* autoplay policy */ }

    const onInteract = () => {
      tryPlayAudio();
      window.removeEventListener('click', onInteract);
      window.removeEventListener('touchstart', onInteract);
    };
    window.addEventListener('click', onInteract);
    window.addEventListener('touchstart', onInteract);

    // ── Asset loading ────────────────────────────────────────────────
    const imageEntries = Object.entries(ALL_ASSETS).filter(([, u]) => u.endsWith('.webp') || u.endsWith('.png'));
    const audioEntries = Object.entries(ALL_ASSETS).filter(([, u]) => u.endsWith('.mp3'));
    const localEntries = Object.entries(LOCAL_IMAGE_ASSETS);
    const totalAssets = imageEntries.length + audioEntries.length + localEntries.length;
    let loadedCount = 0;

    const bumpProgress = () => {
      loadedCount++;
      const assetPct = (loadedCount / totalAssets) * 70;
      if (!cancelled) {
        progress = Math.min(assetPct, 70);
        setLoadingProgress(Math.round(progress));
      }
    };

    // Load remote image assets
    imageEntries.forEach(([key, url]) => {
      const img = new Image();
      img.onload = bumpProgress;
      img.onerror = bumpProgress;
      img.src = url;
      gameRef.current.images[key] = img;
    });

    // Load all local image assets (bosses, pickups, spells, energy, obstacles)
    localEntries.forEach(([key, url]) => {
      const img = new Image();
      img.onload = bumpProgress;
      img.onerror = bumpProgress;
      img.src = url;
      gameRef.current.images[key] = img;
    });

    // Load audio assets
    audioEntries.forEach(([key, url]) => {
      const audio = new Audio(url);
      audio.addEventListener('canplaythrough', bumpProgress, { once: true });
      audio.addEventListener('error', bumpProgress, { once: true });
      gameRef.current.audio[key] = audio;
    });

    // ── Smooth remaining 30 % ────────────────────────────────────────
    const smoothTimer = setInterval(() => {
      if (cancelled) return;
      progress += (100 - progress) * 0.05;
      if (progress > 98) progress = 100;
      setLoadingProgress(Math.round(progress));

      if (progress >= 100) {
        clearInterval(smoothTimer);
        fadeTimerRef.current = window.setTimeout(() => {
          if (cancelled) return;
          setIntroFading(true);
          completeTimerRef.current = window.setTimeout(() => {
            if (cancelled) return;
            if (introAudioRef.current) {
              introAudioRef.current.stop();
              introAudioRef.current = null;
            }
            onComplete();
          }, 800);
        }, 500);
      }
    }, 80);

    return () => {
      cancelled = true;
      clearInterval(smoothTimer);
      if (fadeTimerRef.current) {
        window.clearTimeout(fadeTimerRef.current);
        fadeTimerRef.current = null;
      }
      if (completeTimerRef.current) {
        window.clearTimeout(completeTimerRef.current);
        completeTimerRef.current = null;
      }
      if (introAudioRef.current) {
        introAudioRef.current.stop();
        introAudioRef.current = null;
      }
      window.removeEventListener('click', onInteract);
      window.removeEventListener('touchstart', onInteract);
    };
  }, [gameState]); // eslint-disable-line react-hooks/exhaustive-deps

  return { loadingProgress, introFading };
}
