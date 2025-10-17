import React, { useEffect, useRef, useState } from 'react';

type FadeScaleProps = {
  show: boolean;
  durationMs?: number;
  startScale?: number; // initial scale before enter
  children: React.ReactNode;
};

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const FadeScale: React.FC<FadeScaleProps> = ({ show, durationMs = 600, startScale = 0.96, children }) => {
  const [mounted, setMounted] = useState(show);
  const [entered, setEntered] = useState(show);
  const timerRef = useRef<number | null>(null);
  const reduce = prefersReducedMotion();

  useEffect(() => {
    if (show) {
      setMounted(true);
      const id = requestAnimationFrame(() => setEntered(true));
      return () => cancelAnimationFrame(id);
    } else {
      setEntered(false);
      timerRef.current = window.setTimeout(() => setMounted(false), reduce ? 0 : durationMs);
      return () => {
        if (timerRef.current) window.clearTimeout(timerRef.current);
      };
    }
  }, [show, durationMs, reduce]);

  if (!mounted) return null;

  const style: React.CSSProperties = reduce
    ? {}
  : {
    transitionProperty: 'opacity, transform',
    transitionDuration: `${durationMs}ms`,
    transitionTimingFunction: 'cubic-bezier(.22,.61,.36,1)',
        opacity: entered ? 1 : 0,
        ...(startScale === 1
          ? {}
          : { transform: entered ? 'none' : `scale(${startScale})` }),
      };

  return <div style={style}>{children}</div>;
};

export default FadeScale;
