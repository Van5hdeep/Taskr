/**
 * Two items of one kind never share a name: a taken name gets "(1)", "(2)"… appended,
 * silently. Comparison ignores case and surrounding spaces; `taken` excludes the item itself.
 */
export function uniqueTitle(wanted, taken) {
  const key = (value) => value.trim().toLowerCase();
  const used = new Set(taken.map(key));
  const title = wanted.trim();
  if (!used.has(key(title))) return title;
  const base = title.replace(/\s*\(\d+\)$/, "");
  for (let n = 1; ; n += 1) {
    const candidate = `${base}(${n})`;
    if (!used.has(key(candidate))) return candidate;
  }
}
