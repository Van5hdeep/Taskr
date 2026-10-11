import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router";
import Lottie from "../../components/ui/Lottie";
import { ChevronLeft } from "../../lib/icons";
import BrandLogo, { QuadMark } from "../../components/BrandLogo";

// Free animation from LottieFiles (featured collection).
export const LOTTIE = {
  // "Rolling Cubes" by Sanjib Paul — calm tiles that echo the Quad mark.
  cubes: "https://assets-v2.lottiefiles.com/a/6fec0b15-a531-40ee-929c-391ea4e5a533/WXrwwxymYB.lottie",
};

const STORY = [
  { tool: "Sticker", line: "Stick it, colour it, tick it off." },
  { tool: "Finance", line: "See what's safe to spend, at a glance." },
  { tool: "Workspace", line: "Pages you can type, draw and highlight on." },
  { tool: "Flow", line: "Map an idea out in minutes." },
];

/** The left panel cycles through what each tool is for. */
function StoryTicker() {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setIndex((value) => (value + 1) % STORY.length), 2800);
    return () => clearInterval(timer);
  }, []);
  return (
    <div className="relative h-14 overflow-hidden" aria-live="polite">
      {STORY.map((item, i) => (
        <div key={item.tool} className={`absolute inset-0 transition-all duration-500 ${i === index ? "translate-y-0 opacity-100" : i === (index + STORY.length - 1) % STORY.length ? "-translate-y-6 opacity-0" : "translate-y-6 opacity-0"}`}>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-400">{item.tool}</p>
          <p className="mt-1 text-lg text-stone-200">{item.line}</p>
        </div>
      ))}
    </div>
  );
}

/** Shared two-panel frame for every auth screen. */
export default function AuthLayout({ kicker = "Welcome to taskr", title, subtitle, children }) {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-cream-50 p-3 text-stone-900 sm:p-4">
      <div className="grid min-h-[calc(100vh-1.5rem)] gap-3 sm:min-h-[calc(100vh-2rem)] sm:gap-4 lg:grid-cols-[1.05fr_1fr]">
        {/* Story panel */}
        <section className="auth-panel-in relative hidden overflow-hidden rounded-[28px] bg-stone-900 p-10 text-white lg:flex lg:flex-col">
          <div aria-hidden className="auth-glow pointer-events-none absolute -right-32 -top-32 h-[420px] w-[420px] rounded-full bg-amber-400/25 blur-[100px]" />
          <div aria-hidden className="pointer-events-none absolute -bottom-40 -left-20 h-[380px] w-[380px] rounded-full bg-orange-500/10 blur-[100px]" />
          <button type="button" onClick={() => navigate("/")} className="relative self-start" aria-label="Back to the taskr home page">
            <BrandLogo size={26} markClassName="text-amber-400" wordClassName="text-white" />
          </button>
          <div className="relative mt-12">
            <h1 className="max-w-md text-[clamp(40px,4vw,58px)] font-medium leading-[1.02] tracking-[-0.04em]">Your whole day, <em className="font-display font-normal italic text-amber-400">sorted.</em></h1>
            <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-stone-400">taskr keeps your to-dos, money, notes and plans in one calm place — so you spend less time switching apps and more time getting things done.</p>
          </div>
          <div className="relative flex flex-1 items-center justify-center py-8">
            <div className="auth-card-float relative w-full max-w-[340px] -rotate-2">
              <span className="absolute left-1/2 top-0 z-10 h-2 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-400" aria-hidden />
              <div className="overflow-hidden rounded-[26px] bg-[#fafafa] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.7)] ring-1 ring-white/10">
                <Lottie src={LOTTIE.cubes} loop className="aspect-square w-full" />
              </div>
            </div>
          </div>
          <div className="relative"><StoryTicker /></div>
        </section>

        {/* Form panel */}
        <section className="relative flex flex-col rounded-[28px] border border-stone-200/70 bg-white px-6 py-6 sm:px-10">
          <div className="flex items-center justify-between">
            <button type="button" onClick={() => navigate("/")} className="lg:invisible" aria-label="Back to the taskr home page">
              <BrandLogo size={22} markClassName="text-stone-900" />
            </button>
            <button type="button" onClick={() => navigate("/")} className="inline-flex items-center gap-1 text-sm font-medium text-stone-500 hover:text-stone-900"><ChevronLeft className="h-4 w-4" /> Back to site</button>
          </div>
          <div className="flex flex-1 items-center justify-center py-10">
            <div className="auth-form-in w-full max-w-[400px]">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">{kicker}</p>
              <h2 className="mt-3 text-[34px] font-medium leading-tight tracking-[-0.04em]">{title}</h2>
              {subtitle && <p className="mt-2 text-[15px] text-stone-500">{subtitle}</p>}
              <div className="mt-8">{children}</div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

/**
 * Full-screen "you're in" moment, rendered on <body> so no transformed parent
 * can clip it. The Quad tiles drop in, the loose tile tilts, a check badge pops
 * on, then a cream panel wipes up and the app takes over. Built-in SVG, no download.
 */
export function AuthSuccess({ title = "Welcome", detail = "Setting up your space…", onDone, hold = 2000 }) {
  const [leaving, setLeaving] = useState(false);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  useEffect(() => {
    const wipe = setTimeout(() => setLeaving(true), hold);
    const done = setTimeout(() => doneRef.current(), hold + 650);
    return () => { clearTimeout(wipe); clearTimeout(done); };
  }, [hold]);

  return createPortal(
    <div className="auth-success fixed inset-0 z-[300] flex flex-col items-center justify-center bg-white text-stone-900" role="status" aria-live="assertive">
      <div className="relative h-28 w-28">
        <QuadMark className="success-quad h-full w-full text-stone-900" />
        <svg viewBox="0 0 40 40" className="success-badge absolute -bottom-3 -right-3 h-12 w-12 drop-shadow-[0_6px_14px_rgba(242,180,0,0.45)]" aria-hidden>
          <circle cx="20" cy="20" r="18" fill="#ffc71d" stroke="#ffffff" strokeWidth="3" />
          <path className="success-tick" d="M12 20.5 L17.5 26 L28 14.5" fill="none" stroke="#1c1b19" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" pathLength="1" />
        </svg>
      </div>
      <p className="auth-success-text mt-8 text-2xl font-medium tracking-[-0.03em]">{title}</p>
      <p className="auth-success-text mt-1 text-sm text-stone-500" style={{ animationDelay: "1.05s" }}>{detail}</p>
      <div className={`absolute inset-0 bg-cream-50 transition-transform duration-[650ms] ease-[cubic-bezier(.7,0,.2,1)] ${leaving ? "translate-y-0" : "translate-y-full"}`} />
    </div>,
    document.body,
  );
}
