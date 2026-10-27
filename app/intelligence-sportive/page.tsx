"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity, ArrowLeft, ArrowUpRight, BarChart3, CalendarDays, ChevronRight,
  CircleHelp, Filter, Goal, RefreshCw, Search, Shield, Target, TrendingDown,
  TrendingUp, Trophy, Users,
} from "lucide-react";
import type {
  FormTrend, Role, PlayerFormReport, RolePerformanceReport,
  PairReport, SportIntelligenceData,
} from "@/lib/sport-intelligence";

type ResponseData = SportIntelligenceData & {
  seasonId: string;
  seasons: { id: number; name: string; isActive: boolean }[];
  rules: {
    formRecent: number; formPrevious: number; formMinimum: number;
    formChangeThreshold: number; roleMinimum: number; pairMinimum: number;
  };
};

type Tab = "form" | "roles" | "pairs";
const CLUB_LOGO = "/logo-gx-nova.png";
const ROLE_NAMES: Record<Role, string> = {
  goalkeeper: "Gardiens", defender: "Défenseurs",
  midfielder: "Milieux", forward: "Attaquants",
};
const ROLE_ABBREV: Record<Role, string> = {
  goalkeeper: "GK", defender: "DEF", midfielder: "MIL", forward: "ATT",
};
const TAB_NAMES: Record<Tab, string> = {
  form: "Forme des joueurs", roles: "Analyse par poste", pairs: "Associations",
};

