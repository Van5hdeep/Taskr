import { useState } from "react";
import { FileText } from "lucide-react";
import SaveButton from "./ui/SaveButton";

export default function WorkspaceSaveModal({ 
  onSave, 
  onExportPdf, 
  onCancel, 
  t, 
  dark,
  defaultName = ""
}) {
  const [docName, setDocName] = useState(defaultName);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 no-print">
      <div className={`w-full max-w-md rounded-3xl p-6 shadow-2xl ${t.card}`}>
        <h3 className={`text-xl font-bold mb-4 ${t.textPrimary}`}>Save Workspace</h3>
        <p className={`text-sm mb-4 ${t.textMuted}`}>Give this workspace a name so you can quickly access it from your dashboard.</p>
        
        <div className="mb-6">
          <label className={`block text-xs font-bold uppercase mb-2 ${t.textMuted}`}>Workspace Name</label>
          <input 
            type="text" 
            value={docName} 
            onChange={e => setDocName(e.target.value)} 
            placeholder="e.g. My Awesome Plan" 
            className={`w-full rounded-xl border px-4 py-3 text-sm outline-none focus:ring-2 ${t.input}`}
            autoFocus
          />
        </div>
        
        <div className="flex flex-col gap-3">
          <SaveButton 
            onClick={() => {
              if (docName.trim()) {
                onSave(docName.trim());
              }
            }}
            disabled={!docName.trim()}
            className="w-full"
          />
          
          {onExportPdf && (
            <button 
              onClick={onExportPdf}
              className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 border transition-colors ${dark ? "bg-white/5 border-white/10 text-white hover:bg-white/10" : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"}`}
            >
              <FileText className="h-4 w-4" />
              Export as PDF
            </button>
          )}
          
          <button 
            onClick={onCancel}
            className={`w-full py-3 rounded-xl font-bold text-sm transition-colors ${dark ? "text-slate-400 hover:bg-white/5" : "text-slate-500 hover:bg-slate-100"}`}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
