"use client";
import { useCallback, useEffect, useState } from "react";
import { ArrowUpRight, CalendarDays, ChevronRight, CircleAlert, Layers3, RefreshCw, ShieldCheck, Trophy, TrendingUp, Users } from "lucide-react";
import { useClubBranding } from "@/lib/platform/use-club-branding";
type Result = "V" | "N" | "D";
type Stats={played:number;wins:number;draws:number;losses:number;goalsFor:number;goalsAgainst:number;winRate:number;goalDifference:number};
type Match={id:number;rosterId:string;rosterName:string;playedAt:string|null;opponent:string;goalsFor:number;goalsAgainst:number;result:Result;competition:string};
type Roster={id:string;name:string;gameEdition:string;matches30:Stats;form:Result[];lastMatchAt:string|null;capped:boolean};
type Fixture={rosterId:string;rosterName:string;eventDate:string;time:string;opponent:string;competition:string};
type Overview={activeRosters:number;activeMembers:number;totals:Stats;rosterBreakdown:Roster[];lastResults:Match[];
upcoming:Fixture[];upcomingCount:number;periodMatchesCapped:boolean;pilot:boolean;asOf:string};
const EMPTY:Stats={played:0,wins:0,draws:0,losses:0,goalsFor:0,goalsAgainst:0,winRate:0,goalDifference:0};
const RESULT_NAME:Record<Result,string>={V:"Victoire",N:"Nul",D:"Défaite"};
const RESULT_STYLE:Record<Result,string>={V:"border-emerald-400/30 bg-emerald-400/10 text-emerald-300",N:"border-slate-400/30 bg-slate-400/10 text-slate-300",D:"border-rose-400/30 bg-rose-400/10 text-rose-300"};
const formatDate=(value:string|null)=>value&&!Number.isNaN(new Date(value).getTime())?new Intl.DateTimeFormat("fr-FR",{timeZone:"Europe/Paris",day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}).format(new Date(value)):"Date non disponible";
const formatDay=(value:string)=>new Intl.DateTimeFormat("fr-FR",{timeZone:"Europe/Paris",weekday:"short",day:"2-digit",month:"short"}).format(new Date(value+"T12:00:00Z"));
export function StructureOverview(){
 const branding=useClubBranding();
 const [data,setData]=useState<Overview|null>(null),[error,setError]=useState("");
 const [loading,setLoading]=useState(true),[version,setVersion]=useState(0);
 const load=useCallback(async(signal:AbortSignal)=>{
  setLoading(true);setError("");
  try{const response=await fetch("/api/organisation/overview",{cache:"no-store",signal});
   const result=await response.json() as Overview&{error?:string};
   if(!response.ok)throw new Error(result.error??"Données indisponibles.");
   if(!signal.aborted)setData(result);
  }catch(e){if(!signal.aborted)setError(e instanceof Error?e.message:"Chargement impossible.");}
  finally{if(!signal.aborted)setLoading(false);}
 },[]);
 useEffect(()=>{const controller=new AbortController();void load(controller.signal);return()=>controller.abort();},[load,version]);
 const gold=branding.structure.primaryColor,stats=data?.totals??EMPTY;
 const name=(id:string,fallback:string)=>id==="gx-nova-legacy"?branding.roster.name:fallback;
 const cards=[
  {label:"Rosters actifs",value:data?data.activeRosters:"—",note:"Équipes connectées",icon:Layers3},
  {label:"Matchs · 30 jours",value:data?stats.played:"—",note:`${stats.wins} V · ${stats.draws} N · ${stats.losses} D`,icon:Trophy},
  {label:"Victoires · 30 jours",value:data?stats.winRate+"%":"—",note:`${stats.goalsFor} marqués · ${stats.goalsAgainst} encaissés`,icon:TrendingUp},
  {label:"Comptes actifs",value:data?data.activeMembers:"—",note:"Membres ATYOM autorisés",icon:Users},
 ];
 return <section aria-label="Vue consolidée ATYOM" className="space-y-5">
   <div className="flex flex-wrap items-end justify-between gap-3">
    <div><p className="text-xs font-black uppercase tracking-[.2em]" style={{color:gold}}>Pilotage de la structure</p>
     <h2 className="mt-2 text-2xl font-black">Vue consolidée {branding.structure.name}</h2>
     <p className="mt-2 text-sm text-slate-400">Résultats, dynamique sportive et prochains rendez-vous.</p>
    </div>
    <button type="button" disabled={loading} onClick={()=>setVersion(v=>v+1)}
     className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10 disabled:opacity-50">
     <RefreshCw size={14} className={loading?"animate-spin":""}/> Actualiser
    </button>
   </div>
   {loading&&!data&&<p role="status" className="rounded-2xl border border-white/10 bg-[#111] p-5 text-sm text-slate-400">Chargement des indicateurs…</p>}
   {error&&<p role="alert" className="flex items-center gap-2 rounded-xl border border-rose-400/30 bg-rose-400/10 p-4 text-sm text-rose-200"><CircleAlert size={16}/>{error}</p>}
   {data&&<>
    {data.pilot&&<div className="flex items-start gap-2 rounded-xl border px-4 py-3 text-xs text-slate-300" style={{borderColor:gold+"40",backgroundColor:gold+"0c"}}>
     <ShieldCheck className="shrink-0" size={16} style={{color:gold}}/><p>Phase pilote : {name("gx-nova-legacy","GX NØVA")} est le seul roster connecté. Les futurs rosters apparaîtront lorsqu'ils disposeront de données isolées.</p>
    </div>}
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{cards.map(c=>{const Icon=c.icon;return <div key={c.label} className="rounded-2xl border border-white/10 bg-[#111] p-4">
     <p className="flex items-center gap-2 text-xs text-slate-400"><Icon size={16} style={{color:gold}}/>{c.label}</p>
     <p className="mt-3 text-3xl font-black tabular-nums" style={{color:gold}}>{c.value}</p>
     <p className="mt-2 text-xs text-slate-500">{c.note}</p>
    </div>;})}</div>
    {stats.played>0&&<div className="overflow-hidden rounded-full bg-white/10" aria-label={`Victoires ${stats.wins}, nuls ${stats.draws}, défaites ${stats.losses} sur les trente derniers jours`}>
     <div className="flex h-2">
      <div className="bg-emerald-400" style={{width:stats.wins/stats.played*100+"%"}}/>
      <div className="bg-slate-400" style={{width:stats.draws/stats.played*100+"%"}}/>
      <div className="bg-rose-400" style={{width:stats.losses/stats.played*100+"%"}}/>
     </div>
    </div>}
    {data.periodMatchesCapped&&<p role="note" className="text-xs text-amber-200">Plus de 1 000 matchs pour un roster : les chiffres des 30 derniers jours peuvent être incomplets.</p>}
    <div className="grid gap-5 xl:grid-cols-[1.15fr_1fr]">
     <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#111]">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
       <h3 className="flex items-center gap-2 font-black"><Trophy size={18} style={{color:gold}}/> 10 derniers résultats</h3>
       <a href="/match-center" className="inline-flex items-center gap-1 text-xs text-slate-300 hover:text-white">Match Center <ArrowUpRight size={14}/></a>
      </div>
      {data.lastResults.length===0?<p className="p-5 text-sm text-slate-400">Aucun résultat enregistré.</p>:
       <div className="divide-y divide-white/[0.07]">{data.lastResults.map(m=><div key={m.rosterId+"-"+m.id} className="flex items-center justify-between gap-3 px-5 py-3">
        <div className="min-w-0"><p className="truncate text-sm font-bold">{name(m.rosterId,m.rosterName)} <span className="font-normal text-slate-400">vs {m.opponent}</span></p>
         <p className="mt-1 text-xs text-slate-500">{formatDate(m.playedAt)} · {m.competition}</p></div>
        <div className="flex shrink-0 items-center gap-2"><span className="text-lg font-black tabular-nums">{m.goalsFor} - {m.goalsAgainst}</span>
         <span title={RESULT_NAME[m.result]} className={`inline-flex h-7 w-7 items-center justify-center rounded-lg border text-xs font-bold ${RESULT_STYLE[m.result]}`}>{m.result}</span></div>
       </div>)}</div>}
     </section>
     <div className="space-y-5">
      <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#111]">
       <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <h3 className="flex items-center gap-2 font-black"><CalendarDays size={18} style={{color:gold}}/> À venir · 7 jours</h3>
        <a href="/programme" className="inline-flex items-center gap-1 text-xs text-slate-300 hover:text-white">Programme <ChevronRight size={14}/></a>
       </div>
       {data.upcoming.length===0?<p className="p-5 text-sm text-slate-400">Aucune rencontre planifiée sur les sept prochains jours.</p>:
        <div className="divide-y divide-white/[0.07]">{data.upcoming.map((e,i)=><div key={e.rosterId+e.eventDate+e.time+i} className="flex gap-3 px-5 py-3">
         <div className="w-20 shrink-0 text-xs font-black" style={{color:gold}}>{formatDay(e.eventDate)}<p className="mt-1 text-slate-300">{e.time}</p></div>
         <div className="min-w-0"><p className="truncate text-sm font-semibold">{name(e.rosterId,e.rosterName)} vs {e.opponent}</p>
          <p className="mt-1 text-xs text-slate-500">{e.competition}</p></div>
        </div>)}</div>}
       {data.upcomingCount>data.upcoming.length&&<p className="border-t border-white/10 px-5 py-3 text-xs text-slate-400">Et {data.upcomingCount-data.upcoming.length} autre(s) rencontre(s).</p>}
      </section>
      <section className="rounded-2xl border border-white/10 bg-[#111] p-5">
       <h3 className="flex items-center gap-2 font-black"><TrendingUp size={18} style={{color:gold}}/> Forme par roster</h3>
       <div className="mt-4 space-y-3">{data.rosterBreakdown.map(r=><div key={r.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
        <div className="flex items-center justify-between gap-2"><div><p className="font-bold">{name(r.id,r.name)}</p>
         <p className="mt-1 text-xs text-slate-400">{r.matches30.played} matchs sur 30 jours · Diff. buts {r.matches30.goalDifference>0?"+":""}{r.matches30.goalDifference}</p></div>
         <span className="text-sm font-black" style={{color:gold}}>{r.matches30.winRate}%</span></div>
        <div className="mt-3 flex flex-wrap items-center gap-1.5"><span className="mr-1 text-xs text-slate-500">5 derniers</span>
         {r.form.length===0?<span className="text-xs text-slate-400">Aucun match</span>:r.form.map((result,i)=><span key={i} title={RESULT_NAME[result]} className={`inline-flex h-7 w-7 items-center justify-center rounded-lg border text-xs font-black ${RESULT_STYLE[result]}`}>{result}</span>)}
        </div>
       </div>)}</div>
      </section>
     </div>
    </div>
    <p className="text-xs text-slate-500">Données issues des matchs enregistrés et du programme. Actualisation : {formatDate(data.asOf)}.</p>
   </>}
  </section>;
}