function show(value: number | null, digits = 2): string {
  return value === null || !Number.isFinite(value) ? "—" : value.toFixed(digits).replace(".", ",");
}
function displayDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}
function trendText(value: FormTrend): string {
  return value === "up" ? "En hausse" : value === "down" ? "En baisse"
    : value === "stable" ? "Stable" : "Données limitées";
}
function trendColors(value: FormTrend): string {
  return value === "up" ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300"
    : value === "down" ? "border-rose-400/25 bg-rose-400/10 text-rose-300"
    : value === "stable" ? "border-cyan-400/20 bg-cyan-400/10 text-cyan-300"
    : "border-white/10 bg-white/[0.04] text-slate-400";
}
function FormDelta({ player }: { player: PlayerFormReport }) {
  return (
    <span className={"inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-black " + trendColors(player.trend)}>
      {player.trend === "up" ? <TrendingUp size={14}/> : player.trend === "down" ? <TrendingDown size={14}/> : <Activity size={14}/>}
      {trendText(player.trend)}
      {player.ratingDelta !== null && <span>{player.ratingDelta > 0 ? "+" : ""}{show(player.ratingDelta)}</span>}
    </span>
  );
}
function SmallStat({ label, value, subtitle }: { label: string; value: string | number; subtitle?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0b1b2a]/85 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
      {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
    </div>
  );
}
function CompareMetric({ label, before, after }: { label: string; before: number | null; after: number | null }) {
  const max = Math.max(10, before ?? 0, after ?? 0);
  return (
    <div className="min-w-0">
      <div className="mb-2 flex items-center justify-between gap-2 text-[11px] font-bold text-slate-400">
        <span>{label}</span>
        <span className="text-white">{show(before)} <span className="text-slate-500">→</span> {show(after)}</span>
      </div>
      <div className="relative h-2 overflow-hidden rounded-full bg-white/[0.07]">
        <div className="absolute inset-y-0 left-0 rounded-full bg-slate-600" style={{ width: ((before ?? 0) / max * 100) + "%" }}/>
        <div className="absolute inset-y-0 left-0 rounded-full bg-cyan-400/80" style={{ width: ((after ?? 0) / max * 100) + "%", maxWidth: "100%" }}/>
      </div>
    </div>
  );
}
function PlayerFormCard({ player }: { player: PlayerFormReport }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-[#0a1929] p-4 transition hover:border-cyan-400/30 lg:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-yellow-400/20 bg-yellow-400/[0.07] text-xs font-black text-yellow-300">
            {ROLE_ABBREV[player.role]}
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-base font-black text-white" title={player.name}>{player.name}</h3>
            <p className="mt-1 text-xs text-slate-400">{ROLE_NAMES[player.role]} · {player.appearances} match{player.appearances > 1 ? "s" : ""}</p>
          </div>
        </div>
        <FormDelta player={player}/>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-black/20 p-3 text-center">
        <div><p className="text-[10px] font-semibold text-slate-500">5 précédents</p><p className="mt-1 text-xl font-black">{show(player.previousRating)}</p></div>
        <div className="flex items-center justify-center"><ChevronRight className="text-yellow-400" size={22}/></div>
        <div><p className="text-[10px] font-semibold text-cyan-300">5 derniers</p><p className="mt-1 text-xl font-black text-cyan-300">{show(player.recentRating)}</p></div>
      </div>
      <div className="mt-4"><CompareMetric label="Note EA moyenne" before={player.previousRating} after={player.recentRating}/></div>
      <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-bold text-slate-400">
        <span className="rounded-lg border border-white/10 px-2 py-1">Buts récents : <strong className="text-white">{player.recentGoals}</strong></span>
        <span className="rounded-lg border border-white/10 px-2 py-1">PD : <strong className="text-white">{player.recentAssists}</strong></span>
        <span className="rounded-lg border border-white/10 px-2 py-1">Tacles : <strong className="text-white">{player.recentTackles}</strong></span>
        {player.role === "goalkeeper" && <span className="rounded-lg border border-white/10 px-2 py-1">Arrêts : <strong className="text-white">{player.recentSaves}</strong></span>}
      </div>
      <p className="mt-3 text-[11px] text-slate-500">Échantillons : {player.previousCount} avant · {player.recentCount} récents. {player.trend === "insufficient" ? "Évolution non interprétable." : "Seuil de variation : ±0,35 point."}</p>
    </article>
  );
}
function roleFocus(role: Role): string {
  return role === "goalkeeper" ? "Arrêts / match" : role === "defender"
    ? "Tacles / match" : role === "midfielder" ? "PD / match" : "Buts / match";
}
function rolePrimary(report: RolePerformanceReport): number {
  return report.role === "goalkeeper" ? report.savesPerMatch
    : report.role === "defender" ? report.tacklesPerMatch
    : report.role === "midfielder" ? report.assistsPerMatch : report.goalsPerMatch;
}
function RoleCard({ report, index }: { report: RolePerformanceReport; index: number }) {
  const focus = roleFocus(report.role);
  return (
    <article className="rounded-2xl border border-white/10 bg-[#0a1929] p-4 hover:border-yellow-400/20">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10 text-sm font-black text-cyan-300">{String(index + 1).padStart(2, "0")}</span>
          <div className="min-w-0">
            <h3 className="truncate font-black" title={report.name}>{report.name}</h3>
            <p className="mt-1 text-xs text-slate-400">{report.matches} matchs à ce poste · {ROLE_ABBREV[report.role]}</p>
          </div>
        </div>
        <span className="shrink-0 rounded-xl border border-yellow-400/20 bg-yellow-400/[0.07] px-3 py-2 text-sm font-black text-yellow-300">★ {show(report.rating)}</span>
      </div>
      <div className="mt-4 rounded-xl border border-cyan-400/15 bg-cyan-400/[0.05] p-4">
        <p className="text-[10px] font-bold uppercase tracking-wide text-cyan-300">{focus}</p>
        <p className="mt-1 text-3xl font-black">{show(rolePrimary(report))}</p>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {(report.role === "goalkeeper"
          ? [["Clean sheets", report.cleanSheetCount.toString()], ["MVP EA", report.mvpCount.toString()], ["Passes", (show(report.passesPct, 1) + " %")], ["Arrêts / match", show(report.savesPerMatch)]]
          : report.role === "defender"
          ? [["% tacles", (show(report.tacklesPct, 1) + " %")], ["Passes", (show(report.passesPct, 1) + " %")], ["Clean sheets", report.cleanSheetCount.toString()], ["MVP EA", report.mvpCount.toString()]]
          : report.role === "midfielder"
          ? [["Passes", (show(report.passesPct, 1) + " %")], ["Tacles / match", show(report.tacklesPerMatch)], ["Buts / match", show(report.goalsPerMatch)], ["MVP EA", report.mvpCount.toString()]]
          : [["Tirs / match", show(report.shotsPerMatch)], ["PD / match", show(report.assistsPerMatch)], ["Passes", (show(report.passesPct, 1) + " %")], ["MVP EA", report.mvpCount.toString()]]
        ).map(([label, value]) => (
          <div key={label} className="rounded-xl bg-white/[0.035] p-3">
            <p className="text-[10px] font-semibold text-slate-500">{label}</p>
            <p className="mt-1 text-sm font-black">{value}</p>
          </div>
        ))}
      </div>
    </article>
  );
}
function PairCard({ pair, rank }: { pair: PairReport; rank: number }) {
  const delta = pair.winRate - pair.baselineWinRate;
  return (
    <article className="rounded-2xl border border-white/10 bg-[#0a1929] p-4 transition hover:border-cyan-400/30 lg:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-400/15 bg-cyan-400/5 text-xs font-black text-cyan-300">{String(rank).padStart(2, "0")}</span>
          <div className="min-w-0">
            <h3 className="font-black">{pair.playerA} <span className="text-yellow-400">+</span> {pair.playerB}</h3>
            <p className="mt-1 text-xs text-slate-400">{pair.games} matchs sur la même feuille EA</p>
          </div>
        </div>
        <div className="text-right"><p className="text-2xl font-black text-yellow-300">{show(pair.pointsPerMatch)}</p><p className="text-[10px] font-semibold text-slate-400">points / match</p></div>
      </div>
      <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-white/5">
        <div className="bg-emerald-400" style={{ width: (pair.wins / pair.games * 100) + "%" }}/>
        <div className="bg-yellow-400" style={{ width: (pair.draws / pair.games * 100) + "%" }}/>
        <div className="bg-rose-400" style={{ width: (pair.losses / pair.games * 100) + "%" }}/>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
        <span><span className="text-emerald-300">{pair.wins} V</span> · <span className="text-yellow-300">{pair.draws} N</span> · <span className="text-rose-300">{pair.losses} D</span></span>
        <span className="text-slate-300">{show(pair.winRate, 1)} % victoires</span>
      </div>
      <p className="mt-3 text-xs text-slate-500">Écart au taux de victoire global : <span className={delta > 0 ? "text-emerald-300" : delta < 0 ? "text-rose-300" : "text-slate-300"}>{delta > 0 ? "+" : ""}{show(delta, 1)} pts</span>. Comparaison descriptive.</p>
    </article>
  );
}

