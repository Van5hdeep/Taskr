import { useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import {
  ArrowRight, Bug, ChevronDown, GitMerge, Keyboard, Mail, PenTool, PieChart, Rocket, Search, ShieldCheck, StickyNote, X,
} from "../../lib/icons";
import { openShortcuts } from "../../app/globalEvents";
import { HELP_ARTICLES } from "./helpArticles";

const TOPICS = [
  { id: "Getting started", icon: Rocket, blurb: "What taskr is, guest accounts, quick add and search." },
  { id: "Sticker", icon: StickyNote, blurb: "Adding stickers, urgency colours and the Done board." },
  { id: "Finance", icon: PieChart, blurb: "Accounts, money in and out, budgets, goals and imports." },
  { id: "Workspace", icon: PenTool, blurb: "Pages, handwriting, tables, shapes and documents." },
  { id: "Flow", icon: GitMerge, blurb: "Building, connecting and tidying diagrams." },
  { id: "Account & data", icon: ShieldCheck, blurb: "Theme, passwords, downloading or resetting your data." },
];

const ISSUES_URL = "https://github.com/Van5hdeep/Taskr/issues/new";
const normalise = (text) => text.toLowerCase().replace(/\s+/g, " ").trim();

function Article({ article, open, onToggle }) {
  return (
    <li>
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-center justify-between gap-4 py-3.5 text-left text-[15px] font-semibold text-stone-900 dark:text-stone-100">
        {article.title}
        <ChevronDown className={`h-4 w-4 shrink-0 text-stone-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <p className="-mt-1 pb-4 pr-8 text-sm leading-relaxed text-stone-600 dark:text-stone-400">{article.body}</p>}
    </li>
  );
}

function ContactForm() {
  const [form, setForm] = useState({ topic: "Question", subject: "", message: "" });
  const field = "w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-stone-900 outline-none placeholder:text-stone-400 focus:border-stone-400 focus:ring-4 focus:ring-stone-900/5 dark:border-white/10 dark:bg-ink-850 dark:text-stone-100 dark:focus:border-white/30";

  // Opens a pre-filled GitHub issue in a new tab; nothing is sent from taskr itself.
  const submit = (event) => {
    event.preventDefault();
    const params = new URLSearchParams({ title: `[${form.topic}] ${form.subject}`, body: form.message });
    window.open(`${ISSUES_URL}?${params}`, "_blank", "noopener,noreferrer");
  };

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold text-stone-600 dark:text-stone-300">Topic</span>
        <select className={field} value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })}>
          {["Question", "Bug report", "Feature idea"].map((topic) => <option key={topic}>{topic}</option>)}
        </select>
      </label>
      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold text-stone-600 dark:text-stone-300">Subject</span>
        <input required className={field} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="In a few words" />
      </label>
      <label className="block sm:col-span-2">
        <span className="mb-1.5 block text-xs font-semibold text-stone-600 dark:text-stone-300">Message</span>
        <textarea required rows={4} className={`${field} resize-y`} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="What happened, or what would help?" />
      </label>
      <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2">
        <p className="text-xs text-stone-400">Opens a pre-filled request on GitHub in a new tab. Don't include passwords or private data.</p>
        <button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-stone-800 dark:bg-amber-400 dark:text-stone-900 dark:hover:bg-amber-300">
          <Mail className="h-4 w-4" /> Send request
        </button>
      </div>
    </form>
  );
}

export default function HelpPage() {
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState(null);
  const [openTitle, setOpenTitle] = useState(null);
  const listRef = useRef(null);

  const results = useMemo(() => {
    const words = normalise(query).split(" ").filter(Boolean);
    return HELP_ARTICLES.filter((article) => {
      if (!words.length) return !topic || article.topic === topic;
      const haystack = normalise(`${article.topic} ${article.title} ${article.body} ${article.keywords}`);
      return words.every((word) => haystack.includes(word));
    });
  }, [query, topic]);

  const showList = Boolean(query.trim() || topic);
  const pickTopic = (id) => {
    setTopic(id);
    setQuery("");
    setOpenTitle(null);
    requestAnimationFrame(() => listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  return (
    <main className="w-full pb-24">
      <section className="relative overflow-hidden border-b border-stone-200/70 px-4 pb-16 pt-14 text-center sm:px-6 dark:border-white/[0.06]">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full bg-amber-300/40 blur-3xl dark:bg-amber-400/10" />
        <div aria-hidden className="pointer-events-none absolute -bottom-40 -left-24 h-80 w-80 rounded-full bg-orange-200/40 blur-3xl dark:bg-orange-400/5" />
        <p className="relative text-xs font-semibold uppercase tracking-[0.12em] text-stone-500 dark:text-stone-400">Help & support</p>
        <h1 className="relative mx-auto mt-3 max-w-xl font-brand text-4xl font-semibold tracking-[-0.03em] text-stone-900 sm:text-5xl dark:text-white">How can we help?</h1>
        <p className="relative mx-auto mt-3 max-w-md text-[15px] text-stone-500 dark:text-stone-400">Search the guides, browse a topic, or send us a note.</p>
        <div className="relative mx-auto mt-7 max-w-xl">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
          <input
            value={query}
            onChange={(event) => { setQuery(event.target.value); setTopic(null); setOpenTitle(null); }}
            placeholder="Search for answers…"
            aria-label="Search help"
            className="w-full rounded-2xl border border-stone-200 bg-white py-3.5 pl-12 pr-11 text-sm text-stone-900 shadow-[0_8px_24px_-12px_rgba(28,27,25,0.18)] outline-none placeholder:text-stone-400 focus:border-stone-400 dark:border-white/10 dark:bg-ink-850 dark:text-stone-100"
          />
          {query && <button type="button" onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-stone-400 hover:text-stone-700" aria-label="Clear search"><X className="h-4 w-4" /></button>}
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        {!showList && (
          <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {TOPICS.map(({ id, icon: Icon, blurb }) => {
              const count = HELP_ARTICLES.filter((article) => article.topic === id).length;
              return (
                <button key={id} type="button" onClick={() => pickTopic(id)} className="group flex flex-col items-start rounded-2xl border border-stone-200/80 bg-white p-5 text-left transition-all hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-[0_12px_28px_-16px_rgba(28,27,25,0.25)] dark:border-white/[0.07] dark:bg-ink-900 dark:hover:border-white/15">
                  <Icon className="h-6 w-6 text-stone-800 dark:text-amber-400" />
                  <h2 className="mt-4 text-base font-semibold text-stone-900 dark:text-white">{id}</h2>
                  <p className="mt-1 flex-1 text-sm leading-relaxed text-stone-500 dark:text-stone-400">{blurb}</p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-stone-900 dark:text-stone-100">
                    Browse {count} questions <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </button>
              );
            })}
          </section>
        )}

        {showList && (
          <section ref={listRef} className="mt-10 scroll-mt-6">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => { setTopic(null); setQuery(""); }} className="text-sm font-medium text-stone-500 hover:text-stone-900 dark:hover:text-white">All topics</button>
              <span className="text-stone-300">/</span>
              <span className="text-sm font-semibold text-stone-900 dark:text-white">{topic ?? `Results for "${query.trim()}"`}</span>
            </div>
            <div className="rounded-2xl border border-stone-200/80 bg-white px-6 dark:border-white/[0.07] dark:bg-ink-900">
              {results.length ? (
                <ul className="divide-y divide-stone-100 dark:divide-white/[0.06]">
                  {results.map((article) => (
                    <Article key={article.title} article={article} open={openTitle === article.title || Boolean(query.trim() && results.length <= 3)} onToggle={() => setOpenTitle(openTitle === article.title ? null : article.title)} />
                  ))}
                </ul>
              ) : (
                <p className="py-10 text-center text-sm text-stone-500 dark:text-stone-400">Nothing matches "{query}". Try fewer or different words, or send us a note below.</p>
              )}
            </div>
          </section>
        )}

        <section className="mt-12 grid gap-4 lg:grid-cols-[1fr_1.4fr]">
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-stone-200/80 bg-white p-5 dark:border-white/[0.07] dark:bg-ink-900">
              <Keyboard className="h-6 w-6 text-stone-800 dark:text-amber-400" />
              <h2 className="mt-3 font-semibold text-stone-900 dark:text-white">Keyboard shortcuts</h2>
              <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">Move faster with a few keys. Press <kbd className="rounded border border-stone-200 px-1 text-xs dark:border-white/10">?</kbd> anywhere.</p>
              <button type="button" onClick={openShortcuts} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-stone-900 dark:text-stone-100">See all shortcuts <ArrowRight className="h-4 w-4" /></button>
            </div>
            <div className="rounded-2xl border border-stone-200/80 bg-white p-5 dark:border-white/[0.07] dark:bg-ink-900">
              <Bug className="h-6 w-6 text-stone-800 dark:text-amber-400" />
              <h2 className="mt-3 font-semibold text-stone-900 dark:text-white">Your data & privacy</h2>
              <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">See how your data is kept, download a copy, or start over.</p>
              <Link to="/settings/privacy" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-stone-900 dark:text-stone-100">Open privacy settings <ArrowRight className="h-4 w-4" /></Link>
            </div>
          </div>
          <div className="rounded-2xl border border-stone-200/80 bg-white p-6 dark:border-white/[0.07] dark:bg-ink-900">
            <h2 className="font-brand text-xl font-semibold tracking-tight text-stone-900 dark:text-white">Get in touch</h2>
            <p className="mb-5 mt-1 text-sm text-stone-500 dark:text-stone-400">Found a bug or have an idea? Tell us about it.</p>
            <ContactForm />
          </div>
        </section>
      </div>
    </main>
  );
}
