"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, ArrowRight, BookOpen, ChevronDown, ChevronUp, Copy,
  ExternalLink, FileText, Link as LinkIcon,
  MonitorPlay, Plus, Save, Trash2, Video, X,
} from "lucide-react";
import {
  type DebriefChapter, type DebriefMedia, isEveningDate,
  makeDefaultChapters, safeHttpsUrl, videoEmbedUrl,
} from "@/lib/debrief-studio";

type ReportMatch = {
  id: number;
  time: string;
  opponent: string;
  goalsFor: number;
  goalsAgainst: number;
  competitionName: string | null;
  competitionShortName: string | null;
};
type EveningReport = {
  matches: ReportMatch[];
  totals: { matches: number; wins: number; draws: number; losses: number; goalsFor: number; goalsAgainst: number };
};
type StudioResponse = {
  chapters: DebriefChapter[];
  updatedAt: string | null;
  currentUser: { role: "admin" | "staff" | "viewer" };
  error?: string;
  details?: string;
};

function todayKey() {
  const parts = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const find = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${find("year")}-${find("month")}-${find("day")}`;
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}

function MediaPreview({ media, presentation = false }: {
  media: DebriefMedia;
  presentation?: boolean;
}) {
  const host = typeof window !== "undefined" ? window.location.hostname : "localhost";
  const embed = media.kind === "video" ? videoEmbedUrl(media.url, host) : null;
  return (
    <figure className="overflow-hidden rounded-2xl border border-white/10 bg-[#030914]">
      <div className="relative aspect-video w-full overflow-hidden bg-black">
        {embed ? (
          <iframe
            title={media.caption || "Extrait de match"}
            src={embed}
            className="h-full w-full"
            allow="accelerometer; autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            loading={presentation ? "eager" : "lazy"}
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : media.kind === "image" && safeHttpsUrl(media.url) ? (
          // Images saisies par le staff ; hôtes externes non listés dans next/image.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={media.url} alt={media.caption || "Capture d'écran de match"} className="h-full w-full object-contain"/>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-gray-500">Média indisponible.</div>
        )}
      </div>
      <figcaption className="flex items-center justify-between gap-2 px-3 py-2 text-xs text-gray-400">
        <span className="truncate">{media.caption || (media.kind === "video" ? "Clip vidéo" : "Capture")}</span>
        <a href={media.url} target="_blank" rel="noreferrer noopener" className="shrink-0 text-cyan-300 hover:underline" title="Ouvrir le média dans un autre onglet">
          <ExternalLink size={15} />
        </a>
      </figcaption>
    </figure>
  );
}

function ChapterBody({ chapter, presentation = false }: {
  chapter: DebriefChapter;
  presentation?: boolean;
}) {
  return (
    <div className={`grid gap-6 ${chapter.media.length ? "xl:grid-cols-[1.3fr_1fr]" : ""}`}>
      {chapter.media.length > 0 && (
        <div className="grid content-start gap-4">
          {chapter.media.map((media) => <MediaPreview key={media.id} media={media} presentation={presentation}/>)}
        </div>
      )}
      <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">
        <p className="mb-4 text-[11px] font-black uppercase tracking-[0.2em] text-cyan-300">L&apos;analyse du staff</p>
        <p className="whitespace-pre-wrap text-base leading-8 text-gray-200">
          {chapter.analysis.trim() || "Aucune analyse rédigée pour ce chapitre."}
        </p>
      </div>
    </div>
  );
}

export default function DebriefStudioPage() {
  const [date, setDate] = useState(todayKey);
  const [chapters, setChapters] = useState<DebriefChapter[]>(makeDefaultChapters);
  const [activeId, setActiveId] = useState("");
  const [role, setRole] = useState<"admin" | "staff" | "viewer">("viewer");
  const [report, setReport] = useState<EveningReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [presenting, setPresenting] = useState(false);
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaKind, setMediaKind] = useState<"video" | "image">("video");
  const [mediaCaption, setMediaCaption] = useState("");

  const canEdit = role === "admin" || role === "staff";
  const activeIndex = Math.max(0, chapters.findIndex((chapter) => chapter.id === activeId));
  const active = chapters[activeIndex];

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("date");
    if (requested && isEveningDate(requested)) setDate(requested);
  }, []);

  const loadStudio = useCallback(async () => {
    if (!isEveningDate(date)) return;
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const [studioResponse, reportResponse] = await Promise.all([
        fetch(`/api/debrief-studio?date=${encodeURIComponent(date)}`, { cache: "no-store" }),
        fetch(`/api/evening-report?date=${encodeURIComponent(date)}`, { cache: "no-store" }),
      ]);
      const studio = (await studioResponse.json()) as StudioResponse;
      if (!studioResponse.ok) {
        throw new Error(studio.details ? `${studio.error} ${studio.details}` : studio.error || "Impossible de charger le studio.");
      }
      const fetchedChapters = studio.chapters.length ? studio.chapters : makeDefaultChapters();
      setChapters(fetchedChapters);
      setActiveId(fetchedChapters[0]?.id ?? "");
      setRole(studio.currentUser.role);
      setSavedAt(studio.updatedAt);
      setDirty(false);
      if (reportResponse.ok) {
        const data = (await reportResponse.json()) as EveningReport;
        setReport(data);
      } else {
        setReport(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Le studio n'a pas pu être chargé.");
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => { void loadStudio(); }, [loadStudio]);

  useEffect(() => {
    if (!presenting) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (event.key === "Escape") setPresenting(false);
      if (event.key === "ArrowRight") setActiveId((id) => {
        const index = chapters.findIndex((chapter) => chapter.id === id);
        return chapters[Math.min(chapters.length - 1, index + 1)]?.id ?? id;
      });
      if (event.key === "ArrowLeft") setActiveId((id) => {
        const index = chapters.findIndex((chapter) => chapter.id === id);
        return chapters[Math.max(0, index - 1)]?.id ?? id;
      });
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [chapters, presenting]);

  const chapterCount = chapters.length;
  const mediaCount = useMemo(() => chapters.reduce((count, chapter) => count + chapter.media.length, 0), [chapters]);

  function changeChapter(id: string, patch: Partial<DebriefChapter>) {
    if (!canEdit) return;
    setChapters((current) => current.map((chapter) => chapter.id === id ? { ...chapter, ...patch } : chapter));
    setDirty(true);
    setMessage("");
  }

  function addChapter() {
    if (!canEdit || chapters.length >= 12) return;
    const chapter = { id: crypto.randomUUID(), title: "Nouveau chapitre", analysis: "", media: [] };
    setChapters((current) => [...current, chapter]);
    setActiveId(chapter.id);
    setDirty(true);
  }

  function moveChapter(direction: -1 | 1) {
    if (!canEdit) return;
    const nextIndex = activeIndex + direction;
    if (nextIndex < 0 || nextIndex >= chapters.length) return;
    setChapters((current) => {
      const next = [...current];
      [next[activeIndex], next[nextIndex]] = [next[nextIndex], next[activeIndex]];
      return next;
    });
    setDirty(true);
  }

  function removeChapter() {
    if (!canEdit || chapters.length <= 1 || !active) return;
    const next = chapters.filter((chapter) => chapter.id !== active.id);
    setChapters(next);
    setActiveId(next[Math.min(activeIndex, next.length - 1)].id);
    setDirty(true);
  }

  function addMedia() {
    if (!active || !canEdit) return;
    if (active.media.length >= 8) { setError("8 médias maximum par chapitre."); return; }
    const url = mediaUrl.trim();
    const valid = safeHttpsUrl(url) && (mediaKind === "image" || videoEmbedUrl(url, window.location.hostname));
    if (!valid) {
      setError("Lien non reconnu : utilise une vidéo YouTube, un clip/VOD Twitch ou une URL d'image HTTPS.");
      return;
    }
    const media: DebriefMedia = { id: crypto.randomUUID(), kind: mediaKind, url, caption: mediaCaption.trim() };
    changeChapter(active.id, { media: [...active.media, media] });
    setMediaUrl("");
    setMediaCaption("");
    setError("");
  }

  async function save() {
    if (!canEdit || saving || !dirty) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/debrief-studio", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, chapters }),
      });
      const result = await response.json() as { updatedAt?: string; error?: string; details?: string };
      if (!response.ok) throw new Error(result.details ? `${result.error} ${result.details}` : result.error ?? "Enregistrement impossible.");
      setSavedAt(result.updatedAt ?? null);
      setDirty(false);
      setMessage("Débrief enregistré dans Supabase.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'enregistrer le débrief.");
    } finally {
      setSaving(false);
    }
  }

  async function copyDiscord() {
    const output = [
      `📋 **GX NØVA — DÉBRIEF DU ${formatDate(date).toUpperCase()}**`,
      "",
      ...chapters.flatMap((chapter, index) => [
        `**${String(index + 1).padStart(2, "0")} — ${chapter.title.toUpperCase()}**`,
        chapter.analysis.trim() || "À compléter",
        ...chapter.media.map((media) => `🔗 ${media.caption || (media.kind === "image" ? "Capture" : "Clip")} : ${media.url}`),
        "",
      ]),
      "💙💛 GX NØVA — ENSEMBLE POUR PROGRESSER",
    ].join("\n");
    try {
      await navigator.clipboard.writeText(output);
      setMessage("Débrief copié : prêt à coller sur Discord.");
    } catch {
      setError("La copie a été refusée par le navigateur. Réessaie dans un contexte HTTPS.");
    }
  }

  if (loading) {
    return <main className="min-h-screen bg-[#030914] p-12 text-center text-gray-400">Chargement du Débrief Studio GX NOVA...</main>;
  }

  return (
    <main className="min-h-screen bg-[#030914] pb-12 text-white">
      <header className="border-b border-white/10 bg-[#071321] px-4 py-6 lg:px-8">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4">
          <div>
            <a href="/" className="mb-2 inline-flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-white"><ArrowLeft size={14}/> Retour au dashboard</a>
            <p className="text-[10px] font-black uppercase tracking-[0.26em] text-cyan-300">GX NOVA • FC27 • STAFF</p>
            <h1 className="text-3xl font-black">Débrief <span className="text-yellow-400">Studio</span></h1>
            <p className="mt-1 text-sm text-gray-400">Prépare ton analyse, ajoute tes clips Twitch/YouTube et présente-la en live.</p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-xs text-gray-400">Soirée
              <input type="date" value={date} onChange={(event) => {
                if (dirty && !window.confirm("Changer de soirée sans enregistrer tes modifications ?")) return;
                setDate(event.target.value);
              }} className="mt-1 block rounded-xl border border-white/10 bg-[#020913] px-3 py-2 text-sm text-white" />
            </label>
            <button type="button" onClick={() => void copyDiscord()} className="flex items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-2.5 text-sm font-bold text-cyan-300"><Copy size={16}/> Copier Discord</button>
            <button type="button" onClick={() => setPresenting(true)} className="flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-sm font-bold"><MonitorPlay size={16}/> Mode live</button>
            {canEdit && <button type="button" disabled={!dirty || saving} onClick={() => void save()} className="flex items-center gap-2 rounded-xl bg-yellow-400 px-4 py-2.5 text-sm font-black text-black disabled:opacity-40"><Save size={16}/>{saving ? "Enregistrement..." : "Enregistrer"}</button>}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1600px] px-4 py-6 lg:px-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 text-sm text-gray-400">
          <span>{formatDate(date)} • {chapterCount} chapitres • {mediaCount} médias • {report?.totals.matches ?? 0} matchs EA</span>
          <span>{dirty ? "● Modifications non enregistrées" : savedAt ? `Enregistré le ${new Date(savedAt).toLocaleString("fr-FR")}` : "Nouveau débrief"}</span>
        </div>
        {error && <div role="alert" className="mb-4 rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-200">{error}</div>}
        {message && <div role="status" className="mb-4 rounded-xl border border-cyan-400/30 bg-cyan-400/10 p-4 text-sm text-cyan-200">{message}</div>}
        {!canEdit && <p className="mb-4 text-xs font-bold text-gray-500">Lecture seule : édition réservée aux rôles Admin et Staff.</p>}

        <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
          {chapters.map((chapter, index) => (
            <button key={chapter.id} type="button" onClick={() => { setActiveId(chapter.id); setError(""); }}
              className={`flex min-w-[140px] max-w-[220px] flex-col gap-1 rounded-xl border px-4 py-3 text-left transition ${active?.id === chapter.id ? "border-yellow-400/50 bg-yellow-400/10 text-white" : "border-white/10 bg-[#091626] text-gray-400 hover:border-cyan-400/40"}`}>
              <span className={`text-xl font-black ${active?.id === chapter.id ? "text-yellow-400" : "text-cyan-400"}`}>{String(index + 1).padStart(2, "0")}</span>
              <span className="w-full truncate text-xs font-bold" title={chapter.title}>{chapter.title}</span>
            </button>
          ))}
          {canEdit && chapters.length < 12 && <button type="button" onClick={addChapter} className="flex min-w-[110px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 text-xs text-gray-400 hover:border-yellow-400/50"><Plus size={18}/> Chapitre</button>}
        </div>

        {active && <div className="grid gap-5 xl:grid-cols-[minmax(0,440px)_minmax(0,1fr)]">
          <section className="rounded-3xl border border-white/10 bg-[#091626] p-5">
            <div className="mb-4 flex items-center justify-between gap-2">
              <p className="text-xs font-black uppercase tracking-[0.15em] text-yellow-300"><BookOpen size={15} className="mr-2 inline"/> Chapitre {String(activeIndex + 1).padStart(2, "0")}</p>
              {canEdit && <div className="flex gap-1">
                <button type="button" title="Déplacer à gauche" disabled={activeIndex === 0} onClick={() => moveChapter(-1)} className="rounded-lg p-2 text-gray-400 hover:text-white disabled:opacity-30"><ChevronUp size={16}/></button>
                <button type="button" title="Déplacer à droite" disabled={activeIndex === chapters.length - 1} onClick={() => moveChapter(1)} className="rounded-lg p-2 text-gray-400 hover:text-white disabled:opacity-30"><ChevronDown size={16}/></button>
                <button type="button" title="Supprimer le chapitre" disabled={chapters.length <= 1} onClick={() => { if (window.confirm("Supprimer ce chapitre ?")) removeChapter(); }} className="rounded-lg p-2 text-red-300 hover:text-red-200 disabled:opacity-30"><Trash2 size={16}/></button>
              </div>}
            </div>
            <label className="block text-xs font-bold text-gray-400">Titre du chapitre
              <input value={active.title} maxLength={100} disabled={!canEdit} onChange={(event) => changeChapter(active.id, { title: event.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-[#030914] px-3 py-3 text-sm text-white outline-none focus:border-yellow-400/50 disabled:opacity-60"/>
            </label>
            <label className="mt-4 block text-xs font-bold text-gray-400">Ton analyse / tes consignes
              <textarea value={active.analysis} maxLength={6000} rows={13} disabled={!canEdit} onChange={(event) => changeChapter(active.id, { analysis: event.target.value })} placeholder="Déroulement de la soirée, points forts, erreurs de placement, consignes, axes d'amélioration..." className="mt-2 w-full resize-y rounded-xl border border-white/10 bg-[#030914] px-3 py-3 text-sm leading-6 text-white outline-none focus:border-yellow-400/50 disabled:opacity-60" />
            </label>
            <p className="mt-2 text-right text-xs text-gray-600">{active.analysis.length}/6000</p>
            {activeIndex === 1 && report && (
              <div className="mt-4 rounded-xl border border-cyan-400/15 p-3">
                <p className="mb-2 text-xs font-black text-cyan-300">Matchs importés depuis EA</p>
                {report.matches.map((match) => (
                  <div key={match.id} className="flex justify-between gap-2 border-t border-white/5 py-2 text-xs text-gray-300">
                    <span>{match.time} — {match.opponent}</span><strong>{match.goalsFor}-{match.goalsAgainst}</strong>
                  </div>
                ))}
                <p className="mt-2 text-[10px] text-gray-500">Ces statistiques EA sont en lecture seule dans cette V1.</p>
              </div>
            )}
          </section>

          <section className="space-y-5">
            <div className="rounded-3xl border border-cyan-400/15 bg-[#091626] p-5">
              <div className="mb-3 flex items-center gap-2"><LinkIcon size={17} className="text-cyan-300"/><h2 className="text-base font-black">Illustrations et extraits vidéo</h2></div>
              <p className="mb-4 text-xs leading-5 text-gray-400">Colle un lien Twitch (clip ou VOD), YouTube, ou l&apos;URL HTTPS d&apos;une image. Les médias restent associés à ce chapitre.</p>
              {canEdit && <div className="grid gap-3 md:grid-cols-[145px_1fr]">
                <select value={mediaKind} onChange={(event) => setMediaKind(event.target.value as "video" | "image")} className="rounded-xl border border-white/10 bg-[#030914] px-3 py-2.5 text-sm"><option value="video">Clip vidéo</option><option value="image">Image URL</option></select>
                <input type="url" value={mediaUrl} onChange={(event) => setMediaUrl(event.target.value)} placeholder="https://www.twitch.tv/... ou https://youtu.be/..." className="min-w-0 rounded-xl border border-white/10 bg-[#030914] px-3 py-2.5 text-sm"/>
                <input value={mediaCaption} onChange={(event) => setMediaCaption(event.target.value)} placeholder="Titre / action / minute de jeu" maxLength={300} className="rounded-xl border border-white/10 bg-[#030914] px-3 py-2.5 text-sm md:col-span-2"/>
                <button type="button" onClick={addMedia} className="flex items-center justify-center gap-2 rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-black text-[#04101f] md:col-span-2"><Plus size={16}/> Ajouter au chapitre</button>
              </div>}
              {active.media.length > 0 ? (
                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  {active.media.map((media) => <div key={media.id}>
                    <MediaPreview media={media}/>
                    {canEdit && <button type="button" onClick={() => changeChapter(active.id, { media: active.media.filter((item) => item.id !== media.id) })} className="mt-2 flex items-center gap-1 text-xs text-red-300"><Trash2 size={13}/> Retirer</button>}
                  </div>)}
                </div>
              ) : <div className="mt-5 flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 py-12 text-gray-500"><Video size={30}/><p className="mt-3 text-sm">Aucun média ajouté</p></div>}
              <p className="mt-3 text-xs text-gray-500">V1 : liens externes. Import direct de fichiers et annotations tactiques prévus dans une version suivante.</p>
            </div>
            <div className="rounded-3xl border border-yellow-400/15 bg-[#091626] p-5">
              <h2 className="mb-3 text-base font-black"><FileText size={16} className="mr-2 inline text-yellow-300"/> Aperçu de la présentation</h2>
              <ChapterBody chapter={active}/>
            </div>
          </section>
        </div>}
      </div>

      {presenting && active && (
        <div role="dialog" aria-modal="true" aria-label="Présentation du débrief" className="fixed inset-0 z-[100] overflow-y-auto bg-[#030914] text-white">
          <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#06111f] px-5 py-4">
            <div><p className="text-xs font-black tracking-[0.2em] text-cyan-300">GX NOVA • DÉBRIEF LIVE</p><p className="text-sm text-gray-400">{formatDate(date)}</p></div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setActiveId(chapters[Math.max(0, activeIndex - 1)].id)} disabled={activeIndex === 0} className="rounded-lg border border-white/15 p-2 disabled:opacity-30"><ArrowLeft size={18}/></button>
              <span className="w-12 text-center text-sm font-black text-yellow-300">{activeIndex + 1}/{chapters.length}</span>
              <button type="button" onClick={() => setActiveId(chapters[Math.min(chapters.length - 1, activeIndex + 1)].id)} disabled={activeIndex === chapters.length - 1} className="rounded-lg border border-white/15 p-2 disabled:opacity-30"><ArrowRight size={18}/></button>
              <button type="button" onClick={() => setPresenting(false)} className="ml-3 flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-sm"><X size={17}/> Quitter</button>
            </div>
          </div>
          <div className="mx-auto max-w-[1600px] px-6 py-8">
            <div className="mb-6 flex flex-wrap gap-2">
              {chapters.map((chapter, index) => <button type="button" key={chapter.id} onClick={() => setActiveId(chapter.id)} className={`rounded-lg border px-3 py-2 text-sm font-bold ${chapter.id === active.id ? "border-yellow-400 text-yellow-300" : "border-white/10 text-gray-500"}`}>{String(index + 1).padStart(2, "0")}</button>)}
            </div>
            <p className="text-sm font-black uppercase tracking-[0.2em] text-yellow-300">Chapitre {String(activeIndex + 1).padStart(2, "0")}</p>
            <h2 className="mb-8 mt-2 text-4xl font-black lg:text-6xl">{active.title}</h2>
            <ChapterBody chapter={active} presentation/>
          </div>
        </div>
      )}
    </main>
  );
}
