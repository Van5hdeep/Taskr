# 09 — Ink engine: smooth, beautiful handwriting

Status: **implemented** (InkCanvas + ink/render.js + ink/input.js; Excalidraw removed). Needs tuning on a real stylus/touch device.

## Why it feels bad today

The handwriting layer is Excalidraw's freedraw tool, hidden behind taskr's toolbar (`InkLayer.jsx`). It is a whiteboard tool, not a note-taking pen:

| Symptom | Cause |
|---|---|
| Strokes dull / not following the hand | Excalidraw simplifies and re-fits points; pressure is simulated from speed, not read from the stylus; no prediction, so ink trails the nib |
| No palm rejection | Excalidraw treats every pointer type the same; a resting palm draws or erases |
| No pinch / stylus zoom | Zoom is ours (Ctrl+wheel, slider); the ink layer is pinned (`scrollX/Y=0`) and fights gestures |
| Eraser shadow offset (fixed) | Excalidraw's SVG trail layer assumes a viewport-origin container |
| Needs wrappers/hacks | `startAutoInk` re-dispatches a synthetic pointerdown; offsets refreshed on scroll/resize |

Every fix so far patches around a library that is doing a different job. Recommendation: **replace Excalidraw's ink with our own small canvas ink engine**, keep the stored data format.

## Research summary

- **perfect-freehand** (MIT, 1.2.3, by the tldraw author): turns input points `[x, y, pressure]` into a smooth variable-width outline polygon. Real stylus pressure via `simulatePressure: false`; tuning via `size`, `thinning`, `smoothing`, `streamline`, `easing`, tapers. This is the "beautiful stroke" part. Known "hot elbows" on very fast turns → mitigate by pre-smoothing input (below).
- **Pointer Events L3**: `getCoalescedEvents()` returns every sample the browser merged into one `pointermove` (essential for accurate fast handwriting); `getPredictedEvents()` gives estimated next positions to draw ahead and cut perceived latency (draw as a temporary overlay, discard when real points arrive).
- **Canvas `desynchronized: true`** context hint: lets the browser bypass the compositor queue for lower ink latency where supported (progressive enhancement).
- **Palm rejection on the web**: no OS-level flag exposed. Standard in-app approach (Miro, Excalidraw forks): once a `pointerType === "pen"` event has been seen, ignore `touch` for drawing (touch is then pan/zoom only); while a pen is hovering/down, ignore touches entirely; ignore touches with large `width/height` contact areas. Plus `touch-action: none` on the canvas so the browser doesn't scroll/zoom itself.
- **Gestures**: two-finger pinch/pan implemented from pointer events (track active touch pointers; distance ratio → zoom, midpoint delta → scroll). Optionally `@use-gesture/react` (MIT, 10.3.1) — only if hand-rolling gets fiddly.

## Proposed design

1. **New `InkCanvas` replaces `InkLayer`** (`src/features/workspace/editor/ink/`):
   - One `<canvas>` over the page stack, device-pixel-ratio aware, rendered at the current zoom (crisp when zoomed).
   - Committed strokes drawn from cached `Path2D` outlines; the live stroke redrawn each animation frame on a separate top canvas (cheap, low latency).
   - Input pipeline: coalesced samples → light **One-Euro / EMA filter** (kills jitter and hot elbows) → perfect-freehand outline. Predicted points appended to the live stroke only for display.
   - Pen: real pressure; mouse: simulated pressure; touch (when no pen has been seen): allowed to draw on devices without a stylus.
   - Pen/Highlighter/Eraser, colour, width: unchanged toolbar; highlighter uses `multiply` blend, flat caps.
   - Eraser: stroke-level hit test along the pointer path (geometry already exists in `geometry.js` for rects; add segment–distance), hover cursor stays as today.
2. **Data stays compatible**: strokes keep the Excalidraw `freedraw` element shape (`points`, `pressures`, `strokeWidth`, `strokeColor`, `opacity`, `x`, `y`) so saved documents, `model.js` migration, undo/redo (`commitInk`), and exports (`exportPages.js`) keep working with no migration. Exports render the same outlines.
3. **Zoom & gestures** (owned by `DocumentEditor`, which already holds `zoom`):
   - Two fingers: pinch to zoom around the midpoint, drag to pan.
   - Stylus: press-and-hold (~450 ms, barely moving) on the page opens a small floating zoom bar at the nib — `−  100%  +`, Fit, close — zooming around that point; dismisses on tap elsewhere or after idle. Hover with a stylus does nothing extra.
   - Existing: Ctrl+wheel and the bottom slider stay.
4. **Always-armed pen** (already started): a stylus down on empty page starts ink with no tool click — now native to the new canvas, so the synthetic-event hack (`startAutoInk`) and the 1/zoom wrapper offset hacks are deleted.
5. **Bundle win**: dropping `@excalidraw/excalidraw` removes a very large dependency and its CSS (the editor only uses it for ink).

## Dependencies

| Package | Why | Cost |
|---|---|---|
| `perfect-freehand` | stroke outline generation | ~3 kB, MIT |
| `@use-gesture/react` | optional, only if pinch/pan by hand proves flaky | ~12 kB, MIT |
| remove `@excalidraw/excalidraw` | no longer needed after cut-over | −MBs |

No other libraries needed; filter and palm-rejection logic are small enough to own.

## Steps

1. Install `perfect-freehand`; build `InkCanvas` with pen/highlighter drawing + commit via existing `commitInk`; render existing freedraw elements. Side-by-side behind a flag in the dev playground.
2. Input quality: coalesced events, filter, prediction, pressure; tune options on a real stylus.
3. Palm rejection state machine + `touch-action: none`.
4. Eraser (stroke hit-test) + hover cursor.
5. Pinch/pan zoom, then the stylus long-press zoom bar.
6. Exports and migration check against saved documents; delete `InkLayer`/Excalidraw; update tests (`model.test.js`, new geometry tests).

## Risks / open questions

- Needs a real stylus + touch device to tune feel; browser-pane testing can only cover mouse. Pick a test device.
- `desynchronized` and `getPredictedEvents` are Chromium-first; Safari falls back to normal rendering (still smooth, slightly more latency).
- Existing strokes were drawn with Excalidraw's own point reduction; they will render with perfect-freehand shapes (slightly different look, same position).

## Decision needed

Go ahead with replacing Excalidraw ink (recommended), or keep Excalidraw and only add palm rejection + pinch zoom on top (cheaper, but strokes stay dull).
