"use client";

import { useMemo } from "react";
import {
  BarChart3, BookOpen, CalendarDays, ClipboardList, FileText, Goal,
  Home, Layers3, Medal, Settings2, Shield, Swords, TrendingUp, Trophy,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useClubBranding } from "@/lib/platform/use-club-branding";

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
      { title: "Historique des matchs", icon: Swords, tab: "matches" },
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
      { title: "Personnalisation du club", icon: Swords, href: "/personnalisation" },
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
  const branding = useClubBranding();
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
            style={active ? { borderColor: branding.roster.primaryColor + "66", backgroundColor: branding.roster.primaryColor + "1a", color: branding.roster.secondaryColor } : undefined}
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
        if (entry.tab !== undefined) {
          return <button key={entry.title} type="button" className={cls} aria-current={selected ? "page" : undefined}
            style={selected ? { backgroundColor: branding.roster.primaryColor + "1a", color: branding.roster.secondaryColor } : undefined}
            onClick={() => onSelectTab(entry.tab)}><Icon size={15}/>{entry.title}</button>;
        }
        return <a key={entry.title} href={entry.href} className={cls}><Icon size={15}/>{entry.title}</a>;
      })}
    </div>
  );

  if (variant === "mobile") return (
    <nav aria-label="Navigation principale mobile" className="border-b border-white/10 bg-[#0A0A0A] xl:hidden">
      <div className="flex items-center gap-3 border-b border-white/10 px-3 py-2 text-xs font-black">
        {branding.structure.logoUrl
          ? <img src={branding.structure.logoUrl} alt="" className="h-7 w-7 object-contain"/>
          : <span style={{ color: branding.structure.primaryColor }}>{branding.structure.name.slice(0, 2).toUpperCase()}</span>}
        <span className="truncate" style={{ color: branding.structure.primaryColor }}>{branding.structure.name}</span>
        <span className="text-slate-600">/</span>
        {branding.roster.logoUrl && <img src={branding.roster.logoUrl} alt="" className="h-7 w-7 object-contain"/>}
        <span className="truncate" style={{ color: branding.roster.secondaryColor }}>{branding.roster.name}</span>
      </div>
      <div className="overflow-x-auto">{nav}</div>
      <div className="overflow-x-auto">{entries}</div>
    </nav>
  );

  return (
    <nav aria-label="Navigation principale staff" className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-3 mt-3 space-y-2 rounded-xl border bg-[#0D0D0D] p-3" style={{ borderColor: branding.structure.primaryColor + "55" }}>
        <div className="flex items-center gap-2">
          {branding.structure.logoUrl ? <img src={branding.structure.logoUrl} alt="" className="h-11 w-11 shrink-0 rounded-lg object-contain"/> :
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-[11px] font-black" style={{color:branding.structure.secondaryColor}}>{branding.structure.name.slice(0,2).toUpperCase()}</div>}
          <div className="min-w-0"><p className="text-[11px] font-black uppercase tracking-wider" style={{color:branding.structure.primaryColor}}>{branding.structure.name}</p><p className="text-[10px] text-slate-500">Structure esport</p></div>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 p-2">
          {branding.roster.logoUrl ? <img src={branding.roster.logoUrl} alt="" className="h-8 w-8 shrink-0 object-contain"/> : <Shield size={20} className="text-slate-400"/>}
          <div className="min-w-0"><p className="truncate text-xs font-black text-white">{branding.roster.name}</p><p className="text-[10px] text-slate-500">{branding.roster.gameEdition} · roster actif</p></div>
        </div>
      </div>
      {nav}
      {entries}
      <p className="px-6 pb-4 text-[11px] text-slate-600">5 rubriques • Outils groupés par usage</p>
    </nav>
  );
}
