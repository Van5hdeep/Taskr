// Shared pen/touch state for palm rejection. A resting palm reports as a touch
// while the stylus is in range, so touches are ignored around pen activity.
const state = { penSeen: false, penDown: 0, lastPenAt: 0 };
const PEN_QUIET_MS = 700;
const PALM_SIZE = 36; // CSS px contact width/height that is a palm, not a fingertip

export function trackPen() {
  const onEvent = (event) => {
    if (event.pointerType !== "pen") return;
    state.penSeen = true;
    state.lastPenAt = performance.now();
    if (event.type === "pointerdown") state.penDown += 1;
    if ((event.type === "pointerup" || event.type === "pointercancel") && state.penDown > 0) state.penDown -= 1;
  };
  const types = ["pointerdown", "pointermove", "pointerup", "pointercancel", "pointerover"];
  for (const type of types) window.addEventListener(type, onEvent, true);
  return () => { for (const type of types) window.removeEventListener(type, onEvent, true); };
}

/** True for touches that must be ignored entirely (palm, or a hand near the stylus). */
export function touchRejected(event) {
  if (event.pointerType !== "touch") return false;
  if (state.penDown > 0 || performance.now() - state.lastPenAt < PEN_QUIET_MS) return true;
  return Math.max(event.width || 0, event.height || 0) >= PALM_SIZE;
}

/** Fingers write only when no stylus has ever been seen; otherwise they pan and zoom. */
export const touchMayDraw = (event) => event.pointerType === "touch" && !state.penSeen && !touchRejected(event);
