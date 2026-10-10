import { ArrowRight, Clock3, StickyNote } from "lucide-react";

function WorkspaceCard({ workspace, onClick, t, dark, featured = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex w-full items-center gap-4 rounded-2xl border p-5 text-left transition-all hover:-translate-y-0.5 hover:border-blue-400/60 hover:shadow-lg ${t.card} ${featured ? "sm:p-7" : ""}`}
    >
      <span className={`flex shrink-0 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-300 ${featured ? "h-14 w-14" : "h-11 w-11"}`}>
        <StickyNote className={featured ? "h-6 w-6" : "h-5 w-5"} />
      </span>
      <span className="min-w-0 flex-1">
        {featured && <span className={`mb-1 block text-[11px] font-bold uppercase tracking-[0.14em] ${t.textMuted}`}>Continue working</span>}
        <span className={`block truncate font-bold ${featured ? "text-xl sm:text-2xl" : "text-base"} ${t.textPrimary}`}>{workspace.name}</span>
        <span className={`mt-1 flex items-center gap-1.5 text-xs ${t.textMuted}`}>
          <Clock3 className="h-3.5 w-3.5" />
          {workspace.type} · Updated {workspace.lastUpdated || "recently"}
        </span>
      </span>
      <ArrowRight className={`h-5 w-5 shrink-0 transition-transform group-hover:translate-x-1 ${dark ? "text-slate-500" : "text-slate-400"}`} />
    </button>
  );
}

export default function DashboardHome({ username, savedWorkspaces, onNavigate, t, dark }) {
  const recentWorkspaces = [...savedWorkspaces]
    .sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0))
    .slice(0, 4);
  const latestWorkspace = recentWorkspaces[0];
  const earlierWorkspaces = recentWorkspaces.slice(1);

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 pb-28 sm:px-6 sm:py-16">
      <header className="mb-9">
        <p className={`text-sm font-medium ${t.textMuted}`}>Welcome back, {username || "there"}.</p>
        <h1 className={`mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl ${t.textPrimary}`}>Continue where you left off.</h1>
      </header>

      {latestWorkspace ? (
        <section>
          <WorkspaceCard workspace={latestWorkspace} onClick={() => onNavigate(latestWorkspace.id)} t={t} dark={dark} featured />
          {earlierWorkspaces.length > 0 && (
            <div className="mt-8">
              <h2 className={`mb-3 text-sm font-bold uppercase tracking-[0.14em] ${t.textMuted}`}>Earlier work</h2>
              <div className="space-y-3">
                {earlierWorkspaces.map((workspace) => (
                  <WorkspaceCard key={workspace.id} workspace={workspace} onClick={() => onNavigate(workspace.id)} t={t} dark={dark} />
                ))}
              </div>
            </div>
          )}
        </section>
      ) : (
        <section className={`rounded-2xl border border-dashed p-8 text-center sm:p-12 ${dark ? "border-blue-500/20 bg-blue-500/5" : "border-slate-200 bg-slate-50"}`}>
          <StickyNote className="mx-auto h-8 w-8 text-blue-500" />
          <h2 className={`mt-4 text-lg font-bold ${t.textPrimary}`}>Nothing saved yet</h2>
          <p className={`mx-auto mt-2 max-w-sm text-sm leading-relaxed ${t.textMuted}`}>Save any workspace and it will appear here so you can pick up instantly next time.</p>
        </section>
      )}
    </main>
  );
}
