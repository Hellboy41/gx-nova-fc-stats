"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Building2, CheckCircle2, Download, ImagePlus, LoaderCircle, LockKeyhole, Palette, RotateCcw, Save, Shield, Users } from "lucide-react";
import { INSTANCE_CONFIG } from "@/lib/platform/instance-config";
import { brandingDefaults, type BrandingSettings, type BrandingResponse, type BrandingScope } from "@/lib/platform/branding";

type Draft = BrandingSettings;
const defaults = brandingDefaults();
const HEX = /^#[0-9a-f]{6}$/i;
const ATYOM_PALETTE = { primary: "#FBD046", secondary: "#FFFFFF" } as const;
function colorDistance(a: [number,number,number], b: [number,number,number]) {
  return Math.hypot(a[0]-b[0], a[1]-b[1], a[2]-b[2]);
}
function toColor(rgb: number[]) { return "#" + rgb.map(c => Math.max(0, Math.min(255, c)).toString(16).padStart(2,"0")).join(""); }
async function colorsFromFile(file: File): Promise<[string,string] | null> {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 80;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return null;
    context.drawImage(image, 0, 0, 80, 80);
    const pixels = context.getImageData(0, 0, 80, 80).data;
    const buckets = new Map<string, { rgb: [number,number,number]; count: number }>();
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i+3] < 180) continue;
      const rgb: [number,number,number] = [pixels[i],pixels[i+1],pixels[i+2]];
      const max = Math.max(...rgb), min = Math.min(...rgb);
      if (max > 242 && min > 225 || max < 35 || max - min < 35) continue;
      const rounded = rgb.map(n => Math.round(n / 24) * 24);
      const key = rounded.join(",");
      const bucket = buckets.get(key);
      if (bucket) bucket.count += 1;
      else buckets.set(key, { rgb, count: 1 });
    }
    const sorted = [...buckets.values()].sort((a,b) => b.count-a.count);
    if (!sorted.length) return null;
    const first = sorted[0].rgb;
    const second = sorted.find(entry => colorDistance(first, entry.rgb) > 125)?.rgb;
    return [toColor(first), second ? toColor(second) : "#facc15"];
  } finally {
    URL.revokeObjectURL(url);
  }
}


function safeColor(value: string, fallback: string) { return HEX.test(value) ? value : fallback; }
function blankDraft(scope: BrandingScope): Draft { return { ...defaults[scope] }; }

