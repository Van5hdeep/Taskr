import { useEffect, useRef } from "react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { createScope, createTimeline, onScroll, stagger, svg } from "animejs";
import { ArrowRight, Check, ChevronDown } from "../../lib/icons";
import BrandLogo from "../BrandLogo";
import { CATCHPHRASE_GLYPHS, CATCHPHRASE_VIEWBOX } from "./catchphrase";
import { addDemoToTimeline, FinanceDemo, FlowDemo, NotesDemo, StickerDemo } from "./FeatureDemos";
import { staged } from "./motion";

// Tile positions on the 64×64 Quad grid; tile 2 is the one that lifts off.
const TILES = [
  { x: 4, y: 4, spread: [-5, -5] },
  { x: 34, y: 4, spread: [5, -5] },
  { x: 4, y: 34, spread: [-5, 5] },
  { x: 34, y: 34, spread: [5, 5] },
];
const tick = ({ x, y }) => `M${x + 7} ${y + 13.5} L${x + 11.5} ${y + 18} L${x + 19.5} ${y + 9}`;

const FEATURES = [
  {
    id: "sticker",
    kicker: "Sticker",
    title: <>Every task on <em>one board.</em></>,
    body: "Write a sticker, colour it by urgency — red, blue or green — and check it off. Finished stickers rest on the Done board for a day, then clear themselves.",
    points: ["Red, blue, green: urgency at a glance", "Drag stickers anywhere", "A Done board that tidies itself"],
    Demo: StickerDemo,
  },
  {
    id: "finance",
    kicker: "Finance",
    title: <>Know what's <em>safe to spend.</em></>,
    body: "Track money in and out across your accounts, set budgets, and watch bills and savings goals. The graph shows where it's going before it's gone.",
    points: ["Accounts, budgets, bills and goals", "Spending trends you can read in a second", "Import a bank statement in one go"],
    Demo: FinanceDemo,
  },
  {
    id: "notes",
    kicker: "Workspace",
    title: <>Pages for <em>thinking out loud.</em></>,
    body: "Type, handwrite, highlight and drop in tables or shapes on clean A4 pages. Export to PDF when it's ready to share.",
    points: ["Pen and highlighter with real ink", "Tables that grow as you type", "Export to PDF or image"],
    Demo: NotesDemo,
  },
  {
    id: "flow",
    kicker: "Flow",
    title: <>Map it out, <em>then ship it.</em></>,
    body: "Drag blocks onto a canvas, connect them, and let Tidy up arrange the rest. Plans, processes and mind maps without the fuss.",
    points: ["Connect blocks by dragging", "One-click tidy layout", "Export to image, PDF or Mermaid"],
    Demo: FlowDemo,
  },
];

const prefersReducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** All landing motion is scroll-synced anime.js timelines, torn down on unmount. */
function useLandingMotion(rootRef) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root || prefersReducedMotion()) return undefined;

    // Measurements (the logo's centring offset) need the brand font loaded.
    let scope = null;
    let cancelled = false;
    document.fonts.ready.then(() => { if (!cancelled) scope = build(); });

    const build = () => createScope({ root }).add(() => {
      // ── Hero: tick the four tiles, bring in the word, form the logo ──
      const hero = root.querySelector("[data-hero]");
      const word = root.querySelector("[data-hero-word]");
      const mark = root.querySelector("[data-hero-mark]");
      const gap = parseFloat(getComputedStyle(word.parentElement).columnGap) || 0;
      const shift = (word.offsetWidth + gap) / 2;
      const tiles = [...root.querySelectorAll(".hero-tile")];
      const tileFaces = tiles.map((tile) => tile.querySelector("rect"));
      const ticks = svg.createDrawable(".hero-tick");

      const heroTl = staged(createTimeline({
        defaults: { ease: "inOutQuad" },
        autoplay: onScroll({ target: hero, enter: "top top", leave: "bottom bottom", sync: true }),
      }));
      heroTl
        .add("[data-hero-hint]", { opacity: [1, 0], translateY: [0, 12], duration: 80 }, 0)
        .add(mark, { translateX: [shift, shift], duration: 1 }, 0)
        .add(word, { opacity: [0, 0], duration: 1 }, 0)
        .add("[data-hero-after]", { opacity: [0, 0], duration: 1 }, 0);
      tiles.forEach((tile, i) => {
        const at = 90 + i * 110;
        heroTl
          .add(tile, { translateX: [TILES[i].spread[0], TILES[i].spread[0]], translateY: [TILES[i].spread[1], TILES[i].spread[1]], duration: 1 }, 0)
          .add(tileFaces[i], { fill: ["#e7e2d6", "#1c1b19"], duration: 100 }, at)
          .add(ticks[i], { draw: ["0 0", "0 1"], duration: 110 }, at + 40);
      });
      heroTl
        .add(tiles, { translateX: 0, translateY: 0, duration: 200 }, 560)
        .add(mark, { translateX: [shift, 0], duration: 200 }, 600)
        .add(word, { opacity: [0, 1], translateX: [60, 0], duration: 200, ease: "outQuad" }, 610)
        .add(ticks, { opacity: [1, 0], duration: 110 }, 720)
        .add(tiles[1], { rotate: [0, 12], duration: 110, ease: "outBack(2)" }, 800)
        .add("[data-hero-after]", { opacity: [0, 1], translateY: [24, 0], duration: 130, ease: "outQuad" }, 870);

      // ── Features: each demo builds up as it scrolls into view ──
      root.querySelectorAll("[data-feature]").forEach((section) => {
        const tl = staged(createTimeline({
          defaults: { ease: "outQuad" },
          autoplay: onScroll({ target: section, enter: "bottom top", leave: "top top", sync: true }),
        }));
        addDemoToTimeline(tl, section.dataset.feature, section);
        // A touch of parallax: the copy drifts slower than the demo.
        staged(createTimeline({ autoplay: onScroll({ target: section, enter: "bottom top", leave: "top bottom", sync: true }) }))
          .add(section.querySelector("[data-feature-copy]"), { translateY: [50, -50], duration: 1000, ease: "linear" }, 0);
      });

      // ── Catchphrase: outlines draw as you scroll, then fill in ──
      const phrase = root.querySelector("[data-phrase]");
      const glyphs = svg.createDrawable(".phrase-glyph");
      staged(createTimeline({
        defaults: { ease: "inOutSine" },
        autoplay: onScroll({ target: phrase, enter: "top top", leave: "bottom bottom", sync: true }),
      }))
        .add(glyphs, { draw: ["0 0", "0 1"], duration: 500, delay: stagger(28) }, 0)
        .add(".phrase-glyph", { fillOpacity: [0, 1], duration: 260, delay: stagger(14) }, 620)
        .add(".phrase-glyph", { strokeOpacity: [1, 0], duration: 160 }, 860)
        .add("[data-phrase-under]", { scaleX: [0, 1], duration: 160 }, 860);
    });

    return () => { cancelled = true; scope?.revert(); };
  }, [rootRef]);
}

/** Lenis smooth scrolling for the landing page only; the app keeps native scroll. */
function useSmoothScroll() {
  const lenisRef = useRef(null);
  useEffect(() => {
    if (prefersReducedMotion()) return undefined;
    const lenis = new Lenis({ lerp: 0.07, wheelMultiplier: 0.9, smoothWheel: true, autoRaf: true });
    lenisRef.current = lenis;
    return () => { lenis.destroy(); lenisRef.current = null; };
  }, []);
  return lenisRef;
}

