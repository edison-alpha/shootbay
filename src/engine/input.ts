import type { GameSnapshot } from '../types/game';

/**
 * Attach all input listeners to a canvas/window pair.
 * Returns a cleanup function that removes every listener.
 */
export function attachInputListeners(
  canvas: HTMLCanvasElement,
  state: GameSnapshot,
): () => void {
  // ── Keyboard ─────────────────────────────────────────────────────────
  const onKeyDown = (e: KeyboardEvent) => { if (e.key) state.keys[e.key.toLowerCase()] = true; };
  const onKeyUp = (e: KeyboardEvent) => { if (e.key) state.keys[e.key.toLowerCase()] = false; };

  // ── Mouse ────────────────────────────────────────────────────────────
  const onMouseMove = (e: MouseEvent) => { state.mouse.x = e.clientX; state.mouse.y = e.clientY; };
  const onMouseDown = () => { state.mouse.down = true; };
  const onMouseUp = () => { state.mouse.down = false; };

  // ── Touch (dual-stick) ───────────────────────────────────────────────
  const onTouchStart = (e: TouchEvent) => {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.clientX < window.innerWidth / 2 && !state.joysticks.left.active) {
        state.joysticks.left.active = true;
        state.joysticks.left.id = t.identifier as any;
        state.joysticks.left.baseX = t.clientX;
        state.joysticks.left.baseY = t.clientY;
        state.joysticks.left.dx = 0;
        state.joysticks.left.dy = 0;
      } else {
        state.mouse.x = t.clientX;
        state.mouse.y = t.clientY;
        state.mouse.down = true;
        state.joysticks.right.id = t.identifier as any;
      }
    }
  };

  const onTouchMove = (e: TouchEvent) => {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (state.joysticks.left.active && t.identifier === state.joysticks.left.id) {
        let dx = t.clientX - state.joysticks.left.baseX;
        let dy = t.clientY - state.joysticks.left.baseY;
        const len = Math.hypot(dx, dy);
        if (len > 50) { dx = (dx / len) * 50; dy = (dy / len) * 50; }
        state.joysticks.left.dx = dx / 50;
        state.joysticks.left.dy = dy / 50;
      } else if (t.identifier === state.joysticks.right.id) {
        state.mouse.x = t.clientX;
        state.mouse.y = t.clientY;
      }
    }
  };

  const onTouchEnd = (e: TouchEvent) => {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (state.joysticks.left.active && t.identifier === state.joysticks.left.id) {
        state.joysticks.left.active = false;
        state.joysticks.left.dx = 0;
        state.joysticks.left.dy = 0;
      } else if (t.identifier === state.joysticks.right.id) {
        state.mouse.down = false;
        state.joysticks.right.id = null;
      }
    }
  };

  // ── Bind ─────────────────────────────────────────────────────────────
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);
  canvas.addEventListener('touchstart', onTouchStart, { passive: false });
  canvas.addEventListener('touchmove', onTouchMove, { passive: false });
  canvas.addEventListener('touchend', onTouchEnd, { passive: false });
  canvas.addEventListener('touchcancel', onTouchEnd, { passive: false });

  // ── Cleanup ──────────────────────────────────────────────────────────
  return () => {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mousedown', onMouseDown);
    window.removeEventListener('mouseup', onMouseUp);
    canvas.removeEventListener('touchstart', onTouchStart);
    canvas.removeEventListener('touchmove', onTouchMove);
    canvas.removeEventListener('touchend', onTouchEnd);
    canvas.removeEventListener('touchcancel', onTouchEnd);
  };
}
