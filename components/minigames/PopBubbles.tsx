import React, { useEffect, useRef, useState } from 'react';

type Bubble = {
  id: number;
  left: number; // percent
  size: number; // px
  duration: number; // ms
  hue: number; // for color variation
};

const randomIn = (min: number, max: number) => Math.random() * (max - min) + min;

const CONTAINER_HEIGHT = 320; // increased height for more vertical play space

const PopBubbles = ({ maxBubbles = 18, active = true }: { maxBubbles?: number; active?: boolean }) => {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [score, setScore] = useState(0);
  const spawnRef = useRef<number | null>(null);

  // Spawn loop controlled by `active`
  useEffect(() => {
    const spawn = () => {
      setBubbles(prev => {
        if (!active) return prev;
        if (prev.length >= maxBubbles) return prev;
        const size = randomIn(22, 46);
        const duration = randomIn(3200, 6200); // slower, longer lifespan
        const left = randomIn(4, 96);
        const hue = randomIn(0, 360);
        const bubble: Bubble = {
          id: Date.now() + Math.floor(Math.random() * 1000),
          left,
          size,
          duration,
          hue,
        };
        return [...prev, bubble];
      });
    };

    if (active) {
      spawn();
      spawnRef.current = window.setInterval(spawn, 450);
    } else {
      // Immediately stop spawning and clear existing bubbles
      if (spawnRef.current) window.clearInterval(spawnRef.current);
      spawnRef.current = null;
      setBubbles([]);
    }

    return () => {
      if (spawnRef.current) window.clearInterval(spawnRef.current);
      spawnRef.current = null;
    };
  }, [active, maxBubbles]);

  const handlePop = (id: number) => {
    setBubbles(prev => prev.filter(b => b.id !== id));
    setScore(s => s + 1);
  };

  return (
    <div className="w-full max-w-2xl">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-semibold text-brand-primary">Mini‑jeu: Pop Bubbles</span>
        <span className="text-gray-700">Score: <strong>{score}</strong></span>
      </div>
  <div className="relative overflow-hidden border-2 border-brand-border rounded-lg" style={{ height: CONTAINER_HEIGHT, background: 'linear-gradient(180deg, #F8FBFF 0%, #E9F3FF 100%)' }}>
        {/* Inline keyframes */}
        <style>{`
          @keyframes rise {
            0% { transform: translateY(var(--startY)); opacity: 1; }
            100% { transform: translateY(var(--endY)); opacity: 1; }
          }
          @keyframes pop {
            0% { transform: scale(1); opacity: 1; }
            100% { transform: scale(1.6); opacity: 0; }
          }
        `}</style>

        {bubbles.map(b => {
          type CSSVars = React.CSSProperties & { [key: string]: any };
          const styleVars: CSSVars = {
            position: 'absolute',
            left: `${b.left}%`,
            bottom: '0%',
            width: b.size,
            height: b.size,
            borderRadius: '9999px',
            background: `radial-gradient(circle at 35% 30%, hsl(${b.hue} 80% 95%), hsl(${b.hue} 70% 70%))`,
            boxShadow: 'inset -8px -10px 18px rgba(255,255,255,0.7), inset 8px 10px 14px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.08)',
            border: '2px solid rgba(255,255,255,0.85)',
            animation: `rise ${b.duration}ms ease-out forwards`,
            cursor: 'pointer',
            willChange: 'transform, opacity',
            '--startY': `${b.size}px`,
            '--endY': `${-(CONTAINER_HEIGHT + b.size)}px`,
          };
          return (
            <button
            key={b.id}
            onClick={() => handlePop(b.id)}
            aria-label="Bulle"
            style={styleVars}
            onAnimationEnd={() => setBubbles(prev => prev.filter(x => x.id !== b.id))}
          />
          );
        })}
        {/* Pop effect placeholder (could be extended) */}
      </div>
    </div>
  );
};

export default PopBubbles;
