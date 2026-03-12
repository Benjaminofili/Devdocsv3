import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  decay: number;
  shape: 'square' | 'circle';
}

const COLORS = [
  '#6366f1', '#818cf8', '#a78bfa', '#8b5cf6',
  '#10b981', '#34d399', '#f59e0b', '#f472b6',
  '#60a5fa', '#c084fc',
];

/**
 * Lightweight canvas-based confetti burst.
 * Renders once on mount and auto-cleans up.
 */
export function Confetti({ particleCount = 80 }: { particleCount?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.scale(dpr, dpr);
    };
    resize();

    const cx = window.innerWidth / 2;
    const cy = window.innerHeight * 0.35;

    const particles: Particle[] = Array.from({ length: particleCount }, () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = 4 + Math.random() * 8;
      return {
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed * (0.6 + Math.random()),
        vy: Math.sin(angle) * speed * (0.6 + Math.random()) - 3,
        size: 4 + Math.random() * 4,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 12,
        opacity: 1,
        decay: 0.012 + Math.random() * 0.008,
        shape: Math.random() > 0.5 ? 'square' : 'circle',
      };
    });

    let raf: number;
    const animate = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      let alive = 0;

      for (const p of particles) {
        if (p.opacity <= 0) continue;
        alive++;

        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.18; // gravity
        p.vx *= 0.99;
        p.rotation += p.rotationSpeed;
        p.opacity -= p.decay;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.fillStyle = p.color;

        if (p.shape === 'square') {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      if (alive > 0) {
        raf = requestAnimationFrame(animate);
      }
    };

    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [particleCount]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-50 pointer-events-none"
      aria-hidden="true"
    />
  );
}
