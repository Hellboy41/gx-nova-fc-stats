"use client";
import { useClubBranding } from "@/lib/platform/use-club-branding";

import { useEffect, useMemo, useState } from "react";
import {
  Activity, AlertTriangle, ArrowLeft, ArrowUpRight, CalendarDays, CheckCircle2,
  ClipboardCopy, Goal, Lightbulb, RefreshCw, Shield, Users,
} from "lucide-react";
import { isProgrammeDateKey, programmeCanonicalWeek, programmePeriodWeeks } from "@/lib/programme-period";
import type { PairReport, PlayerFormReport, SportIntelligenceData } from "@/lib/sport-intelligence";

type ScheduleItem = {
  id: string;
  type: "competition" | "tournament";
  time: string;
  title: string;
  opponentName: string;
  notes: string;
  status: "upcoming" | "played";
};
type Event = { date: string; item: ScheduleItem };
type Player = { slot: string; playerId: string; name: string };
type Plan = {
  eventId: string;
  eventDate: string;
  formation: string;
  lineup: Player[];
  bench: Player[];
  availability: Record<string, { playerId: string; name: string; status: "available" | "maybe" | "absent" | "unknown" }>;
  notes: string;
};
type ProgrammeResponse = { schedule: Record<string, ScheduleItem[]>; error?: string; details?: string };
type PlansResponse = { plans: Plan[]; error?: string; details?: string };
type IntelligenceResponse = SportIntelligenceData & { error?: string; details?: string };

const AXES = [
  "Fermer l'axe au repli",
  "Pressing coordonné, sans sortir de sa zone",
  "Relances propres et appui-remise",
  "Créer des triangles et proposer des solutions",
  "Réagir vite aux pertes de balle",
  "Communiquer et couvrir les déplacements",
  "Exploiter la profondeur sans précipitation",
] as const;

function localDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const value = (key: string) => parts.find((part) => part.type === key)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}
function friendlyDate(date: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long", day: "numeric", month: "long",
    timeZone: "UTC",
  }).format(new Date(date + "T12:00:00Z"));
}
function normalized(name: string) {
  return name.trim().toLowerCase().replace(/^gx[_\s-]?/, "").replace(/[^a-z0-9]/g, "");
}
function formFor(player: Player, reports: PlayerFormReport[]) {
  const eaKey = player.playerId.startsWith("ea:") ? player.playerId : "ea:" + player.playerId;
  const exact = reports.find((item) => item.key === eaKey ||
    item.key === player.playerId);
  if (exact) return exact;
  // Une homonymie ne doit jamais attribuer la forme EA d'un autre joueur.
  const sameName = reports.filter((item) => normalized(item.name) === normalized(player.name));
  return sameName.length === 1 ? sameName[0] : undefined;
}
function trendLabel(report?: PlayerFormReport) {
  if (!report) return "Données EA indisponibles";
  if (report.trend === "insufficient") return "Échantillon insuffisant";
  if (report.trend === "up") return "En hausse";
  if (report.trend === "down") return "En baisse";
  return "Stable";
}
function trendColor(report?: PlayerFormReport) {
  if (!report) return "text-slate-500";
  return report.trend === "up" ? "text-emerald-300" :
    report.trend === "down" ? "text-rose-300" : "text-slate-400";
}
function eventKey(event: Event) {
  return event.date + "/" + event.item.id;
}
function programmeLink(event: Event) {
  return `/programme?weekStart=${encodeURIComponent(programmeCanonicalWeek(event.date))}&eventId=${encodeURIComponent(event.item.id)}&openPlan=1`;
}

