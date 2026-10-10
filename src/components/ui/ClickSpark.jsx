import { useEffect, useRef } from "react";

/** Canvas particle burst on click (decorative). */
export default function ClickSpark({
  children,
  sparkColor = "#2563eb",
  sparkCount = 10,
  duration = 400,
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const sparksRef = useRef([]);
  const frameRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const ctx = canvas.getContext("2d");
    const parseHex = (hex) => {
      const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return match
        ? { r: parseInt(match[1], 16), g: parseInt(match[2], 16), b: parseInt(match[3], 16) }
        : { r: 37, g: 99, b: 235 };
    };
    const rgb = parseHex(sparkColor);

    const resize = () => {
      const { width, height } = container.getBoundingClientRect();
      canvas.width = width;
      canvas.height = height;
    };

    const ro = new ResizeObserver(resize);
    ro.observe(container);
    resize();

    const onClick = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      for (let i = 0; i < sparkCount; i++) {
        const angle = (Math.PI * 2 * i) / sparkCount + Math.random() * 0.4;
        const speed = 1.8 + Math.random() * 3.5;
        sparksRef.current.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: duration,
          maxLife: duration,
        });
      }
    };

    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      sparksRef.current = sparksRef.current.filter((s) => {
        s.x += s.vx;
        s.y += s.vy;
        s.vy += 0.04;
        s.life -= 16;
        const alpha = Math.max(0, s.life / s.maxLife);
        ctx.beginPath();
        ctx.arc(s.x, s.y, 2.2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`;
        ctx.fill();
        return s.life > 0;
      });
      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
    container.addEventListener("click", onClick);
    return () => {
      ro.disconnect();
      container.removeEventListener("click", onClick);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [sparkColor, sparkCount, duration]);

  return (
    <div ref={containerRef} className="relative min-h-full">
      {children}
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 z-[60]" aria-hidden />
    </div>
  );
}
