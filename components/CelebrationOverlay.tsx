import React, { useEffect, useRef, useState } from 'react';

type Props = {
  durationMs?: number; // total animation time
  intensity?: 'subtle' | 'festive';
};

// Elegant overlay: validation ring + star-dust, covers whole viewport.
// Drawn on a single canvas for performance; pointer-events: none.
const CelebrationOverlay: React.FC<Props> = ({ durationMs = 3000, intensity = 'subtle' }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize handling
    const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
    const resize = () => {
      const { innerWidth: w, innerHeight: h } = window;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    // Particles (star dust)
    const count = intensity === 'festive' ? 340 : 140;
    const colors = ['#FDE047','#60A5FA','#34D399','#F472B6','#F97316','#A78BFA','#EAB308','#22D3EE','#FB7185'];
    type Shape = 'dot' | 'star' | 'rect';
    type Particle = { x: number; y: number; vx: number; vy: number; life: number; size: number; twinkle: number; shape: Shape; rot: number; vr: number; color: string };
    const parts: Particle[] = [];
    const cx = () => window.innerWidth / 2;
    const cy = () => window.innerHeight / 3; // slightly above center
    const burstPortion = intensity === 'festive' ? 0.65 : 0.5;
    for (let i = 0; i < count; i++) {
      const isBurst = i / count < burstPortion;
      const ang = Math.random() * Math.PI * 2;
      const speed = isBurst ? (1.2 + Math.random() * 3.2) : (0.3 + Math.random() * 1.0);
      const shapeRand = Math.random();
      const shape: Shape = shapeRand < 0.5 ? 'dot' : shapeRand < 0.8 ? 'star' : 'rect';
      const size = shape === 'rect' ? (Math.random() * 2.5 + 1.5) : (Math.random() * 2.0 + 1.0);
      parts.push({
        x: isBurst ? cx() + (Math.random() - 0.5) * 16 : Math.random() * window.innerWidth,
        y: isBurst ? cy() + (Math.random() - 0.5) * 16 : Math.random() * window.innerHeight,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed - (isBurst ? 0.6 : 0.2),
        life: 0.55 + Math.random() * 0.9,
        size,
        twinkle: Math.random() * Math.PI * 2,
        shape,
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.1,
        color: colors[(Math.random() * colors.length) | 0],
      });
    }

    const animate = (t: number) => {
      if (startRef.current == null) startRef.current = t;
      const elapsed = t - startRef.current;
      const progress = Math.min(1, elapsed / durationMs);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw star dust (more festive)
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        // Update
        p.x += p.vx;
        p.y += p.vy;
        // gentle gravity + drag
        p.vy += 0.01;
        p.vx *= 0.995;
        p.vy *= 0.995;
        p.rot += p.vr;
        // Twinkle alpha
        const alpha = 0.25 + 0.75 * Math.abs(Math.sin((progress * 8) + p.twinkle));
        // Fade out toward the end
        const lifeFade = progress < p.life ? 1 : Math.max(0, 1 - (progress - p.life) * 2);
        const a = alpha * lifeFade * (intensity === 'festive' ? 1.0 : 0.75);

        ctx.globalAlpha = a;
        ctx.fillStyle = p.color;
        ctx.strokeStyle = p.color;

        if (p.shape === 'dot') {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.shape === 'star') {
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(p.x - p.size * 1.8, p.y);
          ctx.lineTo(p.x + p.size * 1.8, p.y);
          ctx.moveTo(p.x, p.y - p.size * 1.8);
          ctx.lineTo(p.x, p.y + p.size * 1.8);
          ctx.stroke();
        } else {
          // rect confetti with rotation
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillRect(-p.size, -p.size * 0.6, p.size * 2, p.size * 1.2);
          ctx.restore();
        }
      }
      // No validation ring: particles only (more festive)

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        // Stop and mark done shortly after to allow last frame to display
        setTimeout(() => setDone(true), 50);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [durationMs, intensity]);

  if (done) return null;
  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-[60] pointer-events-none"
      aria-hidden="true"
    />
  );
};

export default CelebrationOverlay;
