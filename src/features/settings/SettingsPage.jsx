import { NavLink, Navigate, useParams } from "react-router";
import { Info, Palette, RotateCcw, ShieldCheck, KeyRound, UserRound } from "../../lib/icons";
import { AccountSection, AppearanceSection, PrivacySection, ProfileSection, ResetSection } from "./sections";
import AboutSection from "./AboutSection";

const SECTIONS = [
  { id: "user", label: "User", description: "Your name, email and preferences.", icon: UserRound, component: ProfileSection },
  { id: "appearance", label: "Appearance", description: "Light, dark or match your system.", icon: Palette, component: AppearanceSection },
  { id: "account", label: "Account", description: "Sign-in, password and saving a guest account.", icon: KeyRound, component: AccountSection },
  { id: "privacy", label: "Privacy", description: "How your data is kept, and a copy to take with you.", icon: ShieldCheck, component: PrivacySection },
  { id: "about", label: "About", description: "What taskr is and what it can do.", icon: Info, component: AboutSection },
  { id: "reset", label: "Reset", description: "Delete everything and start fresh.", icon: RotateCcw, component: ResetSection, danger: true },
];

export default function SettingsPage() {
  const { section: sectionId = "user" } = useParams();
  const section = SECTIONS.find((item) => item.id === sectionId);
  if (!section) return <Navigate to="/settings" replace />;
  const Active = section.component;

  const linkClass = (item) => ({ isActive }) => `flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
    isActive
      ? item.danger ? "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400" : "bg-stone-100 text-stone-900 dark:bg-white/[0.07] dark:text-white"
      : item.danger ? "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10" : "text-stone-600 hover:bg-stone-50 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-white/5 dark:hover:text-stone-100"
  }`;

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 pb-28 sm:px-6">
      <header className="mb-6">
        <h1 className="font-brand text-2xl font-semibold tracking-[-0.03em] text-stone-900 dark:text-white">Settings</h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">Your profile, how taskr looks, and your data.</p>
      </header>
      <div className="flex flex-col gap-6 md:flex-row md:items-start">
        <nav aria-label="Settings" className="flex gap-1 overflow-x-auto md:sticky md:top-6 md:w-52 md:shrink-0 md:flex-col md:overflow-visible">
          {SECTIONS.map((item) => (
            <NavLink key={item.id} to={item.id === "user" ? "/settings" : `/settings/${item.id}`} end className={linkClass(item)}>
              <item.icon className="h-[18px] w-[18px]" /> {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="min-w-0 flex-1">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-stone-900 dark:text-white">{section.label}</h2>
            <p className="text-sm text-stone-500 dark:text-stone-400">{section.description}</p>
          </div>
          <Active />
        </div>
      </div>
    </main>
  );
}
