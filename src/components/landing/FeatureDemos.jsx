import { svg, stagger, utils } from "animejs";

/**
 * Four small, product-true demos used on the landing page (scroll-animated)
 * and in Settings → About (static). Each renders its finished state by
 * default; `addDemoToTimeline` animates it from empty when given a timeline.
 */

function Window({ title, children, className = "" }) {
  return (
    <div className={`overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-[0_24px_60px_-28px_rgba(28,27,25,0.35)] ${className}`}>
      <div className="flex h-10 items-center gap-2 border-b border-stone-100 px-4">
        <span className="flex gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-stone-200" /><i className="h-2.5 w-2.5 rounded-full bg-stone-200" /><i className="h-2.5 w-2.5 rounded-full bg-stone-200" /></span>
        <span className="ml-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-400">{title}</span>
      </div>
      {children}
    </div>
  );
}

const STICKERS = [
  { title: "Pay rent", label: "Urgent", tone: "bg-red-50 border-red-200 text-red-950", tape: "bg-red-500", x: "6%", y: "12%", r: -3 },
  { title: "Call the bank", label: "Soon", tone: "bg-blue-50 border-blue-200 text-blue-950", tape: "bg-blue-500", x: "52%", y: "8%", r: 2 },
  { title: "Book flights", label: "Can wait", tone: "bg-emerald-50 border-emerald-200 text-emerald-950", tape: "bg-emerald-500", x: "10%", y: "56%", r: 2 },
  { title: "Gym at 7", label: "Soon", tone: "bg-blue-50 border-blue-200 text-blue-950", tape: "bg-blue-500", x: "54%", y: "54%", r: -2 },
];

