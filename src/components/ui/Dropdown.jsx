import React from "react";
import { ChevronDown } from "lucide-react";

export default function Dropdown({ value, onChange, options, className = "" }) {
  return (
    <div className={`relative ${className}`}>
      <select
        value={value}
        onChange={onChange}
        className="w-full appearance-none bg-blue-600 text-white font-bold text-sm px-4 py-2.5 pr-10 rounded-xl outline-none shadow-md shadow-blue-500/20 hover:bg-blue-700 focus:ring-2 focus:ring-blue-400 transition-colors cursor-pointer"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-blue-700 text-white">
            {opt.label}
          </option>
        ))}
      </select>
      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/80">
        <ChevronDown className="w-4 h-4" />
      </div>
    </div>
  );
}