export default function SportIntelligencePage() {
  const [data, setData] = useState<ResponseData | null>(null);
  const [season, setSeason] = useState("all");
  const [activeTab, setActiveTab] = useState<Tab>("form");
  const [role, setRole] = useState<Role | "all">("all");
  const [search, setSearch] = useState("");
  const [minSamples, setMinSamples] = useState(true);
  const [refreshId, setRefreshId] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        setLoading(true);
        setError("");
        const response = await fetch("/api/sport-intelligence?seasonId=" + encodeURIComponent(season), {
          cache: "no-store", signal: controller.signal,
        });
        const json = await response.json();
        if (!response.ok) throw new Error(json.details ?? json.error ?? "Données indisponibles");
        if (!controller.signal.aborted) setData(json as ResponseData);
      } catch (err) {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Erreur de chargement");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [season, refreshId]);

  const normalizedSearch = search.trim().toLocaleLowerCase("fr-FR");
  const players = useMemo(() => (data?.players ?? []).filter((player) =>
    (role === "all" || player.role === role) &&
    (!normalizedSearch || player.name.toLocaleLowerCase("fr-FR").includes(normalizedSearch)) &&
    (!minSamples || player.trend !== "insufficient")
  ), [data, role, normalizedSearch, minSamples]);
  const rolePlayers = useMemo(() => (data?.roles ?? []).filter((player) =>
    (role === "all" || player.role === role) &&
    (!normalizedSearch || player.name.toLocaleLowerCase("fr-FR").includes(normalizedSearch)) &&
    (!minSamples || player.matches >= 5)
  ).sort((a,b) => rolePrimary(b) - rolePrimary(a) || b.matches - a.matches), [data, role, normalizedSearch, minSamples]);
  const pairs = useMemo(() => (data?.pairs ?? []).filter((pair) =>
    !normalizedSearch ||
    pair.playerA.toLocaleLowerCase("fr-FR").includes(normalizedSearch) ||
    pair.playerB.toLocaleLowerCase("fr-FR").includes(normalizedSearch)
  ), [data, normalizedSearch]);
  const trendsUp = (data?.players ?? []).filter((p) => p.trend === "up").length;
  const trendsDown = (data?.players ?? []).filter((p) => p.trend === "down").length;

  return (
    <main className="min-h-screen bg-[#030914] pb-16 text-white">
      <div className="border-b border-white/10 bg-[#06111f]">
        <div className="mx-auto flex max-w-[1700px] flex-wrap items-center justify-between gap-4 px-5 py-5 lg:px-8">
          <div className="flex items-center gap-4">
            <a href="/" aria-label="Retour au cockpit" className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-400 hover:text-yellow-300"><ArrowLeft size={19}/></a>
            <img src={CLUB_LOGO} alt="GX NOVA" className="h-14 w-14 rounded-xl object-contain"/>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-yellow-400">GX NOVA • FC27 / STAFF</p>
              <h1 className="mt-1 text-xl font-black sm:text-3xl">Intelligence <span className="text-cyan-300">sportive</span></h1>
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-[11px] font-bold text-slate-400">Périmètre
              <select value={season} onChange={(e) => setSeason(e.target.value)} className="mt-1 block min-w-[175px] rounded-xl border border-white/10 bg-[#0b1b2a] px-3 py-3 text-sm font-bold text-white">
                <option value="all">Toutes les saisons</option>
                {(data?.seasons ?? []).map((item) => <option key={item.id} value={item.id}>{item.name}{item.isActive ? " • en cours" : ""}</option>)}
              </select>
            </label>
            <button type="button" onClick={() => setRefreshId((v) => v + 1)} disabled={loading} className="flex h-11 items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/[0.06] px-4 text-xs font-black text-cyan-300 hover:bg-cyan-400/10 disabled:opacity-50"><RefreshCw size={15} className={loading ? "animate-spin" : ""}/> Actualiser</button>
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-[1700px] space-y-6 px-5 py-6 lg:px-8">
        <section className="relative overflow-hidden rounded-[28px] border border-cyan-400/20 bg-gradient-to-br from-[#0b2334] via-[#071524] to-[#080f1e] p-5 lg:p-7">
          <div className="pointer-events-none absolute -right-12 -top-12 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl"/>
          <div className="relative z-10">
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.15em] text-yellow-300"><Target size={16}/> Analyse basée sur les matchs EA</p>
            <h2 className="mt-3 text-2xl font-black lg:text-3xl">Comprendre la forme. Comparer les postes. Explorer les duos.</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">Les statistiques corrigées par le staff sont utilisées pour les notes et les actions individuelles. Les résultats des rencontres restent les scores EA. Aucun indice tactique ou xG n'est inventé.</p>
          </div>
        </section>
        {error && <div role="alert" className="rounded-xl border border-rose-400/30 bg-rose-400/10 p-4 text-sm text-rose-200">{error}</div>}
        {loading && <div role="status" className="rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-5 text-sm font-bold text-cyan-200">Chargement des performances EA…</div>}
        {data && (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <SmallStat label="Matchs analysés" value={data.matches} subtitle={displayDate(data.minDate) + " → " + displayDate(data.maxDate)}/>
              <SmallStat label="Joueurs étudiés" value={data.players.length} subtitle="Effectif actif avec données EA"/>
              <SmallStat label="Forme en hausse" value={trendsUp} subtitle={trendsDown + " joueur(s) en baisse"}/>
              <SmallStat label="Associations évaluables" value={data.pairs.length} subtitle="Au moins 8 matchs communs"/>
            </div>
            {data.truncated && <div className="rounded-xl border border-amber-400/20 bg-amber-400/[0.06] p-3 text-sm text-amber-200">Historique limité aux 250 rencontres les plus récentes pour conserver de bonnes performances.</div>}
            <nav aria-label="Types d'analyses" className="flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-[#081626] p-2">
              {(["form","roles","pairs"] as const).map((tab) =>
                <button type="button" key={tab} onClick={() => { setActiveTab(tab); setSearch(""); setRole("all"); }}
                  className={"flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-black transition " + (activeTab === tab ? "bg-yellow-400 text-[#04101d]" : "text-slate-400 hover:bg-white/5 hover:text-white")}>
                  {tab === "form" ? <Activity size={17}/> : tab === "roles" ? <Shield size={17}/> : <Users size={17}/>}
                  {TAB_NAMES[tab]}
                </button>
              )}
            </nav>
            <section className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-2 text-xs font-bold text-slate-400"><Filter size={15}/> Filtres</span>
                {activeTab !== "pairs" && <select value={role} onChange={(e) => setRole(e.target.value as Role | "all")} aria-label="Filtrer les postes"
                  className="rounded-xl border border-white/10 bg-[#0a1929] px-3 py-2.5 text-xs font-bold text-white">
                  <option value="all">Tous les postes</option>
                  {(["goalkeeper","defender","midfielder","forward"] as const).map((value) => <option key={value} value={value}>{ROLE_NAMES[value]}</option>)}
                </select>}
                {activeTab !== "pairs" && <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#0a1929] px-3 py-2.5 text-xs font-bold text-slate-300">
                  <input type="checkbox" checked={minSamples} onChange={(e) => setMinSamples(e.target.checked)} className="accent-yellow-400"/>
                  Échantillons suffisants
                </label>}
              </div>
              <label className="flex w-full items-center gap-2 rounded-xl border border-white/10 bg-[#0a1929] px-3 py-2.5 text-xs text-slate-400 sm:max-w-[300px]">
                <Search size={16}/>
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un joueur…" className="w-full bg-transparent py-1 font-bold text-white outline-none placeholder:text-slate-600" aria-label="Rechercher un joueur"/>
              </label>
            </section>
            {activeTab === "form" && (
              <section>
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-black">Évolution des notes EA</h2>
                    <p className="mt-1 text-sm text-slate-400">5 dernières apparitions contre les 5 précédentes, avec un minimum de 3 notes par période. Une variation de 0,35 point sert de seuil indicatif.</p>
                  </div>
                  <span className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-slate-400">{players.length} joueur(s)</span>
                </div>
                {players.length ? <div className="grid gap-4 xl:grid-cols-2">{players.map((player) => <PlayerFormCard key={player.key} player={player}/>)}</div>
                  : <p className="rounded-xl border border-white/10 p-8 text-center text-sm text-slate-400">Aucun joueur ne correspond à ces filtres. Désactive « Échantillons suffisants » pour voir les profils récents.</p>}
              </section>
            )}
            {activeTab === "roles" && (
              <section>
                <div className="mb-4">
                  <h2 className="text-xl font-black">Statistiques adaptées au poste</h2>
                  <p className="mt-1 text-sm text-slate-400">Gardiens : arrêts · Défenseurs : tacles · Milieux : passes décisives · Attaquants : buts. Classement par indicateur du poste, pas de note composite arbitraire.</p>
                </div>
                {role === "all" ? (["goalkeeper","defender","midfielder","forward"] as const).map((r) => {
                  const listed = rolePlayers.filter((item) => item.role === r);
                  return <div key={r} className="mb-7">
                    <div className="mb-3 flex items-center justify-between"><h3 className="text-base font-black text-cyan-300">{ROLE_NAMES[r]} <span className="text-xs font-semibold text-slate-500">· {listed.length} profils</span></h3><p className="text-xs text-slate-500">{roleFocus(r)}</p></div>
                    {listed.length ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{listed.map((player, index) => <RoleCard key={player.key + player.role} report={player} index={index}/>)}</div> : <p className="rounded-xl border border-white/10 p-4 text-xs text-slate-500">Aucune donnée suffisante pour ce poste.</p>}
                  </div>;
                }) : rolePlayers.length ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{rolePlayers.map((player,index) => <RoleCard key={player.key + player.role} report={player} index={index}/>)}</div>
                  : <p className="rounded-xl border border-white/10 p-8 text-center text-sm text-slate-400">Aucun joueur dans cette catégorie pour le périmètre choisi.</p>}
                <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-slate-500"><CircleHelp size={14} className="mt-0.5 shrink-0"/>EA transmet ici seulement quatre familles de postes, sans distinguer de manière fiable DC, MDC ou MOC. Les actions restent contextualisées par le poste réellement occupé lors du match.</p>
              </section>
            )}
            {activeTab === "pairs" && (
              <section>
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-black">Associations de joueurs</h2>
                    <p className="mt-1 max-w-3xl text-sm text-slate-400">Duos présents sur au moins 8 feuilles de match communes, triés par points / match (3 pour une victoire, 1 pour un nul). Attention : une bonne série n'est pas une preuve qu'un duo cause la victoire.</p>
                  </div>
                  <span className="rounded-xl border border-cyan-400/20 bg-cyan-400/[0.06] px-3 py-2 text-xs font-bold text-cyan-300">Taux global GX : {show(data.teamWinRate,1)} %</span>
                </div>
                {pairs.length ? <div className="grid gap-4 xl:grid-cols-2">{pairs.map((pair,index) => <PairCard key={pair.key} pair={pair} rank={index+1}/>)}</div>
                  : <p className="rounded-xl border border-white/10 p-8 text-center text-sm text-slate-400">Aucune association répondant aux critères. Élargis la saison ou retire le filtre de recherche.</p>}
                <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-slate-500"><CircleHelp size={14} className="mt-0.5 shrink-0"/>Les co-présences sont établies à partir des feuilles EA, sans certifier que les joueurs sont restés simultanément sur le terrain pendant tout le match. Il faut comparer les contextes (adversaires, composition, compétition) avant d'en tirer une consigne.</p>
              </section>
            )}
            <footer className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 text-xs leading-6 text-slate-400">
              <p className="font-bold text-yellow-300">Méthode GX NOVA</p>
              <p>Statistiques calculées sur les matchs EA importés et leurs corrections staff. Les notes représentent une moyenne par apparition, non pondérée par les minutes. Les pourcentages passes/tacles proviennent des tentatives cumulées. Les matchs archivés des anciens joueurs sont conservés, mais les joueurs actuellement archivés ne figurent pas dans ce classement actif.</p>
              <div className="mt-3 flex flex-wrap gap-3">
                <a href="/match-center" className="inline-flex items-center gap-1 font-black text-cyan-300 hover:text-white"><Goal size={14}/> Match Center <ArrowUpRight size={13}/></a>
                <a href="/debrief-studio" className="inline-flex items-center gap-1 font-black text-cyan-300 hover:text-white"><Trophy size={14}/> Débrief Studio <ArrowUpRight size={13}/></a>
                <a href="/programme" className="inline-flex items-center gap-1 font-black text-cyan-300 hover:text-white"><CalendarDays size={14}/> Programme <ArrowUpRight size={13}/></a>
              </div>
            </footer>
          </>
        )}
      </div>
    </main>
  );
}