export default function PersonnalisationPage() {
  const [scope, setScope] = useState<BrandingScope>("roster");
  const [stored, setStored] = useState<BrandingResponse | null>(null);
  const [draft, setDraft] = useState<Draft>(blankDraft("roster"));
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [info, setInfo] = useState("");
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/branding", { cache: "no-store" });
      const json = await response.json() as BrandingResponse & { error?: string };
      if (!response.ok) throw new Error(json.error || "Impossible de charger les paramètres.");
      setStored(json);
      setDraft({ ...json[scope] });
      setFile(null);
      setRemoveLogo(false);
      setDirty(false);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement.");
    } finally { setLoading(false); }
  }, [scope]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const select = (next: BrandingScope) => {
    if (next === scope || saving || detecting) return;
    if (dirty && !window.confirm("Les modifications non enregistrées seront perdues. Continuer ?")) return;
    setScope(next); setInfo(""); setError("");
    setPreview(null);
    setFile(null);
    setRemoveLogo(false);
  };
  const update = (key: "name" | "primaryColor" | "secondaryColor", value: string) => {
    setDraft(old => ({ ...old, [key]: value }));
    setDirty(true);
    setInfo("");
  };
  async function chooseLogo(nextFile?: File) {
    if (!nextFile) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(nextFile.type) ||
        nextFile.size < 12 || nextFile.size > 5 * 1024 * 1024) {
      setError("Logo invalide : PNG, JPG ou WebP, 5 Mo maximum."); return;
    }
    setError("");
    setFile(nextFile);
    setRemoveLogo(false);
    setPreview(URL.createObjectURL(nextFile));
    setDirty(true);
    setDetecting(true);
    try {
      const palette = await colorsFromFile(nextFile);
      if (palette) {
        setDraft(old => ({ ...old, primaryColor: palette[0], secondaryColor: palette[1] }));
        setInfo("Deux couleurs ont été proposées depuis le logo. Vérifie-les avant de valider.");
      } else {
        setInfo("Logo prêt à être enregistré. Choisis les couleurs manuellement si nécessaire.");
      }
    } catch { setInfo("Logo prêt à être enregistré. Analyse automatique des couleurs indisponible."); }
    finally { setDetecting(false); }
  }
  const applyAtyomPalette = () => {
    setDraft(old => ({ ...old, primaryColor: ATYOM_PALETTE.primary, secondaryColor: ATYOM_PALETTE.secondary }));
    setDirty(true); setError("");
    setInfo("Palette noir, or et blanc sélectionnée. Clique sur « Enregistrer les modifications » pour la publier.");
  };
  const reset = () => {
    const original = stored?.[scope] ?? blankDraft(scope);
    setDraft({ ...original }); setPreview(null); setFile(null);
    setRemoveLogo(false); setDirty(false); setError(""); setInfo("Modifications non enregistrées annulées.");
    if (fileRef.current) fileRef.current.value = "";
  };
  const valid = draft.name.trim().length >= 2 && draft.name.trim().length <= 80 &&
    HEX.test(draft.primaryColor) && HEX.test(draft.secondaryColor);
  async function save() {
    if (!valid || !dirty || !stored?.canEdit || saving || detecting) return;
    setSaving(true); setError(""); setInfo("");
    try {
      const form = new FormData();
      form.set("scope", scope);
      form.set("name", draft.name.trim());
      form.set("primaryColor", draft.primaryColor);
      form.set("secondaryColor", draft.secondaryColor);
      if (removeLogo) form.set("removeLogo", "true");
      if (file) form.set("logo", file);
      const response = await fetch("/api/branding", { method: "POST", body: form, cache: "no-store" });
      const result = await response.json() as { success?: boolean; settings?: BrandingSettings; error?: string };
      if (!response.ok || !result.success || !result.settings) throw new Error(result.error || "Enregistrement refusé.");
      const next = result.settings;
      setStored(old => old ? { ...old, [scope]: { ...old[scope], ...next } } : old);
      setDraft({ ...next });
      setFile(null);
      setRemoveLogo(false);
      setPreview(null);
      setDirty(false);
      setInfo(`Modifications ${scope === "structure" ? "ATYOM" : "du roster"} enregistrées avec succès. Elles seront visibles sur les écrans compatibles après actualisation.`);
      window.dispatchEvent(new Event("esport-branding-updated"));
      if (fileRef.current) fileRef.current.value = "";
    } catch (e) { setError(e instanceof Error ? e.message : "Impossible d'enregistrer."); }
    finally { setSaving(false); }
  }
  const currentLogo = removeLogo ? (scope === "roster" ? INSTANCE_CONFIG.logoUrl : null) :
    (preview || draft.logoUrl);
  const main = safeColor(draft.primaryColor, "#22d3ee");
  const accent = safeColor(draft.secondaryColor, "#facc15");
  return (
    <main className={`min-h-screen pb-16 text-white ${scope === "structure" ? "bg-[#050505]" : "bg-[#030914]"}`}>
      <header className={`border-b border-white/10 ${scope === "structure" ? "bg-[#090909]" : "bg-[#06111f]"}`}>
        <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-3 px-5 py-5">
          <div className="flex items-center gap-3">
            <a href="/" aria-label="Retour à l'accueil" className="rounded-xl border border-white/10 p-3 text-slate-400 hover:text-white"><ArrowLeft size={19}/></a>
            <div><p className="text-[11px] font-black uppercase tracking-widest text-yellow-300">ATYOM · Administration</p><h1 className="mt-1 text-2xl font-black">Personnalisation des identités</h1></div>
          </div>
          <span className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-400">{stored?.environment === "production" ? "Production" : "Version de test"}</span>
        </div>
      </header>
      <div className="mx-auto max-w-[1280px] space-y-5 px-5 py-7">
        <section className={`rounded-2xl border p-5 ${scope === "structure" ? "border-[#FBD046]/25 bg-[#101010]" : "border-cyan-400/20 bg-[#0d2535]"}`}>
          <h2 className="text-lg font-black">Une structure, une identité différente pour chaque roster</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">ATYOM est la structure esport. GX NØVA est son roster FC27 : son logo bleu et jaune peut rester indépendant du logo et des couleurs d'ATYOM. Les modifications sont enregistrées uniquement lorsque tu cliques sur « Enregistrer les modifications ».</p>
          {stored?.environment === "preview" && <p className="mt-3 text-xs font-semibold text-yellow-200">Les enregistrements effectués ici restent dans l'espace de test de cette branche et ne changent pas la production.</p>}
        </section>
        <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
          <section className={`space-y-5 rounded-2xl border border-white/10 p-5 ${scope === "structure" ? "bg-[#101010]" : "bg-[#091626]"}`}>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => select("structure")} aria-pressed={scope === "structure"} className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-black ${scope === "structure" ? "border-yellow-400/40 bg-yellow-400/10 text-yellow-200" : "border-white/10 text-slate-400"}`}><Building2 size={17}/> Structure ATYOM</button>
              <button type="button" onClick={() => select("roster")} aria-pressed={scope === "roster"} className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-black ${scope === "roster" ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-200" : "border-white/10 text-slate-400"}`}><Users size={17}/> Roster FC27</button>
            </div>
            {loading ? <p role="status" className="flex items-center gap-2 text-sm text-slate-400"><LoaderCircle className="animate-spin" size={17}/> Chargement des paramètres…</p> :
            <div className="space-y-4">
              <label className="block text-xs font-bold text-slate-300">{scope === "structure" ? "Nom de la structure" : "Nom du roster"}
                <input value={draft.name} maxLength={80} disabled={!stored?.canEdit || saving} onChange={e => update("name", e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-white outline-none focus:border-cyan-400/40 disabled:opacity-60"/>
              </label>
              {scope === "roster" && <div className="rounded-xl border border-white/10 bg-black/15 p-3">
                <p className="text-xs font-bold text-slate-300">Identifiant EA : {stored?.roster.eaClubId ?? "1663"} · {stored?.roster.gameEdition ?? "FC27"}</p>
                <p className="mt-1 text-xs text-slate-500">L'identifiant EA est défini par l'installation et ne peut pas être changé ici, afin de préserver les matchs et l'historique.</p>
              </div>}
              <div>
                <label className="text-xs font-bold text-slate-300">{scope === "structure" ? "Logo de la structure" : "Logo du roster"}</label>
                <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" disabled={!stored?.canEdit || saving} onChange={e => void chooseLogo(e.target.files?.[0])}/>
                <button type="button" disabled={!stored?.canEdit || saving} onClick={() => fileRef.current?.click()} className={`mt-2 flex w-full items-center gap-3 rounded-xl border border-dashed p-4 text-left text-xs font-bold disabled:opacity-50 ${scope === "structure" ? "border-[#FBD046]/30 bg-[#FBD046]/[0.04] text-[#FBD046]" : "border-cyan-400/25 bg-cyan-400/[0.04] text-cyan-200"}`}><ImagePlus size={20}/>{file?.name || "Importer un logo PNG, JPG ou WebP (5 Mo max)"}</button>
                {(draft.logoPath || file) && <button type="button" disabled={!stored?.canEdit || saving} onClick={() => { setRemoveLogo(true); setFile(null); setPreview(null); setDirty(true); }} className="mt-2 text-xs text-rose-300 underline underline-offset-2">Retirer le logo personnalisé</button>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {([["primaryColor", "Couleur principale"], ["secondaryColor", "Couleur secondaire"]] as const).map(([key,label]) => <label key={key} className="block text-xs font-bold text-slate-300">{label}
                  <div className="mt-2 flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 p-2">
                    <input type="color" value={safeColor(draft[key], "#facc15")} disabled={!stored?.canEdit || saving} onChange={e => update(key, e.target.value)} className="h-9 w-10 cursor-pointer bg-transparent"/>
                    <input aria-label={label} value={draft[key]} maxLength={7} disabled={!stored?.canEdit || saving} onChange={e => update(key, e.target.value)} className="w-full min-w-0 bg-transparent text-xs text-white outline-none"/>
                  </div>
                </label>)}
              </div>
              {scope === "structure" && draft.name.trim().toUpperCase() === "ATYOM" && <button type="button" disabled={!stored?.canEdit || saving || detecting} onClick={applyAtyomPalette} className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#FBD046]/50 bg-[#FBD046]/10 px-4 py-3 text-xs font-black text-[#FBD046] transition hover:bg-[#FBD046]/15 disabled:opacity-40"><Palette size={16}/> Appliquer la palette ATYOM — or et blanc sur noir</button>}
              {error && <p role="alert" className="rounded-xl border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-200">{error}</p>}
              {info && <p role="status" className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.05] p-3 text-sm text-emerald-200">{info}</p>}
              {!stored?.canEdit && <p className="flex items-center gap-2 text-xs text-amber-200"><LockKeyhole size={15}/> Seul un administrateur peut enregistrer les couleurs et logos.</p>}
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={!stored?.canEdit || !dirty || saving || detecting || !valid} onClick={() => void save()} className="flex items-center gap-2 rounded-xl bg-yellow-400 px-5 py-3 text-sm font-black text-[#071321] disabled:cursor-not-allowed disabled:opacity-40">
                  {saving ? <LoaderCircle className="animate-spin" size={18}/> : <Save size={18}/>} {saving ? "Enregistrement…" : detecting ? "Analyse du logo…" : "Enregistrer les modifications"}
                </button>
                <button type="button" disabled={!dirty || saving || detecting} onClick={reset} className="flex items-center gap-2 rounded-xl border border-white/15 px-4 py-3 text-xs font-black text-slate-300 disabled:opacity-40"><RotateCcw size={15}/> Annuler</button>
              </div>
            </div>}
          </section>
          <div className="space-y-5">
            <section className={`overflow-hidden rounded-2xl border border-white/10 ${scope === "structure" ? "bg-[#101010]" : "bg-[#091626]"}`}>
              <div className="p-6" style={{ background: `linear-gradient(110deg, ${main}40, ${scope === "structure" ? "#090909" : "#091626"} 83%)` }}>
                <div className="flex items-center gap-4">
                  <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border bg-black/25 p-2" style={{borderColor:main}}>
                    {currentLogo ? <img src={currentLogo} alt="Aperçu du logo" className="h-full w-full object-contain"/> :
                      <span className="text-2xl font-black" style={{color:accent}}>{(draft.name || "A").slice(0,2).toUpperCase()}</span>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black uppercase tracking-widest" style={{color:accent}}>{scope === "structure" ? "Structure esport" : stored?.structure.name || "ATYOM"}</p>
                    <h2 className="mt-1 truncate text-2xl font-black">{draft.name || "Sans nom"}</h2>
                    <p className="mt-1 text-xs text-slate-400">{scope === "roster" ? `${stored?.roster.gameEdition || "FC27"} · EA ${stored?.roster.eaClubId || "1663"}` : "Identité de l'organisation"}</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 border-t border-white/10 p-4">
                {["Accueil","Compétitions","Performance"].map((item,i) => <div key={item} className="rounded-xl border p-3 text-center text-xs font-bold" style={{borderColor:main+"80",background:i===0?main+"30":scope === "structure" ? "#080808" : "#06111b",color:i===0?accent:"#cbd5e1"}}>{item}</div>)}
              </div>
            </section>
            <section className="rounded-2xl border border-yellow-400/15 bg-[#091626] p-5">
              <h3 className="flex items-center gap-2 font-black"><Shield className="text-yellow-300" size={19}/> Sécurité et fonctionnement</h3>
              <p className="mt-3 text-sm leading-6 text-slate-400">Le logo et les couleurs enregistrés sont conservés dans le stockage privé de l'instance, puis chargés sur les écrans compatibles. La structure et le roster ont chacun leurs propres réglages.</p>
              <p className="mt-3 text-sm leading-6 text-slate-400">Pour dupliquer le logiciel pour une nouvelle équipe et changer son ID EA, nous conserverons le principe d'une base Supabase et d'une installation Vercel distinctes.</p>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
