import React, { useEffect, useRef } from 'react';
import type { GameSnapshot } from '../types/game';
import { setupCanvas, renderFrame } from '../engine/renderer';
import { updatePhysics, type PhysicsEvents } from '../engine/physics';
import { attachInputListeners } from '../engine/input';

/**
 * Runs the canvas game loop (physics → render) at 60 fps via rAF.
 * Input listeners are attached/detached automatically.
 */
export function useGameLoop(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  gameRef: React.MutableRefObject<GameSnapshot>,
  events: PhysicsEvents,
): void {
  // Keep events ref-stable so the loop never sees stale closures
  const eventsRef = useRef(events);
  eventsRef.current = events;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const state = gameRef.current;
    setupCanvas(canvas, ctx);

    let lastTime = performance.now();
    let rafId: number;

    const loop = (time: number) => {
      rafId = requestAnimationFrame(loop);
      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      // Only re-setup canvas on resize (handled by resize listener), not every frame
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      if (state.state === 'playing' && !state.paused) {
        updatePhysics(state, time, dt, vw, vh, eventsRef.current);
      }

      renderFrame(ctx, state, time, vw, vh);
    };

    rafId = requestAnimationFrame(loop);

    const removeInputListeners = attachInputListeners(canvas, state);

    const handleResize = () => setupCanvas(canvas, ctx);
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(rafId);
      removeInputListeners();
      window.removeEventListener('resize', handleResize);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
