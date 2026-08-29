import { useCallback, useEffect, useRef, type ComponentPropsWithoutRef, type PointerEvent, type ReactNode } from 'react';
import {
  motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring, useTransform,
} from 'motion/react';
import type { MotionStyle } from 'motion/react';
import { calculateTilt, type TiltBounds } from '@/lib/depth';
import { cn } from '@/lib/utils';

export type DepthStrength = 'calm' | 'strong';

interface TiltSurfaceProps extends Omit<ComponentPropsWithoutRef<typeof motion.div>, 'children' | 'style'> {
  children?: ReactNode;
  depth?: DepthStrength;
  glare?: boolean;
  style?: MotionStyle;
}

export function TiltSurface({
  children, className, depth = 'strong', glare = true, style,
  onPointerEnter, onPointerMove, onPointerLeave, onPointerCancel,
  onPointerDown, onPointerUp, onLostPointerCapture, ...props
}: TiltSurfaceProps) {
  const reduceMotion = useReducedMotion() ?? false;
  const finePointer = typeof window !== 'undefined' &&
    window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const trackingEnabled = finePointer && !reduceMotion;
  const bounds = useRef<TiltBounds | null>(null);
  const activeSurface = useRef<HTMLDivElement | null>(null);
  const maxRotation = useRef(4);
  const rawRotateX = useMotionValue(0);
  const rawRotateY = useMotionValue(0);
  const rawLift = useMotionValue(0);
  const normalizedX = useMotionValue(0);
  const normalizedY = useMotionValue(0);
  const rotateX = useSpring(rawRotateX, { stiffness: 260, damping: 28 });
  const rotateY = useSpring(rawRotateY, { stiffness: 260, damping: 28 });
  const y = useSpring(rawLift, { stiffness: 300, damping: 30 });
  const shadowX = useTransform(rotateY, (value) => value * 1.15);
  const shadowY = useTransform(rotateX, (value) => 14 - value * 0.45);
  const boxShadow = useMotionTemplate`${shadowX}px ${shadowY}px 26px var(--depth-shadow-color)`;
  const glareX = useTransform(normalizedX, [-1, 1], [20, 80]);
  const glareY = useTransform(normalizedY, [-1, 1], [20, 80]);
  const glareBackground = useMotionTemplate`radial-gradient(circle at ${glareX}% ${glareY}%, var(--depth-glare-color), transparent 42%)`;

  const reset = useCallback((element: HTMLDivElement): void => {
    bounds.current = null;
    rawRotateX.set(0);
    rawRotateY.set(0);
    rawLift.set(0);
    normalizedX.set(0);
    normalizedY.set(0);
    element.dataset.tiltActive = 'false';
    if (activeSurface.current === element) activeSurface.current = null;
  }, [normalizedX, normalizedY, rawLift, rawRotateX, rawRotateY]);

  useEffect(() => {
    const resetOnWindowBlur = (): void => {
      if (activeSurface.current) reset(activeSurface.current);
    };
    window.addEventListener('blur', resetOnWindowBlur);
    return () => window.removeEventListener('blur', resetOnWindowBlur);
  }, [reset]);

  const enter = (event: PointerEvent<HTMLDivElement>): void => {
    if (trackingEnabled && event.pointerType !== 'touch') {
      bounds.current = event.currentTarget.getBoundingClientRect();
      const token = getComputedStyle(event.currentTarget).getPropertyValue('--depth-max-rotate');
      const parsedRotation = Number.parseFloat(token);
      maxRotation.current = Math.max(0, Math.min(6, Number.isNaN(parsedRotation) ? 4 : parsedRotation));
      rawLift.set(-4);
      event.currentTarget.dataset.tiltActive = 'true';
      activeSurface.current = event.currentTarget;
    }
    onPointerEnter?.(event);
  };

  const move = (event: PointerEvent<HTMLDivElement>): void => {
    if (trackingEnabled && bounds.current && event.pointerType !== 'touch') {
      const tilt = calculateTilt(event, bounds.current, maxRotation.current);
      rawRotateX.set(tilt.rotateX);
      rawRotateY.set(tilt.rotateY);
      normalizedX.set(tilt.normalizedX);
      normalizedY.set(tilt.normalizedY);
    }
    onPointerMove?.(event);
  };

  return (
    <motion.div
      {...props}
      className={cn('tilt-surface', className)}
      data-depth={depth}
      data-tilt-enabled={trackingEnabled ? 'true' : 'false'}
      data-tilt-active="false"
      style={{ ...(style ?? {}), rotateX, rotateY, y, boxShadow, transformPerspective: 'var(--depth-perspective)' }}
      onPointerEnter={enter}
      onPointerMove={move}
      onPointerLeave={(event) => { reset(event.currentTarget); onPointerLeave?.(event); }}
      onPointerCancel={(event) => { reset(event.currentTarget); onPointerCancel?.(event); }}
      onLostPointerCapture={(event) => { reset(event.currentTarget); onLostPointerCapture?.(event); }}
      onPointerDown={(event) => {
        if (!reduceMotion && event.pointerType === 'touch') {
          rawLift.set(-2);
          activeSurface.current = event.currentTarget;
        }
        onPointerDown?.(event);
      }}
      onPointerUp={(event) => {
        if (!reduceMotion && event.pointerType === 'touch') {
          rawLift.set(0);
          if (activeSurface.current === event.currentTarget) activeSurface.current = null;
        }
        onPointerUp?.(event);
      }}
    >
      {children}
      {glare ? <motion.span className="tilt-glare" aria-hidden="true" style={{ background: glareBackground, pointerEvents: 'none' }} /> : null}
    </motion.div>
  );
}