export function StickerDemo() {
  return (
    <Window title="Sticker board" className="demo-sticker">
      <div className="relative h-[300px] bg-cream-50 [background-image:radial-gradient(#d6d3d1_1px,transparent_1px)] [background-size:18px_18px]">
        {STICKERS.map((sticker, index) => (
          <div key={sticker.title} className={`demo-st absolute w-[40%] rounded-xl border p-3 pt-4 shadow-[0_8px_18px_-8px_rgba(0,0,0,0.25)] ${sticker.tone}`} style={{ left: sticker.x, top: sticker.y, rotate: `${sticker.r}deg` }} data-i={index}>
            <span className={`absolute left-1/2 top-0 h-1.5 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full ${sticker.tape}`} />
            <p className="text-[9px] font-bold uppercase tracking-wider opacity-60">{sticker.label}</p>
            <p className="mt-1 text-sm font-semibold leading-tight">{sticker.title}</p>
            <div className="mt-3 flex justify-end">
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ring-black/5 ${index === 0 ? "demo-st-check bg-emerald-500 text-white" : "bg-white/80 text-stone-700"}`}>✓ Done</span>
            </div>
          </div>
        ))}
        <div className="demo-st-done absolute bottom-3 right-3 rounded-full bg-stone-900 px-3 py-1 text-[11px] font-semibold text-white">Done today · <span className="demo-st-count">1</span></div>
      </div>
    </Window>
  );
}

const CHART = "M0 92 C30 88 45 70 70 72 C95 74 110 52 140 50 C170 48 185 60 210 40 C235 22 255 30 280 18 C300 10 310 12 320 8";

export function FinanceDemo() {
  return (
    <Window title="Finance" className="demo-finance">
      <div className="p-5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] text-stone-500">Safe to spend this month</p>
            <p className="font-brand text-3xl font-semibold tracking-tight text-stone-900">₹<span className="demo-fin-amount">42,800</span></p>
          </div>
          <span className="demo-fin-chip rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">+12% vs last month</span>
        </div>
        <svg viewBox="0 0 320 100" className="mt-4 h-28 w-full overflow-visible" preserveAspectRatio="none">
          <defs>
            <linearGradient id="demo-fin-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#ffc71d" stopOpacity=".45" /><stop offset="1" stopColor="#ffc71d" stopOpacity="0" /></linearGradient>
          </defs>
          {[25, 50, 75].map((y) => <line key={y} x1="0" x2="320" y1={y} y2={y} stroke="#f0ede6" strokeWidth="1" />)}
          <path className="demo-fin-area" d={`${CHART} L320 100 L0 100 Z`} fill="url(#demo-fin-fill)" />
          <path className="demo-fin-line" d={CHART} fill="none" stroke="#1c1b19" strokeWidth="2.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        </svg>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {[["Food", "68%", "bg-amber-400"], ["Rent", "100%", "bg-stone-900"], ["Fun", "34%", "bg-emerald-500"]].map(([label, width, color]) => (
            <div key={label} className="rounded-xl border border-stone-100 p-2.5">
              <p className="text-[10px] text-stone-500">{label}</p>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-stone-100"><div className={`demo-fin-bar h-full origin-left rounded-full ${color}`} style={{ width }} /></div>
            </div>
          ))}
        </div>
      </div>
    </Window>
  );
}

export function NotesDemo() {
  return (
    <Window title="Workspace" className="demo-notes">
      <div className="bg-stone-100 p-5">
        <div className="relative mx-auto aspect-[1/1.1] max-w-[290px] bg-white p-6 shadow-sm [background-image:repeating-linear-gradient(to_bottom,transparent_0,transparent_23px,#e7e5e4_23px,#e7e5e4_24px)] [background-position:0_52px]">
          <p className="demo-note-title overflow-hidden whitespace-nowrap font-brand text-lg font-semibold text-stone-900">Launch plan ✏️</p>
          <div className="mt-4 space-y-3">
            {["88%", "72%", "80%", "54%"].map((width, i) => <div key={i} className="demo-note-line h-2 origin-left rounded-full bg-stone-300/70" style={{ width }} />)}
          </div>
          <div className="demo-note-hl absolute left-6 top-[92px] h-4 w-[46%] origin-left rounded-sm bg-amber-300/60 mix-blend-multiply" />
          <svg viewBox="0 0 200 70" className="absolute bottom-6 left-5 w-[70%] overflow-visible">
            <path className="demo-note-ink" d="M4 40 C18 10 30 12 32 38 C34 60 48 58 56 30 C62 12 70 14 72 36 C74 56 92 54 98 32 C102 18 112 18 116 34 L124 52 L148 14" fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div className="demo-note-table absolute bottom-6 right-5 grid w-[34%] grid-cols-2 border border-stone-400 text-[8px] text-stone-600">
            {["Task", "Who", "Copy", "Me", "Ads", "Sam"].map((cell, i) => <span key={i} className="border border-stone-300 px-1 py-0.5">{cell}</span>)}
          </div>
        </div>
      </div>
    </Window>
  );
}

const NODES = [
  { id: "a", label: "Idea", x: 8, y: 40, tone: "bg-white border-stone-300" },
  { id: "b", label: "Plan", x: 38, y: 12, tone: "bg-amber-50 border-amber-300" },
  { id: "c", label: "Build", x: 38, y: 68, tone: "bg-white border-stone-300" },
  { id: "d", label: "Ship it ✓", x: 70, y: 40, tone: "bg-stone-900 border-stone-900 text-white" },
];

export function FlowDemo() {
  return (
    <Window title="Flow" className="demo-flow">
      <div className="relative h-[300px] bg-white [background-image:radial-gradient(#e7e5e4_1px,transparent_1px)] [background-size:16px_16px]">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
          {["M22 46 C30 46 30 22 38 22", "M22 50 C30 50 30 76 38 76", "M54 22 C62 22 62 46 70 46", "M54 76 C62 76 62 50 70 50"].map((d) => (
            <path key={d} className="demo-flow-edge" d={d} fill="none" stroke="#a8a29e" strokeWidth="2" vectorEffect="non-scaling-stroke" />
          ))}
        </svg>
        {NODES.map((node) => (
          <div key={node.id} className={`demo-flow-node absolute w-[18%] min-w-[64px] rounded-xl border px-2 py-2 text-center text-xs font-semibold shadow-sm ${node.tone}`} style={{ left: `${node.x}%`, top: `${node.y}%`, translate: "0 -50%" }}>
            {node.label}
          </div>
        ))}
      </div>
    </Window>
  );
}

/**
 * Adds a demo's build-up to a timeline (positions are relative, 0–1000).
 * The demo root is found inside `root`.
 */
export function addDemoToTimeline(tl, kind, root) {
  const q = (selector) => [...root.querySelectorAll(selector)];
  if (kind === "sticker") {
    tl.add(q(".demo-st"), { opacity: [0, 1], translateY: [-40, 0], scale: [0.85, 1], duration: 380, delay: stagger(110), ease: "outBack(1.4)" }, 0)
      .add(q(".demo-st-check"), { backgroundColor: ["#ffffff", "#10b981"], color: ["#44403c", "#ffffff"], duration: 120 }, 720)
      .add(q('.demo-st[data-i="0"]'), { translateX: [0, 60], opacity: [1, 0.25], duration: 220, ease: "inOutQuad" }, 800)
      .add(q(".demo-st-done"), { scale: [0.8, 1], opacity: [0, 1], duration: 160 }, 840);
  }
  if (kind === "finance") {
    const amount = q(".demo-fin-amount")[0];
    const counter = { value: 0 };
    tl.add(counter, { value: [0, 42800], duration: 600, ease: "outQuad", onUpdate: () => { amount.textContent = Math.round(counter.value).toLocaleString("en-IN"); } }, 0)
      .add(svg.createDrawable(q(".demo-fin-line")), { draw: ["0 0", "0 1"], duration: 700, ease: "inOutSine" }, 50)
      .add(q(".demo-fin-area"), { opacity: [0, 1], duration: 300 }, 450)
      .add(q(".demo-fin-bar"), { scaleX: [0, 1], duration: 300, delay: stagger(90), ease: "outQuad" }, 550)
      .add(q(".demo-fin-chip"), { opacity: [0, 1], translateY: [8, 0], duration: 200 }, 750);
  }
  if (kind === "notes") {
    tl.add(q(".demo-note-title"), { maxWidth: ["0%", "100%"], duration: 300, ease: "linear" }, 0)
      .add(q(".demo-note-line"), { scaleX: [0, 1], duration: 250, delay: stagger(80), ease: "outQuad" }, 250)
      .add(q(".demo-note-hl"), { scaleX: [0, 1], duration: 200, ease: "outQuad" }, 560)
      .add(svg.createDrawable(q(".demo-note-ink")), { draw: ["0 0", "0 1"], duration: 420, ease: "inOutSine" }, 600)
      .add(q(".demo-note-table"), { opacity: [0, 1], scale: [0.9, 1], duration: 200 }, 820);
  }
  if (kind === "flow") {
    const nodes = q(".demo-flow-node");
    const edges = svg.createDrawable(q(".demo-flow-edge"));
    tl.add(nodes[0], { opacity: [0, 1], scale: [0.6, 1], duration: 160, ease: "outBack(1.6)" }, 0)
      .add(edges.slice(0, 2), { draw: ["0 0", "0 1"], duration: 220 }, 160)
      .add(nodes.slice(1, 3), { opacity: [0, 1], scale: [0.6, 1], duration: 180, delay: stagger(60), ease: "outBack(1.6)" }, 360)
      .add(edges.slice(2), { draw: ["0 0", "0 1"], duration: 220 }, 560)
      .add(nodes[3], { opacity: [0, 1], scale: [0.6, 1], duration: 200, ease: "outBack(1.6)" }, 780);
  }
  utils.set(root, { opacity: 1 });
  return tl;
}

export const DEMOS = { sticker: StickerDemo, finance: FinanceDemo, notes: NotesDemo, flow: FlowDemo };
