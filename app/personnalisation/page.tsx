"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, ClipboardCopy, Download, ImagePlus, LockKeyhole, Palette, RefreshCw, Shield, Sparkles, UploadCloud } from "lucide-react";
import {
  INSTANCE_CONFIG, type InstanceConfiguration, toPublicEnvironment, validateClubId,
} from "@/lib/platform/instance-config";

type CustomConfig = InstanceConfiguration;

function hex(value: string) { return /^#[0-9a-f]{6}$/i.test(value) ? value : "#22d3ee"; }
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

const DEFAULT_CONFIG: InstanceConfiguration = { ...INSTANCE_CONFIG };

export default function PersonnalisationPage() {
  const [draft, setDraft] = useState<CustomConfig>(DEFAULT_CONFIG);
  const [logoPreview, setLogoPreview] = useState(INSTANCE_CONFIG.logoUrl);
  const [logoFilename, setLogoFilename] = useState("");
  const [info, setInfo] = useState("");
  const [detecting, setDetecting] = useState(false);
  const [showEnvironment, setShowEnvironment] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const valid = !!draft.clubName.trim() && !!draft.structureName.trim() && validateClubId(draft.eaClubId);
  const envLines = useMemo(() => [
    ...toPublicEnvironment(draft).map(([key, value]) => `${key}=${JSON.stringify(value)}`),
    `ESPORT_EA_CLUB_ID=${JSON.stringify(draft.eaClubId)}`,
    'ESPORT_INSTANCE_MODE="isolated" # uniquement pour la copie indépendante',
  ].join("\n"), [draft]);
  const onChange = (key: keyof InstanceConfiguration, value: string) => {
    setDraft(old => ({ ...old, [key]: value }));
    setInfo("");
  };
  useEffect(() => () => {
    if (logoPreview.startsWith("blob:")) URL.revokeObjectURL(logoPreview);
  }, [logoPreview]);
  async function uploadLogo(file?: File) {
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 5*1024*1024) {
      setInfo("Choisis un PNG, JPG ou WebP de 5 Mo maximum."); return;
    }
    const name = file.name.replace(/[^a-z0-9._-]/gi, "-");
    setLogoPreview(URL.createObjectURL(file));
    setLogoFilename(file.name);
    setDraft(old => ({ ...old, logoUrl: `/branding/${name}` }));
    setDetecting(true);
    try {
      const palette = await colorsFromFile(file);
      if (palette) {
        setDraft(old => ({ ...old, primaryColor: palette[0], secondaryColor: palette[1] }));
        setInfo("Logo chargé pour l'aperçu. Deux couleurs ont été proposées à partir de l'image ; tu peux les modifier.");
      } else {
        setInfo("Logo chargé pour l'aperçu. Aucune palette fiable détectée : ajuste les couleurs manuellement.");
      }
    } catch {
      setInfo("Logo chargé pour l'aperçu. La détection de couleurs est indisponible.");
    } finally { setDetecting(false); }
  }
  async function copyEnvironment() {
    if (!valid) { setInfo("Renseigne un nom de structure, un club et un ID EA valide."); return; }
    try { await navigator.clipboard.writeText(envLines); setInfo("Configuration copiée. À appliquer uniquement sur une installation indépendante."); }
    catch { setInfo("Copie refusée par le navigateur : utilise l'export JSON."); }
  }
  function exportJson() {
    if (!valid) { setInfo("Renseigne un nom de structure, un club et un ID EA valide."); return; }
    const data = new Blob([JSON.stringify({ ...draft, note: "Le logo importé dans le navigateur n'est pas inclus. Copier le fichier séparément dans public/branding et déployer avec une base Supabase dédiée." },null,2)],{type:"application/json"});
    const url = URL.createObjectURL(data);
    const anchor = document.createElement("a");
    anchor.href=url;anchor.download="configuration-club-esport.json";anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url),1000);
    setInfo("Fichier JSON exporté. Aucun changement sur le site GX NØVA en production.");
  }
  const mainColor=hex(draft.primaryColor), accentColor=hex(draft.secondaryColor);
  return (
    <main className="min-h-screen bg-[#030914] pb-16 text-white">
      <header className="border-b border-white/10 bg-[#06111f]">
        <div className="mx-auto flex max-w-[1250px] items-center justify-between gap-3 px-5 py-5">
          <div className="flex items-center gap-3">
            <a href="/" title="Retour à l'accueil" className="rounded-xl border border-white/10 p-3 text-slate-400 hover:text-white"><ArrowLeft size={19}/></a>
            <div><p className="text-[11px] font-black uppercase tracking-[.2em] text-yellow-300">Plateforme FC Esport</p><h1 className="mt-1 text-xl font-black sm:text-3xl">Personnalisation du club</h1></div>
          </div>
          <span className="rounded-xl border border-amber-400/25 bg-amber-400/5 px-3 py-2 text-xs font-black text-amber-200">Prototype • sans écriture serveur</span>
        </div>
      </header>
      <div className="mx-auto grid max-w-[1250px] gap-5 px-5 py-7 lg:grid-cols-[1fr_1fr]">
        <section className="space-y-5 rounded-3xl border border-white/10 bg-[#0a1726] p-5 sm:p-6">
          <div><h2 className="flex items-center gap-2 text-lg font-black"><Palette size={20} className="text-cyan-300"/> Identité du club</h2>
            <p className="mt-2 text-xs leading-5 text-slate-400">Tous les champs modifient uniquement l'aperçu. L'export préparera une copie du site pour une autre équipe.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-bold text-slate-300">Nom de la structure
              <input value={draft.structureName} maxLength={80} onChange={e=>onChange("structureName",e.target.value)} className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-white outline-none focus:border-cyan-400/40"/>
            </label>
            <label className="text-xs font-bold text-slate-300">Nom du roster / club
              <input value={draft.clubName} maxLength={80} onChange={e=>onChange("clubName",e.target.value)} className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-white outline-none focus:border-cyan-400/40"/>
            </label>
            <label className="text-xs font-bold text-slate-300">Identifiant du club EA
              <input inputMode="numeric" value={draft.eaClubId} maxLength={20} onChange={e=>onChange("eaClubId",e.target.value)} className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-white outline-none focus:border-cyan-400/40" aria-invalid={!validateClubId(draft.eaClubId)}/>
            </label>
            <label className="text-xs font-bold text-slate-300">Édition
              <input value={draft.gameEdition} maxLength={20} onChange={e=>onChange("gameEdition",e.target.value)} className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-white outline-none focus:border-cyan-400/40"/>
            </label>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-300">Logo du club</p>
            <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={e=>void uploadLogo(e.target.files?.[0])}/>
            <button type="button" onClick={()=>inputRef.current?.click()} className="mt-2 flex w-full items-center gap-3 rounded-xl border border-dashed border-cyan-400/30 bg-cyan-400/[0.04] p-4 text-left text-sm font-bold text-cyan-200 hover:bg-cyan-400/[0.08]">
              <ImagePlus size={22}/><span>{logoFilename||"Importer un logo PNG, JPG ou WebP (5 Mo max)"}</span><UploadCloud size={18} className="ml-auto"/>
            </button>
            <label className="mt-3 block text-xs font-bold text-slate-300">Chemin du logo sur la copie du site
              <input value={draft.logoUrl} maxLength={200} onChange={e=>onChange("logoUrl",e.target.value)} className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/20 p-3 text-sm font-normal text-white outline-none focus:border-cyan-400/40"/>
            </label>
            <p className="mt-2 text-[11px] text-slate-500">Le logo importé reste dans ton navigateur. Pour le rendre permanent sur une copie, il faudra placer le fichier dans le dossier public correspondant.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {([["primaryColor","Principale"],["secondaryColor","Secondaire"]] as const).map(([key,label])=>
              <label key={key} className="block text-xs font-bold text-slate-300">{label}
                <div className="mt-2 flex items-center gap-2 rounded-xl border border-white/10 bg-black/15 p-2">
                  <input type="color" value={hex(draft[key])} onChange={e=>onChange(key,e.target.value)} className="h-9 w-11 cursor-pointer rounded-lg border-none bg-transparent"/>
                  <input aria-label={"Couleur "+label} value={draft[key]} onChange={e=>onChange(key,e.target.value)} maxLength={7} className="w-full min-w-0 bg-transparent text-sm text-white outline-none"/>
                </div>
              </label>
            )}
          </div>
          {detecting&&<p role="status" className="flex items-center gap-2 text-xs text-cyan-200"><RefreshCw className="animate-spin" size={14}/> Analyse des couleurs du logo…</p>}
          {info&&<p role="status" className="rounded-lg border border-cyan-400/20 bg-cyan-400/[0.05] p-3 text-xs leading-5 text-cyan-200">{info}</p>}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={()=>{setDraft({...DEFAULT_CONFIG});setLogoPreview(DEFAULT_CONFIG.logoUrl);setLogoFilename("");setInfo("Paramètres de démonstration réinitialisés.");}} className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-black text-slate-300">Réinitialiser</button>
            <button type="button" disabled={!valid} onClick={exportJson} className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black text-black disabled:opacity-40" style={{background:accentColor}}><Download size={15}/> Exporter la configuration JSON</button>
          </div>
        </section>
        <div className="space-y-5">
          <section className="overflow-hidden rounded-3xl border border-white/10 bg-[#081421]">
            <div className="p-5" style={{background:`linear-gradient(120deg, ${mainColor}36 0%, #081421 78%)`}}>
              <div className="flex items-center gap-4">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl border bg-black/20 p-2" style={{borderColor:mainColor}}>
                  <img src={logoPreview} onError={e=>{e.currentTarget.style.visibility="hidden";}} alt="Logo du club" className="h-full w-full object-contain"/>
                </div>
                <div className="min-w-0"><p className="text-xs font-bold uppercase tracking-widest" style={{color:accentColor}}>{draft.structureName||"Nom de structure"}</p><h2 className="mt-1 truncate text-2xl font-black">{draft.clubName||"Nom du club"}</h2><p className="mt-1 text-xs text-slate-400">{draft.gameEdition} • ID EA {draft.eaClubId||"—"}</p></div>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2">
                {["Calendrier","Match Center","Statistiques"].map((label,i)=><div key={label} className="rounded-xl border p-3 text-center" style={{borderColor:mainColor+"88",background:i===0?mainColor+"22":"#06101b"}}><p className="text-[11px] font-bold" style={{color:i===0?accentColor:"#cbd5e1"}}>{label}</p></div>)}
              </div>
            </div>
            <div className="space-y-3 border-t border-white/10 p-5">
              <p className="text-xs font-black uppercase tracking-wider text-slate-400">Exemple d'une fiche joueur</p>
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-center gap-3"><Shield size={21} style={{color:mainColor}}/><div><p className="text-sm font-black">Joueur FC</p><p className="mt-1 text-xs text-slate-500">Milieu central</p></div></div>
                <span className="rounded-lg px-3 py-1.5 text-xs font-black text-black" style={{background:accentColor}}>Note EA</span>
              </div>
              <p className="text-xs text-slate-500">Aperçu de l'identité visuelle : les statistiques affichées ici sont fictives et ne sont jamais chargées depuis une autre équipe.</p>
            </div>
          </section>
          <section className="rounded-2xl border border-yellow-400/20 bg-[#0a1726] p-5">
            <h3 className="flex items-center gap-2 font-black"><LockKeyhole size={19} className="text-yellow-300"/> Déployer pour un autre club</h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">Chaque club aura son propre projet Vercel et sa base Supabase indépendante. L'identifiant EA sera utilisé par la synchronisation du club, mais un simple changement sur cet écran n'autorise pas l'accès à ses données.</p>
            <button type="button" onClick={()=>setShowEnvironment(v=>!v)} className="mt-4 rounded-xl border border-white/15 px-4 py-2.5 text-xs font-black text-cyan-200">{showEnvironment?"Masquer":"Voir"} les variables de déploiement</button>
            {showEnvironment&&<div className="mt-4">
              <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-black/30 p-3 text-[11px] leading-5 text-slate-300">{envLines}</pre>
              <button type="button" disabled={!valid} onClick={()=>void copyEnvironment()} className="mt-3 inline-flex items-center gap-2 rounded-xl border border-cyan-400/30 px-4 py-2 text-xs font-black text-cyan-300 disabled:opacity-40"><ClipboardCopy size={15}/> Copier les variables</button>
            </div>}
          </section>
          <div className="flex items-center gap-2 text-xs text-slate-400"><Check size={16} className="text-emerald-400"/> GX NØVA est préservé : aucune donnée Supabase n'est modifiée.</div>
        </div>
      </div>
    </main>
  );
}
