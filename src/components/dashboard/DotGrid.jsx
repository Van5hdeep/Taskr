import { useEffect, useRef } from "react";

export default function DotGrid({ dark }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    
    let animationFrameId;
    let width = 0;
    let height = 0;
    let particles = [];
    
    const spacing = 35; // Grid spacing
    
    const init = () => {
      const rect = canvas.parentElement.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = width * window.devicePixelRatio;
      canvas.height = height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      
      particles = [];
      for (let x = 0; x < width + spacing; x += spacing) {
        for (let y = 0; y < height + spacing; y += spacing) {
          particles.push({
            x,
            y,
            baseX: x,
            baseY: y,
            angle: Math.random() * Math.PI * 2,
            speed: 0.003 + Math.random() * 0.005,
          });
        }
      }
    };
    
    const ro = new ResizeObserver(init);
    ro.observe(canvas.parentElement);
    init();
    
    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      
      // Dots are glowing blue
      ctx.fillStyle = dark ? "rgba(96, 165, 250, 0.4)" : "rgba(59, 130, 246, 0.4)";
      
      particles.forEach((p) => {
        p.angle += p.speed;
        // subtle movement
        p.x = p.baseX + Math.cos(p.angle) * 4;
        p.y = p.baseY + Math.sin(p.angle) * 4;
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.2, 0, Math.PI * 2);
        ctx.fill();
      });
      
      animationFrameId = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      ro.disconnect();
      cancelAnimationFrame(animationFrameId);
    };
  }, [dark]);

  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none rounded-[2.5rem]">
      {/* Background gradient: white to soft blue */}
      <div className={`absolute inset-0 ${dark ? "bg-gradient-to-br from-[#0a0f24] to-blue-950/40" : "bg-gradient-to-br from-white to-blue-50"}`} />
      
      {/* Canvas for animated dots */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-60" style={{ filter: "drop-shadow(0 0 2px rgba(59,130,246,0.3))" }} />
      
      {/* Fade out edges */}
      <div className={`absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,${dark ? "#0a0f24" : "white"}_100%)]`} />
    </div>
  );
}
