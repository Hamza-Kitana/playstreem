import { useEffect, useRef } from "react";

type P = {
  x: number;
  y: number;
  z: number;
  r: number;
  hue: number;
};

/**
 * Animated 3D-ish starfield + grid horizon rendered on canvas.
 * Reacts to scroll (depth speed) and pointer (parallax).
 */
export default function Background3D() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0;
    let h = 0;
    let dpr = 1;
    const particles: P[] = [];
    const COUNT = 220;
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    let scrollFactor = 0;
    let raf = 0;
    let t = 0;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const spawn = (): P => ({
      x: (Math.random() - 0.5) * 2,
      y: (Math.random() - 0.5) * 2,
      z: Math.random(),
      r: 0.6 + Math.random() * 2.2,
      hue: Math.random() < 0.65 ? 145 + Math.random() * 35 : 175 + Math.random() * 30,
    });

    for (let i = 0; i < COUNT; i++) particles.push(spawn());

    const onMove = (e: PointerEvent) => {
      pointer.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      pointer.ty = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    const onScroll = () => {
      const max = Math.max(document.body.scrollHeight - window.innerHeight, 1);
      scrollFactor = Math.min(window.scrollY / max, 1);
    };

    const draw = () => {
      t += 0.006;
      pointer.x += (pointer.tx - pointer.x) * 0.05;
      pointer.y += (pointer.ty - pointer.y) * 0.05;

      ctx.clearRect(0, 0, w, h);

      // nebula blobs
      const blobs = [
        { x: 0.2 + Math.sin(t) * 0.05, y: 0.25 + Math.cos(t * 0.8) * 0.05, c: "155" },
        { x: 0.8 + Math.cos(t * 0.7) * 0.05, y: 0.7 + Math.sin(t * 1.1) * 0.05, c: "175" },
        { x: 0.55 + Math.sin(t * 1.3) * 0.08, y: 0.15 + Math.cos(t) * 0.04, c: "140" },
      ];
      for (const b of blobs) {
        const cx = b.x * w + pointer.x * 40;
        const cy = b.y * h + pointer.y * 40 - scrollFactor * 120;
        const rad = Math.max(w, h) * 0.42;
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
        g.addColorStop(0, `hsla(${b.c}, 90%, 55%, 0.20)`);
        g.addColorStop(1, "hsla(0, 0%, 0%, 0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      }

      // perspective grid
      const horizon = h * 0.72 - scrollFactor * 60;
      ctx.strokeStyle = "hsla(160, 90%, 60%, 0.13)";
      ctx.lineWidth = 1;
      for (let i = 1; i <= 18; i++) {
        const p = i / 18;
        const y = horizon + Math.pow(p, 2.4) * (h - horizon) * 1.4;
        const offset = ((t * 26) % 20) * (p * 0.6);
        ctx.beginPath();
        ctx.moveTo(0, y + offset);
        ctx.lineTo(w, y + offset);
        ctx.stroke();
      }
      ctx.strokeStyle = "hsla(180, 80%, 60%, 0.1)";
      for (let i = -12; i <= 12; i++) {
        const x = w / 2 + i * (w / 14) + pointer.x * 30;
        ctx.beginPath();
        ctx.moveTo(w / 2 + pointer.x * 12, horizon);
        ctx.lineTo(x * 2 - w / 2, h);
        ctx.stroke();
      }

      // depth particles
      const speed = reduce ? 0.0009 : 0.0022 + scrollFactor * 0.006;
      for (const p of particles) {
        p.z -= speed;
        if (p.z <= 0.02) {
          Object.assign(p, spawn());
          p.z = 1;
        }
        const k = 0.55 / p.z;
        const x = w / 2 + p.x * k * w * 0.55 + pointer.x * (1 - p.z) * 70;
        const y = h / 2 + p.y * k * h * 0.55 + pointer.y * (1 - p.z) * 70;
        if (x < -50 || x > w + 50 || y < -50 || y > h + 50) continue;
        const size = p.r * k * 0.9;
        const alpha = Math.min((1 - p.z) * 0.9, 0.75);
        ctx.beginPath();
        ctx.fillStyle = `hsla(${p.hue}, 95%, 68%, ${alpha})`;
        ctx.shadowBlur = 12;
        ctx.shadowColor = `hsla(${p.hue}, 95%, 65%, ${alpha})`;
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      raf = requestAnimationFrame(draw);
    };

    resize();
    onScroll();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 -z-10">
      <div className="absolute inset-0 bg-background" />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full opacity-35" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,transparent_35%,var(--background)_92%)]" />
    </div>
  );
}
