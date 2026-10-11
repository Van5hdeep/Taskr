/**
 * The taskr "Quad" mark: four tiles for the four tools, one lifting off like a
 * finished sticker. Drawn in currentColor on a 64×64 grid so it can be
 * recoloured, resized and animated part by part (classes `quad-tile-*`).
 */
export function QuadMark({ className = "", title, style }) {
  return (
    <svg viewBox="0 0 64 64" fill="currentColor" className={className} style={style} role={title ? "img" : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
      <rect className="quad-tile quad-tile-1" x="4" y="4" width="26" height="26" rx="7" />
      <g transform="rotate(12 47 17)"><rect className="quad-tile quad-tile-2" x="34" y="4" width="26" height="26" rx="7" /></g>
      <rect className="quad-tile quad-tile-3" x="4" y="34" width="26" height="26" rx="7" />
      <rect className="quad-tile quad-tile-4" x="34" y="34" width="26" height="26" rx="7" />
    </svg>
  );
}

/** Mark + "taskr" wordmark. `size` sets the mark height in px; the word scales with it. */
export default function BrandLogo({ className = "", size = 26, markClassName = "", wordClassName = "" }) {
  return (
    <span className={`inline-flex items-center ${className}`} style={{ gap: size * 0.38 }} aria-label="taskr" role="img">
      <QuadMark className={markClassName} style={{ width: size, height: size }} />
      <span className={`font-brand font-semibold leading-none tracking-[-0.045em] ${wordClassName}`} style={{ fontSize: size * 0.98 }} aria-hidden>taskr</span>
    </span>
  );
}