export default function PreparationMatchPage() {
  const branding = useClubBranding();
  const [start, setStart] = useState(localDate);
  const [selectedKey, setSelectedKey] = useState("");
  const [events, setEvents] = useState<Event[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [intelligence, setIntelligence] = useState<SportIntelligenceData | null>(null);
  const [intelligenceError, setIntelligenceError] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [selectedAxes, setSelectedAxes] = useState<string[]>([]);
  const [instruction, setInstruction] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("startDate");
    if (fromUrl && isProgrammeDateKey(fromUrl)) setStart(fromUrl);
  }, []);

  useEffect(() => {
    if (!isProgrammeDateKey(start)) return;
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      setIntelligenceError("");
      setNotice("");
      try {
        const weeks = programmePeriodWeeks(start);
        const programmePromise = fetch(`/api/programme?startDate=${encodeURIComponent(start)}`, {
          cache: "no-store", signal: controller.signal,
        });
        const plansPromises = weeks.map((week) => fetch(`/api/programme/plans?weekStart=${encodeURIComponent(week)}`, {
          cache: "no-store", signal: controller.signal,
        }));
        const insightsPromise = fetch("/api/sport-intelligence?seasonId=all", {
          cache: "no-store", signal: controller.signal,
        }).then(async (response) => {
          const value = await response.json() as IntelligenceResponse;
          if (!response.ok) throw new Error(value.details ?? value.error ?? "Analyse EA indisponible");
          return { value, error: "" };
        }).catch((reason: unknown) => ({
          value: null,
          error: reason instanceof Error ? reason.message : "Analyse EA indisponible",
        }));
        const [programmeResponse, ...planResponses] = await Promise.all([programmePromise, ...plansPromises]);
        const schedule = await programmeResponse.json() as ProgrammeResponse;
        if (!programmeResponse.ok) throw new Error(schedule.details ?? schedule.error ?? "Programme inaccessible");
        const loadedPlans: Plan[] = [];
        for (const response of planResponses) {
          const result = await response.json() as PlansResponse;
          if (!response.ok) throw new Error(result.details ?? result.error ?? "Compositions inaccessibles");
          loadedPlans.push(...(result.plans ?? []));
        }
        const upcoming = Object.entries(schedule.schedule ?? {})
          .flatMap(([date, items]) => (items ?? []).filter((item) => item.status !== "played").map((item) => ({ date, item })))
          .sort((a, b) => a.date.localeCompare(b.date) || a.item.time.localeCompare(b.item.time));
        if (!controller.signal.aborted) {
          setEvents(upcoming);
          setPlans(loadedPlans);
          setSelectedKey((current) => upcoming.some((item) => eventKey(item) === current) ? current : (upcoming[0] ? eventKey(upcoming[0]) : ""));
        }
        const insight = await insightsPromise;
        if (!controller.signal.aborted) {
          setIntelligence(insight.value);
          setIntelligenceError(insight.error);
        }
      } catch (e) {
        // La requête de statistiques récupère ses erreurs sans rejet non géré.
        if (!controller.signal.aborted) {
          setError(e instanceof Error ? e.message : "Chargement impossible");
          setEvents([]);
          setPlans([]);
          setIntelligence(null);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [start, refresh]);

  const selected = events.find((event) => eventKey(event) === selectedKey) ?? events[0] ?? null;
  const plan = selected ? plans.find((item) => item.eventId === selected.item.id && item.eventDate === selected.date) ?? null : null;
  const starters = plan?.lineup ?? [];
  const bench = plan?.bench ?? [];
  const forms = intelligence?.players ?? [];
  const selectedForms = useMemo(() => starters.map((player) => ({ player, report: formFor(player, forms) })), [starters, forms]);
  const issues = useMemo(() => {
    if (!selected) return [];
    if (!plan) return ["Aucune composition enregistrée pour cette rencontre."];
    const warnings: string[] = [];
    if (starters.length !== 11) warnings.push(`XI incomplet : ${starters.length}/11 titulaires.`);
    if (!starters.some((player) => player.slot === "GK")) warnings.push("Aucun gardien dans les titulaires.");
    const unavailable = starters.filter((player) => plan.availability[player.playerId]?.status === "absent");
    const unsure = starters.filter((player) => plan.availability[player.playerId]?.status === "maybe");
    const unconfirmed = starters.filter((player) => !plan.availability[player.playerId]?.status ||
      plan.availability[player.playerId]?.status === "unknown");
    if (unavailable.length) warnings.push(`Disponibilité absente à vérifier : ${unavailable.map((p) => p.name).join(", ")}.`);
    if (unsure.length) warnings.push(`Disponibilités incertaines : ${unsure.map((p) => p.name).join(", ")}.`);
    if (unconfirmed.length) warnings.push(`${unconfirmed.length} disponibilité(s) de titulaires encore non confirmée(s).`);
    if (new Set(starters.map((player) => normalized(player.name))).size !== starters.length) warnings.push("Vérifier les joueurs renseignés plusieurs fois.");
    return warnings;
  }, [selected, plan, starters]);

  const pairs = useMemo(() => {
    if (!intelligence || starters.length < 2) return [];
    const playing = new Set(starters.map((player) => normalized(player.name)));
    return intelligence.pairs.filter((pair) =>
      playing.has(normalized(pair.playerA)) && playing.has(normalized(pair.playerB))
    ).slice(0, 4);
  }, [intelligence, starters]);
  const downPlayers = selectedForms.filter(({ report }) => report?.trend === "down");
  const topNotes = selectedForms.filter(({ report }) => report?.trend === "up");

  const suggested = [
    ...issues,
    ...(downPlayers.length ? [`Suivi de forme : ${downPlayers.map(({ player }) => player.name).slice(0, 3).join(", ")} (tendance EA en baisse ; à contextualiser).`] : []),
    ...(!issues.length && !downPlayers.length && selected ? ["Composition prête sur les critères de présence renseignés ; vérifier les rôles et les consignes collectives."] : []),
  ].slice(0, 6);

  const label = selected ? selected.item.opponentName || selected.item.title || "Événement" : "";
  const copyText = () => {
    if (!selected) return;
    const output = [
      `💙💛 **GX NØVA FC27 — BRIEFING STAFF**`,
      `📅 ${friendlyDate(selected.date)}${selected.item.time ? " · " + selected.item.time : ""}`,
      `⚔️ ${label}`,
      `🧩 Formation : ${plan?.formation ?? "à définir"}`,
      "",
      `**Titulaires (${starters.length}/11)**`,
      ...(starters.length ? starters.map((p) => `• ${p.slot} — ${p.name}`) : ["À composer dans le Programme."]),
      ...(bench.length ? ["", "**Banc**", ...bench.map((p) => `• ${p.name}`)] : []),
      ...(issues.length ? ["", "**Points à vérifier**", ...issues.map((x) => `• ${x}`)] : []),
      ...(plan?.notes ? ["", "**Notes du plan de match**", plan.notes] : []),
      ...(selectedAxes.length ? ["", "**Consignes prioritaires**", ...selectedAxes.map((x) => `• ${x}`)] : []),
      ...(instruction.trim() ? ["", "**Message complémentaire du staff**", instruction.trim().slice(0, 600)] : []),
      "", "📌 Composition et disponibilités à confirmer dans le Programme GX NOVA.",
    ].join("\n");
    navigator.clipboard.writeText(output).then(() => setNotice("Briefing copié pour Discord.")).catch(() => setNotice("Copie refusée : vérifie les permissions du navigateur."));
  };

  return (
    <main className="min-h-screen bg-[#030914] pb-16 text-white">
      <header className="border-b border-white/10 bg-[#06111f]">
        <div className="mx-auto flex max-w-[1650px] flex-wrap items-center justify-between gap-4 px-5 py-5 lg:px-8">
          <div className="flex items-center gap-3">
            <a href="/" aria-label="Retour au tableau de bord" className="rounded-xl border border-white/10 p-3 text-slate-400 hover:text-yellow-300"><ArrowLeft size={18}/></a>
            <img src={branding.roster.logoUrl || "/logo-gx-nova.png"} alt={branding.roster.name} className="h-12 w-12 object-contain"/>
            <div><p className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-300">{branding.roster.name} • {branding.roster.gameEdition} • STAFF</p><h1 className="text-xl font-black sm:text-3xl">Préparation <span className="text-cyan-300">des matchs</span></h1></div>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-xs font-bold text-slate-400">Période de 7 jours à partir du
              <input type="date" value={start} onChange={(e) => {
                if (isProgrammeDateKey(e.target.value)) {
                  setStart(e.target.value);
                  setSelectedAxes([]);
                  setInstruction("");
                }
              }}
                className="mt-1 block rounded-xl border border-white/10 bg-[#0b1d2d] px-3 py-2 text-sm text-white"/>
            </label>
            <button type="button" disabled={loading} onClick={() => setRefresh((n) => n + 1)}
              className="flex items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/5 px-4 py-2.5 text-xs font-black text-cyan-300 disabled:opacity-40">
              <RefreshCw size={15} className={loading ? "animate-spin" : ""}/> Actualiser
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1650px] space-y-5 px-5 py-6 lg:px-8">
        <section className="rounded-3xl border border-cyan-400/20 bg-gradient-to-br from-[#0d2739] to-[#071321] p-5 lg:p-7">
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-yellow-300"><Lightbulb size={17}/> Briefing de coaching</p>
          <h2 className="mt-2 text-xl font-black sm:text-2xl">Relier les compositions aux données EA, sans remplacer les décisions du staff.</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">Les compositions et les disponibilités viennent du Programme. Les tendances et les duos viennent de l'Intelligence sportive, avec corrections du staff. Aucune sélection automatique des titulaires : les décisions restent humaines.</p>
        </section>

        {error && <div role="alert" className="rounded-xl border border-rose-400/25 bg-rose-400/10 p-4 text-sm text-rose-200">{error} <button type="button" className="ml-2 underline" onClick={() => setRefresh((n) => n + 1)}>Réessayer</button></div>}
        {notice && <div role="status" className="rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-3 text-sm text-cyan-200">{notice}</div>}
        {loading && <p role="status" className="rounded-xl border border-white/10 p-5 text-sm text-slate-400">Chargement du programme, des compositions et des données EA…</p>}

        {!loading && !error && !events.length && <section className="rounded-2xl border border-white/10 bg-[#091626] p-7 text-center">
          <CalendarDays className="mx-auto text-slate-500" size={27}/>
          <h2 className="mt-3 font-black">Aucune rencontre à préparer sur cette période</h2>
          <p className="mt-2 text-sm text-slate-400">Ajoute des rencontres dans le Programme ou choisis une autre période.</p>
          <a href="/programme" className="mt-4 inline-flex items-center gap-2 text-sm font-black text-yellow-300">Ouvrir le Programme <ArrowUpRight size={15}/></a>
        </section>}

        {!loading && !error && selected && <>
          <section className="grid gap-3 lg:grid-cols-[330px_1fr]">
            <div className="rounded-2xl border border-white/10 bg-[#091626] p-4">
              <h2 className="mb-3 text-sm font-black text-cyan-300"><CalendarDays size={17} className="mr-2 inline"/> Rencontres à préparer ({events.length})</h2>
              <div className="max-h-[390px] space-y-2 overflow-y-auto">
                {events.map((event) => <button key={eventKey(event)} type="button"
                  onClick={() => { setSelectedKey(eventKey(event)); setSelectedAxes([]); setInstruction(""); setNotice(""); }}
                  className={`w-full rounded-xl border p-3 text-left ${eventKey(event) === eventKey(selected) ? "border-yellow-400/50 bg-yellow-400/[0.08]" : "border-white/10 bg-black/15 hover:bg-white/[0.04]"}`}>
                  <p className="text-xs font-bold text-slate-400">{friendlyDate(event.date)} · {event.item.time || "horaire à définir"}</p>
                  <p className="mt-1 text-sm font-black">{event.item.opponentName || event.item.title || "Adversaire à préciser"}</p>
                </button>)}
              </div>
            </div>

            <div className="rounded-2xl border border-yellow-400/15 bg-[#091626] p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-cyan-300">{friendlyDate(selected.date)} · {selected.item.time || "horaire non défini"}</p>
                  <h2 className="mt-1 text-2xl font-black">{label}</h2>
                  <p className="mt-2 text-sm text-slate-400">{plan?.formation ? `Formation : ${plan.formation}` : "Formation à définir"} · {starters.length}/11 titulaires · {bench.length} remplaçant(s)</p>
                </div>
                <a href={programmeLink(selected)} className="inline-flex items-center gap-2 rounded-xl bg-yellow-400 px-4 py-2.5 text-xs font-black text-[#06111f]">Modifier la composition <ArrowUpRight size={14}/></a>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-white/10 bg-black/20 p-3"><p className="text-xs text-slate-500">Titulaires</p><p className="mt-1 text-2xl font-black text-yellow-300">{starters.length}/11</p></div>
                <div className="rounded-xl border border-white/10 bg-black/20 p-3"><p className="text-xs text-slate-500">Sur le banc</p><p className="mt-1 text-2xl font-black">{bench.length}</p></div>
                <div className="rounded-xl border border-white/10 bg-black/20 p-3"><p className="text-xs text-slate-500">Points à vérifier</p><p className="mt-1 text-2xl font-black text-cyan-300">{issues.length}</p></div>
              </div>
              {selected.item.notes && <p className="mt-4 rounded-xl border border-white/10 bg-black/10 p-3 text-xs leading-5 text-slate-300"><strong>Programme :</strong> {selected.item.notes}</p>}
              {plan?.notes && <p className="mt-2 rounded-xl border border-yellow-400/15 bg-yellow-400/[0.04] p-3 text-xs leading-5 text-yellow-100"><strong>Notes du plan :</strong> {plan.notes}</p>}
            </div>
          </section>

          <section className="grid gap-5 xl:grid-cols-[1.2fr_1fr]">
            <div className="rounded-2xl border border-white/10 bg-[#091626] p-5">
              <div className="mb-4 flex items-center justify-between gap-2">
                <h2 className="font-black"><Users size={18} className="mr-2 inline text-yellow-300"/> XI titulaire et forme EA</h2>
                <span className="text-xs text-slate-500">{intelligence ? `${intelligence.matches} matchs EA analysés` : "EA non disponible"}</span>
              </div>
              {!starters.length && <p className="rounded-xl border border-dashed border-white/10 p-6 text-sm text-slate-400">Composition non renseignée. Ouvre le Programme pour répartir les joueurs sur les postes.</p>}
              {starters.length > 0 && <div className="grid gap-2 sm:grid-cols-2">
                {selectedForms.map(({ player, report }) => <div key={player.playerId + player.slot} className="flex items-start gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
                  <span className="min-w-12 rounded-lg border border-cyan-400/20 px-2 py-1.5 text-center text-xs font-black text-cyan-300">{player.slot}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black">{player.name}</p>
                    <p className={`mt-1 text-xs font-semibold ${trendColor(report)}`}>{trendLabel(report)}{report?.ratingDelta != null ? ` (${report.ratingDelta > 0 ? "+" : ""}${report.ratingDelta.toFixed(2)})` : ""}</p>
                    {report && <p className="mt-1 text-[11px] text-slate-500">{report.appearances} apparitions · note moyenne {report.overallRating.toFixed(2)}</p>}
                  </div>
                </div>)}
              </div>}
              {bench.length > 0 && <p className="mt-4 text-xs leading-6 text-slate-400"><strong className="text-slate-200">Banc :</strong> {bench.map((p) => p.name).join(" · ")}</p>}
              <p className="mt-3 text-[11px] leading-5 text-slate-500">Les familles de postes EA restent générales : la note ne prouve pas l'aptitude à un poste précis. Les titulaires ne sont jamais sélectionnés automatiquement.</p>
            </div>

            <div className="space-y-5">
              <div className="rounded-2xl border border-white/10 bg-[#091626] p-5">
                <h2 className="mb-4 font-black"><Shield size={18} className="mr-2 inline text-yellow-300"/> Contrôle avant session</h2>
                {issues.length ? <div className="space-y-2">{issues.map((issue, i) => <p key={i} className="flex items-start gap-2 rounded-xl border border-amber-400/20 bg-amber-400/[0.05] p-3 text-xs text-amber-200"><AlertTriangle size={15} className="mt-0.5 shrink-0"/>{issue}</p>)}</div>
                  : <p className="flex items-center gap-2 text-sm text-emerald-300"><CheckCircle2 size={19}/> Aucun blocage détecté dans la composition enregistrée.</p>}
                <div className="mt-4 space-y-2">
                  {topNotes.length > 0 && <p className="text-xs text-slate-400"><Activity className="mr-1 inline text-emerald-300" size={14}/> Forme récente en hausse : {topNotes.map(({ player }) => player.name).join(", ")}.</p>}
                  {downPlayers.length > 0 && <p className="text-xs text-slate-400"><Activity className="mr-1 inline text-rose-300" size={14}/> Forme récente en baisse : {downPlayers.map(({ player }) => player.name).join(", ")}.</p>}
                  {intelligenceError && <p role="status" className="text-xs text-amber-200">Analyse EA indisponible : {intelligenceError}</p>}
                </div>
              </div>
              <div className="rounded-2xl border border-cyan-400/15 bg-[#091626] p-5">
                <h2 className="mb-2 font-black"><Goal size={18} className="mr-2 inline text-cyan-300"/> Duos déjà observés</h2>
                <p className="mb-3 text-xs text-slate-500">Co-présences EA sur au moins 8 matchs. Ce sont des repères descriptifs, pas des garanties de performance.</p>
                {pairs.length ? <div className="space-y-2">{pairs.map((pair: PairReport) => <div key={pair.key} className="rounded-xl border border-white/10 bg-black/15 p-3">
                  <p className="text-sm font-bold">{pair.playerA} + {pair.playerB}</p>
                  <p className="mt-1 text-xs text-slate-400">{pair.games} matchs ensemble · {pair.pointsPerMatch.toFixed(2)} pts/match · {pair.winRate.toFixed(1)}% de victoires</p>
                </div>)}</div> : <p className="text-xs text-slate-500">Aucun duo avec suffisamment de matchs communs dans ce XI.</p>}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-yellow-400/20 bg-[#091626] p-5">
            <h2 className="font-black"><Lightbulb size={18} className="mr-2 inline text-yellow-300"/> Consignes pour le briefing Discord</h2>
            <p className="mt-2 text-xs text-slate-400">Sélectionne jusqu'à trois priorités du staff. Ce brouillon n'est pas enregistré dans la base : pour conserver les consignes, utilise les notes du plan dans le Programme.</p>
            {suggested.length > 0 && <div className="mt-4 rounded-xl border border-cyan-400/15 bg-cyan-400/[0.035] p-4">
              <h3 className="mb-2 text-xs font-black uppercase tracking-wider text-cyan-300">Points de vigilance basés sur les données</h3>
              {suggested.map((point, i) => <p key={i} className="mt-1 text-xs leading-5 text-slate-300">• {point}</p>)}
            </div>}
            <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {AXES.map((axis) => <label key={axis} className="flex cursor-pointer items-start gap-2 rounded-xl border border-white/10 bg-black/20 p-3 text-xs font-semibold">
                <input type="checkbox" checked={selectedAxes.includes(axis)} disabled={!selectedAxes.includes(axis) && selectedAxes.length >= 3}
                  onChange={(e) => setSelectedAxes((current) => e.target.checked ? [...current, axis].slice(0, 3) : current.filter((item) => item !== axis))}
                  className="mt-0.5 accent-yellow-400"/>{axis}
              </label>)}
            </div>
            <label className="mt-4 block text-xs font-bold text-slate-300">Message complémentaire du staff
              <textarea rows={3} maxLength={600} value={instruction} onChange={(e) => setInstruction(e.target.value)}
                placeholder="Ex. : Les DC priorisent l'axe à la relance ; les BU prennent les MDC adverses au pressing."
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#030914] p-3 text-sm font-normal text-white outline-none focus:border-yellow-400/40"/>
            </label>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button type="button" onClick={() => void copyText()} className="flex items-center gap-2 rounded-xl bg-yellow-400 px-5 py-3 text-sm font-black text-[#06111f]"><ClipboardCopy size={17}/> Copier le briefing Discord</button>
              <a href={programmeLink(selected)} className="inline-flex items-center gap-2 text-xs font-black text-cyan-300">Enregistrer les consignes dans le Programme <ArrowUpRight size={14}/></a>
            </div>
          </section>
        </>}
        <footer className="flex flex-wrap gap-5 text-xs font-bold text-slate-500">
          <a href="/programme" className="hover:text-yellow-300">Programme et compositions</a>
          <a href="/intelligence-sportive" className="hover:text-cyan-300">Intelligence sportive</a>
          <a href="/match-center" className="hover:text-cyan-300">Match Center</a>
          <a href="/debrief-studio" className="hover:text-yellow-300">Débrief Studio</a>
        </footer>
      </div>
    </main>
  );
}
