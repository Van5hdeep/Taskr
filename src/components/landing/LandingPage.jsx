import { useEffect, useRef, useState } from "react";
import {
  ArrowDownRight,
  ArrowRight,
  BarChart3,
  Check,
  CheckCircle2,
  ChevronDown,
  GitBranch,
  Layers3,
  MousePointer2,
  PenLine,
  PieChart,
  Sparkles,
  StickyNote,
  WalletCards,
} from "lucide-react";
import BrandLogo from "../BrandLogo";

function useScrollPosition() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    let frame = null;
    const update = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        setScrollY(window.scrollY);
        frame = null;
      });
    };
    window.addEventListener("scroll", update, { passive: true });
    update();
    return () => {
      window.removeEventListener("scroll", update);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return scrollY;
}

function Reveal({ children, className = "", delay = 0 }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    }, { threshold: 0.14, rootMargin: "0px 0px -8%" });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`landing-reveal ${visible ? "is-visible" : ""} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

function MiniWindow({ label, children, className = "" }) {
  return (
    <div className={`landing-mini-window ${className}`}>
      <div className="landing-mini-window-bar">
        <span className="landing-window-dots"><i /><i /><i /></span>
        <span>{label}</span>
        <span className="landing-window-menu">•••</span>
      </div>
      {children}
    </div>
  );
}

function StickerPreview() {
  return (
    <MiniWindow label="STICKER MATRIX" className="landing-preview-sticker">
      <div className="landing-sticker-board">
        <div className="landing-sticker-card landing-sticker-card-blue">
          <span className="landing-sticker-card-pin" />
          <strong>Ship the launch plan</strong>
          <small>3 subtasks · due today</small>
          <div className="landing-sticker-progress"><span style={{ width: "72%" }} /></div>
        </div>
        <div className="landing-sticker-card landing-sticker-card-yellow">
          <span className="landing-sticker-card-pin" />
          <strong>Review research notes</strong>
          <small>Keep the important close</small>
        </div>
        <div className="landing-sticker-card landing-sticker-card-white">
          <span className="landing-sticker-card-pin" />
          <strong>Plan next week</strong>
          <small>Friday · 4:30 PM</small>
        </div>
      </div>
    </MiniWindow>
  );
}

function FinancePreview() {
  return (
    <MiniWindow label="FINANCE" className="landing-preview-finance">
      <div className="landing-finance-head"><span>This month</span><strong>₹42,800</strong><small>available to plan</small></div>
      <div className="landing-finance-grid">
        <div><span>Income</span><strong>₹68,000</strong><i className="is-positive" /></div>
        <div><span>Expenses</span><strong>₹25,200</strong><i className="is-negative" /></div>
      </div>
      <div className="landing-bars" aria-hidden="true"><i style={{ height: "38%" }} /><i style={{ height: "62%" }} /><i style={{ height: "48%" }} /><i style={{ height: "82%" }} /><i style={{ height: "58%" }} /><i style={{ height: "92%" }} /><i style={{ height: "68%" }} /></div>
      <div className="landing-finance-foot"><span><b /> Essentials</span><span><b /> Flex</span><span><b /> Saving</span></div>
    </MiniWindow>
  );
}

function FlowPreview() {
  return (
    <MiniWindow label="FLOW BUILDER" className="landing-preview-flow">
      <div className="landing-flow-canvas">
        <div className="landing-flow-line line-one" />
        <div className="landing-flow-line line-two" />
        <div className="landing-flow-node node-start"><small>START</small><strong>Capture idea</strong></div>
        <div className="landing-flow-node node-middle"><small>STEP 02</small><strong>Shape the work</strong></div>
        <div className="landing-flow-node node-end"><small>OUTPUT</small><strong>Ship it</strong></div>
      </div>
    </MiniWindow>
  );
}

function WorkspacePreview() {
  return (
    <MiniWindow label="WORKSPACE" className="landing-preview-workspace">
      <div className="landing-paper-toolbar"><span /><span /><span /><span /><b>Annotate</b><span /></div>
      <div className="landing-paper">
        <div className="landing-paper-title">A clear page for messy thinking.</div>
        <div className="landing-paper-rule rule-long" />
        <div className="landing-paper-rule rule-medium" />
        <div className="landing-paper-note"><PenLine size={11} /> add a note here</div>
        <div className="landing-paper-shape" />
      </div>
    </MiniWindow>
  );
}

function ProductPreview({ type }) {
  if (type === "sticker") return <StickerPreview />;
  if (type === "finance") return <FinancePreview />;
  if (type === "flow") return <FlowPreview />;
  return <WorkspacePreview />;
}

const featureRows = [
  {
    id: "sticker",
    eyebrow: "01 · Capture",
    title: "Turn the task dump into a visual plan.",
    body: "Sticker Matrix gets everything out of your head and onto a calm, tactile board. Add deadlines, subtasks, and urgency at the speed your thoughts arrive, then drag the work into an order you can actually see.",
    icon: StickyNote,
    accent: "blue",
    bullets: ["Fast task capture with smart titles", "Deadlines, subtasks, and live progress", "A focused board that stays easy to scan"],
  },
  {
    id: "workspace",
    eyebrow: "02 · Think",
    title: "A paper-like workspace for deeper work.",
    body: "Write, sketch, annotate, and arrange ideas without leaving the product. The workspace keeps the familiar feel of a page while giving you the freedom of a canvas.",
    icon: PenLine,
    accent: "violet",
    bullets: ["A4-style pages for notes and annotation", "High-definition ink and movable elements", "Tables, shapes, and clean text tools"],
  },
  {
    id: "flow",
    eyebrow: "03 · Connect",
    title: "Make the relationships in your work visible.",
    body: "Flow is a lightweight diagram space for turning process, systems, and data into connected shapes. Build a clear map without the overhead of a complicated diagram suite.",
    icon: GitBranch,
    accent: "cyan",
    bullets: ["Draggable nodes and clean connectors", "Flowchart and data-flow building blocks", "Export finished diagrams as JPG or PDF"],
  },
  {
    id: "finance",
    eyebrow: "04 · Ground",
    title: "Give every plan a financial reality check.",
    body: "Track salary and other income alongside the expenses that shape your month. Finance turns raw numbers into a living cash-flow view, a budget you can act on, and a receipt you can take with you.",
    icon: WalletCards,
    accent: "emerald",
    bullets: ["Income, expense, and budget tracking", "Category breakdowns and monthly snapshots", "Exportable receipt for your records"],
  },
];

function LandingPage({ onOpenAuth }) {
  const scrollY = useScrollPosition();

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="landing-page">
      <div className="landing-noise" aria-hidden="true" />
      <header className="landing-nav">
        <button type="button" className="landing-brand" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="Back to top">
          <BrandLogo className="landing-wordmark" tone="light" />
        </button>
        <nav className="landing-nav-links" aria-label="Landing page navigation">
          <button type="button" onClick={() => scrollTo("product")}>Product</button>
          <button type="button" onClick={() => scrollTo("how-it-works")}>How it works</button>
          <button type="button" onClick={() => scrollTo("footer")}>About</button>
        </nav>
        <div className="landing-nav-actions">
          <button type="button" className="landing-sign-in" onClick={() => onOpenAuth("signin")}>Sign in</button>
        </div>
      </header>

      <main>
        <section className="landing-hero" aria-labelledby="landing-title">
          <div className="landing-hero-glow landing-hero-glow-one" style={{ transform: `translate3d(${scrollY * 0.08}px, ${scrollY * 0.2}px, 0)` }} />
          <div className="landing-hero-glow landing-hero-glow-two" style={{ transform: `translate3d(${-scrollY * 0.06}px, ${scrollY * 0.12}px, 0)` }} />
          <div className="landing-hero-grid" style={{ transform: `translateY(${scrollY * 0.16}px)` }} />
          <div className="landing-hero-inner">
            <Reveal className="landing-hero-copy">
              <div className="landing-kicker"><span className="landing-kicker-dot" /> One place for the work in progress</div>
              <h1 id="landing-title">Make room for the work <em>that matters.</em></h1>
              <p>Taskr brings your tasks, notes, diagrams, and money into one focused workspace—so your attention can move from scattered to clear.</p>
              <div className="landing-hero-actions">
                <button type="button" className="landing-primary-cta" onClick={() => onOpenAuth("signup")}>Start for free <ArrowDownRight size={18} /></button>
                <button type="button" className="landing-text-cta" onClick={() => scrollTo("product")}>See the product <ArrowRight size={17} /></button>
              </div>
              <div className="landing-hero-proof"><CheckCircle2 size={16} /><span>No clutter. No complicated setup. Just your next move.</span></div>
            </Reveal>

            <div className="landing-hero-visual" style={{ transform: `translate3d(0, ${Math.min(scrollY * -0.12, 0)}px, 0) rotate(${Math.min(scrollY * -0.008, 0)}deg)` }}>
              <div className="landing-visual-orbit orbit-one" />
              <div className="landing-visual-orbit orbit-two" />
              <div className="landing-floating-chip chip-top"><Sparkles size={13} /> Your work, in motion</div>
              <div className="landing-product-stack">
                <StickerPreview />
                <div className="landing-stack-shadow" />
              </div>
              <div className="landing-floating-chip chip-bottom"><MousePointer2 size={13} /> Drag. Shape. Finish.</div>
            </div>
          </div>
          <button type="button" className="landing-scroll-cue" onClick={() => scrollTo("product")}><span>Scroll to explore</span><ChevronDown size={17} /></button>
        </section>

        <section id="product" className="landing-intro landing-section-shell">
          <Reveal className="landing-intro-heading">
            <span className="landing-section-label">A calmer operating system for your day</span>
            <h2>Four focused tools.<br /><span>One continuous way of thinking.</span></h2>
          </Reveal>
          <Reveal className="landing-intro-copy" delay={100}>
            <p>Most work gets fragmented before it gets finished. Taskr gives each kind of thinking a place, then keeps those places close enough to work together.</p>
            <div className="landing-intro-stat"><strong>01</strong><span>capture<br />everything</span></div>
          </Reveal>
        </section>

        <section id="how-it-works" className="landing-feature-list landing-section-shell">
          {featureRows.map(({ id, eyebrow, title, body, icon: Icon, accent, bullets }, index) => (
            <Reveal key={id} className={`landing-feature-row ${index % 2 ? "is-reversed" : ""}`}>
              <div className={`landing-feature-visual accent-${accent}`}>
                <div className="landing-feature-visual-glow" />
                <ProductPreview type={id} />
                <div className="landing-feature-number">{String(index + 1).padStart(2, "0")}</div>
              </div>
              <div className="landing-feature-copy">
                <div className="landing-feature-eyebrow"><Icon size={16} /> {eyebrow}</div>
                <h3>{title}</h3>
                <p>{body}</p>
                <ul>{bullets.map((bullet) => <li key={bullet}><Check size={15} /> {bullet}</li>)}</ul>
              </div>
            </Reveal>
          ))}
        </section>

        <section className="landing-manifesto">
          <div className="landing-section-shell landing-manifesto-inner">
            <Reveal>
              <span className="landing-section-label">Designed for momentum</span>
              <h2>Clarity is not a destination.<br /><em>It is a better starting point.</em></h2>
            </Reveal>
            <Reveal className="landing-manifesto-aside" delay={120}>
              <Layers3 size={22} />
              <p>From the first rough note to the final receipt, Taskr keeps the details close and the interface out of the way.</p>
            </Reveal>
          </div>
        </section>

        <section className="landing-cta landing-section-shell">
          <Reveal className="landing-cta-card">
            <div className="landing-cta-mark"><BrandLogo className="landing-cta-logo" tone="dark" /></div>
            <div>
              <span className="landing-section-label">Your next clear day starts here</span>
              <h2>Build a workspace<br /><em>that moves with you.</em></h2>
            </div>
            <button type="button" className="landing-primary-cta" onClick={() => onOpenAuth("signup")}>Create your workspace <ArrowRight size={18} /></button>
          </Reveal>
        </section>
      </main>

      <footer id="footer" className="landing-footer">
        <div className="landing-footer-top landing-section-shell">
          <div className="landing-footer-intro"><p>A focused home for the work that is still becoming.</p></div>
          <div className="landing-footer-links"><div><strong>Explore</strong><button type="button" onClick={() => scrollTo("product")}>Product</button><button type="button" onClick={() => scrollTo("how-it-works")}>How it works</button></div><div><strong>Get started</strong><button type="button" onClick={() => onOpenAuth("signin")}>Sign in</button><button type="button" onClick={() => onOpenAuth("signup")}>Create account</button></div></div>
        </div>
        <div className="landing-footer-wordmark" aria-hidden="true"><BrandLogo className="landing-footer-large-logo taskr-footer-wordmark" tone="light" /></div>
        <div className="landing-footer-bottom landing-section-shell"><span>© {new Date().getFullYear()} Taskr</span><span>Made for the work in progress.</span></div>
      </footer>
    </div>
  );
}

export default LandingPage;
