/**
 * Synthesise a short intro jingle using the Web Audio API.
 * Returns a handle with a `stop()` method for clean tear-down.
 */
export function playIntroAudio(): { stop: () => void } {
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.35, ctx.currentTime);
  master.connect(ctx.destination);

  const notes = [261.63, 329.63, 392.0, 523.25, 659.25, 783.99, 1046.5];
  const now = ctx.currentTime;

  // Ascending arpeggio
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    const start = now + i * 0.28;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.3, start + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.9);

    osc.connect(gain);
    gain.connect(master);
    osc.start(start);
    osc.stop(start + 1);
  });

  // Pad / sweep
  const pad = ctx.createOscillator();
  const padGain = ctx.createGain();
  pad.type = 'triangle';
  pad.frequency.setValueAtTime(130.81, now);
  pad.frequency.linearRampToValueAtTime(261.63, now + 2.5);
  padGain.gain.setValueAtTime(0, now);
  padGain.gain.linearRampToValueAtTime(0.15, now + 0.5);
  padGain.gain.linearRampToValueAtTime(0.1, now + 2);
  padGain.gain.exponentialRampToValueAtTime(0.001, now + 3);
  pad.connect(padGain);
  padGain.connect(master);
  pad.start(now);
  pad.stop(now + 3.5);

  // Sub bass
  const sub = ctx.createOscillator();
  const subGain = ctx.createGain();
  sub.type = 'sine';
  sub.frequency.setValueAtTime(65.41, now);
  subGain.gain.setValueAtTime(0, now);
  subGain.gain.linearRampToValueAtTime(0.2, now + 0.3);
  subGain.gain.exponentialRampToValueAtTime(0.001, now + 2.5);
  sub.connect(subGain);
  subGain.connect(master);
  sub.start(now);
  sub.stop(now + 3);

  return {
    stop: () => {
      master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
      setTimeout(() => ctx.close().catch(() => {}), 500);
    },
  };
}

/** Quick-fire a preloaded HTMLAudioElement from the beginning. */
export function playSoundEffect(sound: HTMLAudioElement | undefined): void {
  if (!sound) return;
  sound.currentTime = 0;
  sound.play().catch(() => {});
}
