import { DEMOS } from "../../components/landing/FeatureDemos";
import { QuadMark } from "../../components/BrandLogo";
import { Panel } from "./ui";

const TOOLS = [
  {
    id: "sticker",
    name: "Sticker",
    tagline: "Your to-dos on one board",
    body: "Write a sticker, colour it by urgency — red for urgent, blue for soon, green for can wait — and drag it wherever makes sense. Check it off and it moves to the Done board for a day.",
  },
  {
    id: "finance",
    name: "Finance",
    tagline: "Know where your money goes",
    body: "Track money in and out across your accounts, set monthly budgets, keep an eye on bills, save towards goals and follow your investments. The Summary tells you what's safe to spend.",
  },
  {
    id: "workspace",
    name: "Workspace",
    tagline: "Pages for thinking and writing",
    body: "A4 pages where you can type, draw with a pen, highlight, and drop in tables, shapes, sticky notes and images. Export to PDF or PNG when you're done.",
  },
  {
    id: "flow",
    name: "Flow",
    tagline: "Diagrams without the fuss",
    body: "Drag blocks onto a canvas, connect them, and let Tidy up arrange them. Good for processes, plans and mind maps. Exports to image, PDF or Mermaid.",
  },
];

const VERSION = "0.1 preview";

export default function AboutSection() {
  return (
    <div className="space-y-6">
      <Panel>
        <div className="flex flex-col items-center py-4 text-center">
          <QuadMark className="h-16 w-16 text-stone-900 dark:text-amber-400" />
          <h2 className="mt-4 font-brand text-3xl font-semibold tracking-[-0.04em] text-stone-900 dark:text-white">taskr</h2>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">Plan, track, write and map — in one calm place.</p>
          <span className="mt-3 rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-600 dark:bg-white/10 dark:text-stone-300">Version {VERSION}</span>
        </div>
        <p className="mx-auto max-w-2xl text-center text-sm leading-relaxed text-stone-600 dark:text-stone-400">
          taskr brings the tools you reach for every day into one app, so your tasks, money, notes and plans sit side by side.
          Everything is saved to your account as you work, and it's yours alone — no ads, no tracking and no AI reading your stuff.
        </p>
      </Panel>

      {TOOLS.map((tool, index) => {
        const Demo = DEMOS[tool.id === "workspace" ? "notes" : tool.id];
        return (
        <Panel key={tool.id}>
          <div className={`grid items-center gap-6 md:grid-cols-2 ${index % 2 ? "md:[&>*:first-child]:order-2" : ""}`}>
            <div className="pointer-events-none overflow-hidden rounded-2xl bg-stone-100 p-5 dark:bg-white/5" aria-hidden>
              <div className="origin-top scale-[0.92]"><Demo /></div>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-amber-700 dark:text-amber-400">{tool.name}</p>
              <h3 className="mt-2 text-xl font-bold tracking-tight text-stone-900 dark:text-white">{tool.tagline}</h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-600 dark:text-stone-400">{tool.body}</p>
            </div>
          </div>
        </Panel>
        );
      })}

      <Panel title="Built with">
        <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-400">
          React, Vite and Tailwind CSS on the front end; Supabase for sign-in, the database and file storage. Workspace ink uses Excalidraw, text uses Tiptap,
          Flow uses React Flow, and icons come from Phosphor.
        </p>
        <p className="mt-3 text-xs text-stone-400">© {new Date().getFullYear()} taskr</p>
      </Panel>
    </div>
  );
}
