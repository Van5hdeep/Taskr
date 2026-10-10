import { Loader2 } from "lucide-react";
import BrandLogo from "../BrandLogo";

export default function FullScreenLoader({ label = "Starting…" }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white text-zinc-500 dark:bg-[#0a0f24] dark:text-slate-400">
      <BrandLogo className="loading-wordmark" tone="dark" />
      <Loader2 className="my-4 h-8 w-8 animate-spin text-blue-500" />
      <p className="text-sm">{label}</p>
    </div>
  );
}
