import React from "react";
import { Save } from "lucide-react";

export default function SaveButton({ onClick, disabled, className = "", text = "Save" }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-center gap-2 px-5 py-2.5 h-11 min-w-[120px] rounded-xl font-bold text-sm text-white bg-blue-600 shadow-md shadow-blue-500/20 transition-all hover:bg-blue-700 hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:pointer-events-none ${className}`}
    >
      <Save className="w-4 h-4" />
      {text}
    </button>
  );
}
