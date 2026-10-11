/**
 * Wraps an anime.js timeline so every `add()` also pins its "from" values at
 * time 0. Scroll-synced timelines can start anywhere, and tweens that begin
 * later would otherwise show their end state until the scroll reaches them.
 */
export function staged(tl) {
  const api = {
    timeline: tl,
    add(targets, params, position) {
      const initial = {};
      for (const [key, value] of Object.entries(params)) {
        if (Array.isArray(value)) initial[key] = value[0];
      }
      if (Object.keys(initial).length) tl.set(targets, initial, 0);
      tl.add(targets, params, position);
      return api;
    },
  };
  return api;
}
