"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronDown, ChevronUp, Download, Image as ImageIcon, LoaderCircle, Send } from "lucide-react";
import type { Role } from "@/lib/sport-intelligence";

type Kind = "form" | "roles" | "pairs";
type Channel = {id:string;label:string;discordChannelId:string|null};
type Competition = {id:number;name:string};
type Props = {
  seasonId: string;
  currentKind: Kind;
  currentRole: Role|"all";
  currentSearch: string;
  currentMinSamples: boolean;
  currentPairMinimum: number;
};
const TYPES: {value:Kind;label:string}[] = [
  {value:"form",label:"Forme des joueurs"},
  {value:"roles",label:"Analyse par poste"},
  {value:"pairs",label:"Associations"},
];
const ROLES: {value:Role|"all";label:string}[] = [
  {value:"all",label:"Tous les postes"},
  {value:"goalkeeper",label:"Gardiens"},
  {value:"defender",label:"Défense"},
  {value:"midfielder",label:"Milieu"},
  {value:"forward",label:"Attaque"},
];
export function IntelligenceExports({
  seasonId,currentKind,currentRole,currentSearch,currentMinSamples,currentPairMinimum,
}:Props) {
  const [open,setOpen]=useState(false);
  const [kind,setKind]=useState<Kind>(currentKind);
  const [competitionId,setCompetitionId]=useState("all");
  const [startDate,setStartDate]=useState("");
  const [endDate,setEndDate]=useState("");
  const [role,setRole]=useState<Role|"all">(currentRole);
  const [search,setSearch]=useState(currentSearch);
  const [minSamples,setMinSamples]=useState(currentMinSamples);
  const [pairMinimum,setPairMinimum]=useState(currentPairMinimum);
  const [includeDormant,setIncludeDormant]=useState(false);
  const [channels,setChannels]=useState<Channel[]>([]);
  const [competitions,setCompetitions]=useState<Competition[]>([]);
  const [channelId,setChannelId]=useState("");
  const [previewQuery,setPreviewQuery]=useState("");
  const [previewVersion,setPreviewVersion]=useState(0);
  const [previewError,setPreviewError]=useState(false);
  const [busy,setBusy]=useState(false);
  const [loadingOptions,setLoadingOptions]=useState(false);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const [canPublish,setCanPublish]=useState(false);

  useEffect(()=>{
    if (!open) return;
    const controller=new AbortController();
    async function load(){
      setLoadingOptions(true);
      try{
        const [comps,discord]=await Promise.all([
          fetch("/api/competitions",{cache:"no-store",signal:controller.signal}),
          fetch("/api/discord/channels?rosterId=gx-nova-legacy",{cache:"no-store",signal:controller.signal}),
        ]);
        const [cj,dj]=await Promise.all([comps.json(),discord.json()]);
        if (!comps.ok) throw new Error(cj.error??"Compétitions indisponibles.");
        if (!discord.ok) throw new Error(dj.error??"Salons Discord indisponibles.");
        if (controller.signal.aborted) return;
        setCompetitions(Array.isArray(cj.competitions)?cj.competitions:[]);
        setChannels(Array.isArray(dj.channels)?dj.channels:[]);
        setCanPublish(Boolean(dj.canPublish));
        setChannelId((current:string)=>dj.channels?.some((c:Channel)=>c.id===current)?current:(dj.channels?.[0]?.id??""));
      }catch(e){
        if(!controller.signal.aborted) setError(e instanceof Error?e.message:"Options indisponibles.");
      }finally{if(!controller.signal.aborted)setLoadingOptions(false);}
    }
    void load();
    return ()=>controller.abort();
  },[open]);

  const params=useMemo(()=>{
    const q=new URLSearchParams({kind,seasonId,competitionId,role,search,
      startDate,endDate,minSamples:String(minSamples),pairMinimum:String(pairMinimum),
      includeDormant:String(includeDormant)});
    return q.toString();
  },[kind,seasonId,competitionId,role,search,startDate,endDate,minSamples,pairMinimum,includeDormant]);
  const validDates=(!startDate||!endDate||startDate<=endDate);
  const stale=Boolean(previewQuery)&&previewQuery!==params;
  const url="/api/sport-intelligence/export?"+previewQuery+"&v="+previewVersion;
  const createPreview=()=>{
    if(!validDates){setError("La date de début doit précéder la date de fin.");return;}
    setError("");setNotice("");setPreviewError(false);
    setPreviewQuery(params);
    setPreviewVersion(v=>v+1);
  };
  async function publish(){
    if(!canPublish||busy||stale||!previewQuery||!channelId)return;
    const target=channels.find(c=>c.id===channelId);
    if(!target)return;
    if(includeDormant && !window.confirm("Ce visuel inclut des joueurs mis en sommeil dans l'administration. Confirmer la publication ?"))return;
    if(!window.confirm("Publier manuellement le visuel dans le salon « "+target.label+" » ?"))return;
    setBusy(true);setError("");setNotice("");
    try{
      const body={...Object.fromEntries(new URLSearchParams(previewQuery)),channelId};
      const response=await fetch("/api/sport-intelligence/export",{
        method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body),
      });
      const data=await response.json() as {error?:string;success?:boolean};
      if(!response.ok||!data.success)throw new Error(data.error??"Publication impossible.");
      setNotice("Image publiée dans le salon « "+target.label+" ». Aucune mise à jour automatique n'est programmée.");
    }catch(e){setError(e instanceof Error?e.message:"Publication impossible.");}
    finally{setBusy(false);}
  }
  return <section className="overflow-hidden rounded-2xl border border-cyan-400/20 bg-[#0a1a2a]">
    <button type="button" onClick={()=>{
      if(!open){setKind(currentKind);setRole(currentRole);setSearch(currentSearch);setMinSamples(currentMinSamples);setPairMinimum(currentPairMinimum);}
      setOpen(v=>!v);
    }} aria-expanded={open}
      className="flex w-full flex-wrap items-center justify-between gap-3 p-4 text-left hover:bg-white/[0.04]">
      <span className="flex items-center gap-3">
        <ImageIcon size={22} className="text-cyan-300"/>
        <span><strong className="block text-sm font-black text-white">Exports Discord · Intelligence sportive</strong>
          <span className="block text-xs text-slate-400">Génère un PNG avec les statistiques EA réelles, télécharge-le ou publie-le manuellement.</span></span>
      </span>
      {open?<ChevronUp size={19} className="text-slate-300"/>:<ChevronDown size={19} className="text-slate-300"/>}
    </button>
    {open&&<div className="space-y-4 border-t border-white/10 p-4 sm:p-5">
      <p className="text-xs leading-5 text-slate-400">La saison est celle choisie en haut de la page. Les données sont recalculées depuis les matchs EA et les corrections du staff. Les joueurs mis en sommeil sont exclus par défaut.</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="text-xs font-semibold text-slate-300">Type de visuel
          <select value={kind} onChange={e=>setKind(e.target.value as Kind)}
            className="mt-1 block w-full rounded-xl border border-white/15 bg-[#061321] p-3 text-sm text-white">
            {TYPES.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-300">Compétition
          <select value={competitionId} onChange={e=>setCompetitionId(e.target.value)}
            className="mt-1 block w-full rounded-xl border border-white/15 bg-[#061321] p-3 text-sm text-white">
            <option value="all">Toutes les compétitions</option>
            {competitions.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        {kind!=="pairs"&&<label className="text-xs font-semibold text-slate-300">Poste
          <select value={role} onChange={e=>setRole(e.target.value as Role|"all")}
            className="mt-1 block w-full rounded-xl border border-white/15 bg-[#061321] p-3 text-sm text-white">
            {ROLES.map(r=><option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </label>}
        <label className="text-xs font-semibold text-slate-300">Du (facultatif)
          <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)}
            className="mt-1 block w-full rounded-xl border border-white/15 bg-[#061321] p-3 text-sm text-white [color-scheme:dark]"/>
        </label>
        <label className="text-xs font-semibold text-slate-300">Au (facultatif)
          <input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)}
            className="mt-1 block w-full rounded-xl border border-white/15 bg-[#061321] p-3 text-sm text-white [color-scheme:dark]"/>
        </label>
        {kind==="pairs"?<label className="text-xs font-semibold text-slate-300">Matchs communs minimum
          <select value={pairMinimum} onChange={e=>setPairMinimum(Number(e.target.value))}
            className="mt-1 block w-full rounded-xl border border-white/15 bg-[#061321] p-3 text-sm text-white">
            {[8,15,25,40].map(x=><option key={x} value={x}>{x} matchs</option>)}
          </select>
        </label>:<label className="text-xs font-semibold text-slate-300">Recherche joueur
          <input type="search" value={search} onChange={e=>setSearch(e.target.value)} maxLength={60}
            placeholder="Nom du joueur..." className="mt-1 block w-full rounded-xl border border-white/15 bg-[#061321] p-3 text-sm text-white"/>
        </label>}
      </div>
      <div className="flex flex-wrap items-center gap-4">
        {kind!=="pairs"&&<label className="flex items-center gap-2 text-xs font-semibold text-slate-300">
          <input type="checkbox" checked={minSamples} onChange={e=>setMinSamples(e.target.checked)} className="accent-yellow-400"/> Échantillons suffisants
        </label>}
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-300">
          <input type="checkbox" checked={includeDormant} onChange={e=>setIncludeDormant(e.target.checked)} className="accent-yellow-400"/>
          Inclure les joueurs en sommeil (désactivé par défaut)
        </label>
      </div>
      {includeDormant&&<p className="text-xs text-amber-300">Attention : les joueurs archivés réapparaîtront sur l'image exportée. Leur historique reste conservé.</p>}
      <button type="button" onClick={createPreview} disabled={!validDates||loadingOptions}
        className="inline-flex items-center gap-2 rounded-xl bg-yellow-400 px-5 py-3 text-sm font-black text-[#061321] disabled:opacity-40">
        <ImageIcon size={17}/> Générer l'aperçu PNG
      </button>
      {stale&&<p className="text-xs text-amber-300">Les filtres ont changé. Régénère l'aperçu pour publier ou télécharger les nouvelles données.</p>}
      {previewQuery&&!stale&&<div className="space-y-3">
        <div className="overflow-hidden rounded-xl border border-white/10 bg-[#030914]">
          <img src={url} alt={"Aperçu de l'export "+kind} onError={()=>setPreviewError(true)}
            onLoad={()=>setPreviewError(false)} className="block w-full object-contain"/>
        </div>
        {previewError?<p className="text-xs text-rose-300">Aperçu indisponible. Vérifie les filtres ou réessaie.</p>:
          <div className="flex flex-wrap items-end gap-3">
            <a href={url+"&download=1"} className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-3 text-xs font-black text-cyan-200 hover:bg-cyan-400/20">
              <Download size={16}/> Télécharger le PNG
            </a>
            <label className="flex-1 text-xs font-semibold text-slate-300 sm:min-w-[240px]">Salon Discord cible
              <select value={channelId} onChange={e=>setChannelId(e.target.value)}
                className="mt-1 block w-full rounded-xl border border-white/15 bg-[#061321] p-3 text-sm text-white">
                {channels.length?channels.map(c=><option key={c.id} value={c.id}>{c.label}</option>):
                  <option value="">Aucun salon connecté</option>}
              </select>
            </label>
            <button type="button" onClick={()=>void publish()} disabled={!canPublish||!channelId||busy}
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-3 text-xs font-black text-[#041321] disabled:opacity-40">
              {busy?<LoaderCircle size={16} className="animate-spin"/>:<Send size={16}/>} Publier dans Discord
            </button>
          </div>}
      </div>}
      {error&&<p role="alert" className="text-xs text-rose-300">{error}</p>}
      {notice&&<p role="status" className="flex items-center gap-2 text-xs text-emerald-300"><CheckCircle2 size={15}/>{notice}</p>}
      {loadingOptions&&<p className="text-xs text-slate-400">Chargement des salons et compétitions…</p>}
      {!loadingOptions&&!channels.length&&<p className="text-xs text-slate-400">Aucun salon Discord configuré. Le téléchargement PNG reste disponible sans webhook.</p>}
      {!canPublish&&<p className="text-xs text-slate-400">La publication est réservée aux rôles Admin et Staff. La génération d'images reste accessible en lecture.</p>}
    </div>}
  </section>;
}
