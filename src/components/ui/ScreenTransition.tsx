/**
 * ScreenTransition — GPU-accelerated enter/exit transitions for native-like feel.
 *
 * Uses CSS animations with `will-change: transform, opacity` and `transform3d`
 * for hardware acceleration. Supports slide-left, slide-right, slide-up, fade,
 * and scale transitions. Designed for 60fps on mobile devices.
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';

export type TransitionType = 'slide-left' | 'slide-right' | 'slide-up' | 'slide-down' | 'fade' | 'scale' | 'none';

interface ScreenTransitionProps {
  /** Whether this screen is currently visible */
  show: boolean;
  /** Transition type (default: fade) */
  type?: TransitionType;
  /** Duration in ms (default: 250ms — fast for native feel) */
  duration?: number;
  /** Children to render */
  children: React.ReactNode;
  /** z-index (default: 50) */
  zIndex?: number;
  /** Callback after enter animation completes */
  onEntered?: () => void;
  /** Callback after exit animation completes (before unmount) */
  onExited?: () => void;
  /** Optional className for the wrapper */
  className?: string;
}

type Phase = 'hidden' | 'entering' | 'visible' | 'exiting';

export const ScreenTransition: React.FC<ScreenTransitionProps> = ({
  show,
  type = 'fade',
  duration = 250,
  children,
  zIndex = 50,
  onEntered,
  onExited,
  className = '',
}) => {
  const [phase, setPhase] = useState<Phase>(show ? 'visible' : 'hidden');
  const elRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  // Handle show changes
  useEffect(() => {
    if (show) {
      // Enter
      setPhase('entering');
      // Force reflow then switch to visible to trigger animation
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = requestAnimationFrame(() => {
          setPhase('visible');
        });
      });
    } else if (phase === 'visible' || phase === 'entering') {
      // Exit
      setPhase('exiting');
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [show]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle transition end
  const handleTransitionEnd = useCallback(() => {
    if (phase === 'visible') {
      onEntered?.();
    } else if (phase === 'exiting') {
      setPhase('hidden');
      onExited?.();
    }
  }, [phase, onEntered, onExited]);

  if (type === 'none') {
    return show ? <>{children}</> : null;
  }

  if (phase === 'hidden') return null;

  const isActive = phase === 'visible';
  const durationS = `${duration}ms`;

  // Transform values for each transition type
  const transforms: Record<TransitionType, { from: string; to: string }> = {
    'slide-left':  { from: 'translate3d(100%, 0, 0)', to: 'translate3d(0, 0, 0)' },
    'slide-right': { from: 'translate3d(-100%, 0, 0)', to: 'translate3d(0, 0, 0)' },
    'slide-up':    { from: 'translate3d(0, 100%, 0)',  to: 'translate3d(0, 0, 0)' },
    'slide-down':  { from: 'translate3d(0, -30%, 0)',  to: 'translate3d(0, 0, 0)' },
    'fade':        { from: 'translate3d(0, 0, 0)',     to: 'translate3d(0, 0, 0)' },
    'scale':       { from: 'scale3d(0.92, 0.92, 1)',   to: 'scale3d(1, 1, 1)' },
    'none':        { from: 'none',                     to: 'none' },
  };

  const transform = isActive ? transforms[type].to : transforms[type].from;
  const opacity = isActive ? 1 : (type === 'fade' || type === 'scale' ? 0 : 0.6);

  const style: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    zIndex,
    transform,
    opacity,
    transition: `transform ${durationS} cubic-bezier(0.32, 0.72, 0, 1), opacity ${durationS} ease-out`,
    willChange: 'transform, opacity',
    backfaceVisibility: 'hidden',
    WebkitBackfaceVisibility: 'hidden',
    // Prevent interaction during transition
    pointerEvents: isActive ? 'auto' : 'none',
  };

  return (
    <div
      ref={elRef}
      style={style}
      className={className}
      onTransitionEnd={handleTransitionEnd}
    >
      {children}
    </div>
  );
};
