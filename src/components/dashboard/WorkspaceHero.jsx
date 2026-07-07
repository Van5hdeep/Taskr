import DotGrid from "./DotGrid";

export default function WorkspaceHero({ username, t, dark }) {
  return (
    <div className={`relative mb-8 overflow-hidden rounded-[2.5rem] border shadow-sm transition-colors ${dark ? "border-blue-500/20 bg-[#0a0f24]" : "border-slate-200 bg-white"}`}>
      <DotGrid dark={dark} />
      <div className="relative z-10 flex flex-col items-center justify-center text-center max-w-2xl mx-auto h-full min-h-[15vh] p-10 sm:p-14">
        <h1 className={`text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl ${t.textPrimary}`}>
          Welcome Back, {username || "there"}
        </h1>
        <p className={`mt-4 text-lg sm:text-xl font-medium ${t.textMuted}`}>
          Continue where you left off.
        </p>
      </div>
    </div>
  );
}
