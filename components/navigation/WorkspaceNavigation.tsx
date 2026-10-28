"use client";

import { useMemo } from "react";
import {
  BarChart3, BookOpen, CalendarDays, ClipboardList, FileText, Goal,
  Home, Layers3, Medal, Settings2, Shield, Swords, TrendingUp, Trophy,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { LEGACY_WORKSPACE, legacyRosterLabel } from "@/lib/platform/workspace";

export type DashboardTab =
  | "overview" | "roster" | "lineup" | "matches" | "competitions"
  | "stats" | "analysis" | "report" | "season" | "settings";

type Destination =
  | { title: string; icon: LucideIcon; tab: DashboardTab; href?: never }
  | { title: string; icon: LucideIcon; href: string; tab?: never };

type NavigationGroup = {
  name: string;
  title: string;
  icon: LucideIcon;
  firstTab: DashboardTab;
  entries: Destination[];
};
const NAVIGATION: NavigationGroup[] = [
  {
    name: "home", title: "Accueil", icon: Home, firstTab: "overview",
    entries: [{ title: "Vue d'ensemble", icon: Home, tab: "overview" }],
  },
  {
    name: "rosters", title: "Rosters", icon: Users, firstTab: "roster",
    entries: [
      { title: "Effectif", icon: Users, tab: "roster" },
      { title: "Composition", icon: Shield, tab: "lineup" },
    ],
  },
  {
    name: "competitions", title: "Compétitions", icon: Trophy, firstTab: "competitions",
    entries: [
      { title: "Championnats", icon: Trophy, tab: "competitions" },
      { title: "Programme", icon: CalendarDays, href: "/programme" },
      { title: "Préparation des matchs", icon: ClipboardList, href: "/preparation-match" },
      { title: "Centre saison", icon: Layers3, tab: "season" },
    ],
  },
  {
    name: "performance", title: "Performance", icon: BarChart3, firstTab: "stats",
    entries: [
      { title: "Statistiques", icon: BarChart3, tab: "stats" },
      { title: "Analyses", icon: TrendingUp, tab: "analysis" },
      { title: "Match Center", icon: Goal, href: "/match-center" },
      { title: "Intelligence sportive", icon: Medal, href: "/intelligence-sportive" },
      { title: "Rapport de soirée", icon: FileText, tab: "report" },
      { title: "Débrief Studio", icon: BookOpen, href: "/debrief-studio" },
    ],
  },
  {
    name: "admin", title: "Administration", icon: Settings2, firstTab: "settings",
    entries: [
      { title: "Paramètres et accès", icon: Settings2, tab: "settings" },
      { title: "Structure et rosters", icon: Swords, href: "/organisation" },
    ],
  },
];

export function WorkspaceNavigation({
  activeTab, onSelectTab, variant,
}: {
  activeTab: DashboardTab;
  onSelectTab: (tab: DashboardTab) => void;
  variant: "sidebar" | "mobile";
}) {
  const current = useMemo(() =>
    NAVIGATION.find((group) => group.entries.some((entry) => entry.tab === activeTab)) ?? NAVIGATION[0],
    [activeTab]);
  const nav = (
    <div className={variant === "sidebar" ? "space-y-1 p-3" : "flex min-w-max items-center gap-1 p-2"}>
      {NAVIGATION.map((group) => {
        const Icon = group.icon;
        const active = current.name === group.name;
        return (
          <button type="button" key={group.name} onClick={() => onSelectTab(group.firstTab)}
            aria-current={active ? "page" : undefined}
            aria-expanded={active}
            className={variant === "sidebar"
              ? `flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left text-sm font-black transition ${active ? "border-yellow-400/30 bg-yellow-400/10 text-yellow-200" : "border-transparent text-slate-400 hover:bg-white/[0.05] hover:text-white"}`
              : `flex min-h-11 shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-black transition ${active ? "border-yellow-400/30 bg-yellow-400/10 text-yellow-200" : "border-white/5 text-slate-400 hover:bg-white/[0.05] hover:text-white"}`}>
            <Icon size={variant === "sidebar" ? 19 : 17}/>
            {group.title}
          </button>
        );
      })}
    </div>
  );
  const entries = (
    <div className={variant === "sidebar"
      ? "mt-2 space-y-1 border-t border-white/10 px-4 pb-4 pt-4"
      : "flex min-w-max items-center gap-1 border-t border-white/10 px-2 pb-2 pt-2"}>
      {current.entries.map((entry) => {
        const Icon = entry.icon;
        const selected = "tab" in entry && entry.tab === activeTab;
        const cls = variant === "sidebar"
          ? `flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-xs font-semibold transition ${selected ? "bg-cyan-400/10 text-cyan-200" : "text-slate-400 hover:bg-white/5 hover:text-white"}`
          : `flex min-h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold ${selected ? "bg-cyan-400/10 text-cyan-200" : "text-slate-400 hover:bg-white/5 hover:text-white"}`;
        return entry.href
          ? <a key={entry.title} href={entry.href} className={cls}><Icon size={15}/>{entry.title}</a>
          : <button key={entry.title} type="button" className={cls} aria-current={selected ? "page" : undefined}
              onClick={() => onSelectTab(entry.tab)}><Icon size={15}/>{entry.title}</button>;
      })}
    </div>
  );

  if (variant === "mobile") return (
    <nav aria-label="Navigation principale mobile" className="border-b border-white/10 bg-[#071321] xl:hidden">
      <div className="overflow-x-auto">{nav}</div>
      <div className="overflow-x-auto">{entries}</div>
    </nav>
  );

  return (
    <nav aria-label="Navigation principale staff" className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-3 mt-3 rounded-xl border border-yellow-400/15 bg-yellow-400/[0.035] p-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-yellow-300">{LEGACY_WORKSPACE.organisation.name}</p>
        <p className="mt-1 text-sm font-black text-white">{legacyRosterLabel()}</p>
        <p className="mt-1 text-[11px] text-slate-500">Structure pilote · roster actuel</p>
      </div>
      {nav}
      {entries}
      <p className="px-6 pb-4 text-[11px] text-slate-600">5 rubriques • Outils groupés par usage</p>
    </nav>
  );
}