export default function LandingPage({ onOpenAuth }) {
  const rootRef = useRef(null);
  const lenisRef = useSmoothScroll();
  useLandingMotion(rootRef);

  // Links like /#features arrive before the page renders; jump there once it has.
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id) return;
    document.fonts.ready.then(() => document.getElementById(id)?.scrollIntoView({ block: "start" }));
  }, []);
  const scrollTo = (target) => {
    const element = typeof target === "string" ? document.getElementById(target) : target;
    if (lenisRef.current) lenisRef.current.scrollTo(element ?? 0, { offset: -64, duration: 1.6 });
    else (element ? element.scrollIntoView({ behavior: "smooth" }) : window.scrollTo({ top: 0, behavior: "smooth" }));
  };

  return (
    <div ref={rootRef} className="landing min-h-screen bg-cream-50 text-stone-900 antialiased">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-stone-200/60 bg-cream-50/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <button type="button" onClick={() => scrollTo(0)} aria-label="taskr home"><BrandLogo size={22} markClassName="text-stone-900" /></button>
          <nav className="hidden items-center gap-8 text-sm text-stone-600 md:flex">
            <button type="button" onClick={() => scrollTo("features")} className="hover:text-stone-900">Features</button>
            <button type="button" onClick={() => scrollTo("fastr")} className="hover:text-stone-900">Why taskr</button>
          </nav>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => onOpenAuth("signin")} className="rounded-xl px-3 py-2 text-sm font-medium text-stone-700 hover:text-stone-950">Sign in</button>
            <button type="button" onClick={() => onOpenAuth("signup")} className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-800">Get started</button>
          </div>
        </div>
      </header>

      {/* Hero — pinned while the logo assembles */}
      <section data-hero className="relative h-[520vh]">
        <div className="sticky top-0 flex h-screen flex-col items-center justify-center overflow-hidden px-4">
          <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-300/30 blur-[120px]" />
          <div className="relative flex items-center gap-[clamp(14px,2.4vw,30px)]">
            <svg data-hero-mark viewBox="0 0 64 64" className="h-[clamp(96px,16vw,184px)] w-[clamp(96px,16vw,184px)] shrink-0 overflow-visible" fill="#1c1b19" aria-hidden>
              {TILES.map((tile, i) => (
                <g key={i} className={`hero-tile ${i === 1 ? "hero-tile-lift" : ""}`} style={{ transformBox: "fill-box", transformOrigin: "center" }}>
                  <rect x={tile.x} y={tile.y} width="26" height="26" rx="7" />
                  <path className="hero-tick" d={tick(tile)} fill="none" stroke="#ffc71d" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
                </g>
              ))}
            </svg>
            <span data-hero-word className="font-brand text-[clamp(76px,15vw,180px)] font-semibold leading-none tracking-[-0.06em]">taskr</span>
          </div>


          <h1 className="sr-only">taskr — stickers, money, notes and flows in one place</h1>
          <div data-hero-after className="absolute bottom-[14vh] flex flex-col items-center px-4 text-center">
            <div className="flex flex-wrap justify-center gap-3">
              <button type="button" onClick={() => onOpenAuth("signup")} className="inline-flex items-center gap-2 rounded-xl bg-stone-900 px-5 py-3 text-sm font-semibold text-white hover:bg-stone-800">Start for free <ArrowRight className="h-4 w-4" /></button>
              <button type="button" onClick={() => scrollTo("features")} className="rounded-xl border border-stone-300 bg-white/70 px-5 py-3 text-sm font-semibold text-stone-800 hover:bg-white">See how it works</button>
            </div>
          </div>

          <button type="button" data-hero-hint onClick={() => scrollTo("features")} className="absolute bottom-8 flex flex-col items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-400">
            Scroll <ChevronDown className="h-4 w-4 animate-bounce" />
          </button>
        </div>
      </section>

      {/* Features */}
      <div id="features" className="mx-auto max-w-6xl scroll-mt-16 px-4 sm:px-6">
        <div className="mx-auto max-w-2xl pb-6 pt-24 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Inside taskr</p>
          <h2 className="mt-4 text-[clamp(32px,4.6vw,56px)] font-medium leading-[1.05] tracking-[-0.04em]">Everything you juggle, <em className="font-display font-normal italic">in one place.</em></h2>
        </div>
        {FEATURES.map(({ id, kicker, title, body, points, Demo }, index) => (
          <section key={id} id={`feature-${id}`} data-feature={id} className="grid min-h-[110vh] items-center gap-10 py-24 md:grid-cols-2 md:gap-16 lg:py-32">
            <div data-feature-copy className={index % 2 ? "md:order-2" : ""}>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">{String(index + 1).padStart(2, "0")} · {kicker}</p>
              <h3 className="mt-4 text-[clamp(30px,3.8vw,48px)] font-medium leading-[1.05] tracking-[-0.04em] [&_em]:font-display [&_em]:font-normal [&_em]:italic">{title}</h3>
              <p className="mt-5 max-w-md text-[15px] leading-relaxed text-stone-600">{body}</p>
              <ul className="mt-6 space-y-2.5">
                {points.map((point) => (
                  <li key={point} className="flex items-center gap-2.5 text-sm font-medium text-stone-700">
                    <span className="flex h-5 w-5 items-center justify-center rounded-md bg-stone-900 text-amber-400"><Check className="h-3 w-3" strokeWidth={3} /></span>{point}
                  </li>
                ))}
              </ul>
            </div>
            <div className={`relative ${index % 2 ? "md:order-1" : ""}`}>
              <div aria-hidden className="absolute -inset-6 rounded-[40px] bg-gradient-to-br from-amber-200/50 via-cream-100 to-transparent" />
              <div className="relative"><Demo /></div>
            </div>
          </section>
        ))}
      </div>

      {/* Catchphrase — drawn as you scroll */}
      <section id="fastr" data-phrase className="relative h-[380vh] scroll-mt-16">
        <div className="sticky top-0 flex h-screen flex-col items-center justify-center overflow-hidden bg-stone-900 px-4 text-white">
          <div aria-hidden className="pointer-events-none absolute -bottom-40 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-amber-400/20 blur-[120px]" />
          <svg viewBox={CATCHPHRASE_VIEWBOX} className="relative w-[min(92vw,900px)] overflow-visible" role="img" aria-label="do it fastr with taskr">
            {CATCHPHRASE_GLYPHS.map((glyph, i) => (
              <path key={i} className="phrase-glyph" d={glyph.d} fill={glyph.accent ? "#ffc71d" : "#fbf9f4"} stroke={glyph.accent ? "#ffc71d" : "#fbf9f4"} strokeWidth="1.6" strokeLinejoin="round" />
            ))}
          </svg>
          <span data-phrase-under aria-hidden className="relative mt-6 block h-1.5 w-40 origin-left rounded-full bg-amber-400" />
          <p className="relative mt-8 max-w-md text-center text-[15px] text-stone-400">Less switching between apps. More getting things off your list.</p>
        </div>
      </section>

      {/* Call to action */}
      <section className="px-4 py-28 sm:px-6">
        <div className="mx-auto flex max-w-5xl flex-col items-center rounded-[32px] border border-stone-200/80 bg-white px-6 py-16 text-center shadow-[0_30px_80px_-40px_rgba(28,27,25,0.35)]">
          <BrandLogo size={40} markClassName="text-stone-900" />
          <h2 className="mt-8 max-w-xl text-[clamp(30px,4vw,48px)] font-medium leading-[1.05] tracking-[-0.04em]">Clear your head. <em className="font-display font-normal italic">Start today.</em></h2>
          <p className="mt-4 max-w-md text-[15px] text-stone-600">Free to use. Try it as a guest in one click — no email needed until you want to keep your work.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button type="button" onClick={() => onOpenAuth("signup")} className="inline-flex items-center gap-2 rounded-xl bg-stone-900 px-5 py-3 text-sm font-semibold text-white hover:bg-stone-800">Create your space <ArrowRight className="h-4 w-4" /></button>
            <button type="button" onClick={() => onOpenAuth("signin")} className="rounded-xl border border-stone-300 px-5 py-3 text-sm font-semibold text-stone-800 hover:bg-stone-50">I have an account</button>
          </div>
        </div>
      </section>

      <footer className="border-t border-stone-200/70">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-stone-500 sm:flex-row sm:px-6">
          <BrandLogo size={18} markClassName="text-stone-900" wordClassName="text-stone-900" />
          <p>© {new Date().getFullYear()} taskr · Sticker · Finance · Workspace · Flow</p>
        </div>
      </footer>
    </div>
  );
}
