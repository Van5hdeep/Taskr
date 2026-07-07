import { StickyNote, ChevronRight } from "lucide-react";

export default function ProjectCard({ project, onClick, t, dark }) {
  return (
    <div 
      onClick={onClick}
      className={`group flex flex-col justify-between rounded-[2rem] border p-6 sm:p-8 shadow-sm transition-all hover:border-blue-500/50 hover:shadow-md hover:-translate-y-1 cursor-pointer ${t.card}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className={`text-xl font-bold tracking-tight ${t.textPrimary}`}>{project.name}</h3>
          <p className={`mt-2 text-sm font-medium ${t.textMuted}`}>Updated {project.lastUpdated}</p>
        </div>
        <div className={`flex items-center justify-center h-10 w-10 rounded-full transition-colors group-hover:bg-blue-500/10 ${dark ? "bg-slate-800" : "bg-slate-100"}`}>
          <ChevronRight className={`h-5 w-5 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-500 ${t.textMuted}`} />
        </div>
      </div>
      
      <div className="mt-8 flex items-center justify-between">
        <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold transition-colors ${t.cardMuted} ${t.textMuted}`}>
          <StickyNote className="h-4 w-4 text-blue-500" />
          {project.type}
        </div>
        <div className={`text-sm font-bold ${t.textPrimary}`}>
          {project.taskCount} Tasks
        </div>
      </div>
    </div>
  );
}
