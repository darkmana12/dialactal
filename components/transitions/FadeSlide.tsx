import React, { useEffect, useRef, useState } from 'react';

type FadeSlideProps = {
  show: boolean;
  durationMs?: number;
  offsetY?: number; // px translate on enter/exit
  enterDelayMs?: number; // delay before starting enter animation when mounting
  children: React.ReactNode;
};

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const FadeSlide: React.FC<FadeSlideProps> = ({ show, durationMs = 600, offsetY = 8, enterDelayMs = 0, children }) => {
  const [mounted, setMounted] = useState(show);
  const [entered, setEntered] = useState(show);
  const timerRef = useRef<number | null>(null);
  const reduce = prefersReducedMotion();

  useEffect(() => {
    if (show) {
      setMounted(true);
      // Allow paint, then optionally delay before entering
      const id = requestAnimationFrame(() => {
        if (reduce || enterDelayMs <= 0) {
          setEntered(true);
        } else {
          timerRef.current = window.setTimeout(() => setEntered(true), enterDelayMs);
        }
      });
      return () => {
        cancelAnimationFrame(id);
        if (timerRef.current) window.clearTimeout(timerRef.current);
      };
    } else {
      setEntered(false);
      // unmount after transition
      timerRef.current = window.setTimeout(() => setMounted(false), reduce ? 0 : durationMs);
      return () => {
        if (timerRef.current) window.clearTimeout(timerRef.current);
      };
    }
  }, [show, durationMs, enterDelayMs, reduce]);

  if (!mounted) return null;

  const style: React.CSSProperties = reduce
    ? {}
  : {
    transitionProperty: 'opacity, transform',
    transitionDuration: `${durationMs}ms`,
    transitionTimingFunction: 'cubic-bezier(.22,.61,.36,1)',
        opacity: entered ? 1 : 0,
        transform: entered ? 'none' : `translateY(${offsetY}px)`,
      };

  return <div style={style}>{children}</div>;
};

export default FadeSlide;
