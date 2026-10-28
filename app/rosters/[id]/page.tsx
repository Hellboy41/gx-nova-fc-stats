"use client";
import {useParams} from "next/navigation";
import {useCallback,useEffect,useState} from "react";
import {ArrowLeft,CheckCircle2,LoaderCircle,RefreshCw,Shield,LockKeyhole} from "lucide-react";
import { RosterProgramme } from "@/components/rosters/RosterProgramme";
import { RosterLogoForm } from "@/components/rosters/RosterLogoForm";
import { RosterSquadStudio } from "@/components/rosters/RosterSquadStudio";
type Roster={id:string;name:string;eaClubId:string;gameEdition:string;workspaceMode:string;primaryColor:string;secondaryColor:string;status:string;logoUrl?:string|null};
type Match={matchId:string;playedAt:string;opponent:string;goalsFor:number;goalsAgainst:number;result:"V"|"N"|"D"};
type Payload={roster:Roster;matches:Match[];storedCount:number;shownCount:number;form:string[];totals:{played:number;wins:number;draws:number;losses:number};note:string};
const format=(s:string)=>new Intl.DateTimeFormat("fr-FR",{dateStyle:"medium",timeStyle:"short",timeZone:"Europe/Paris"}).format(new Date(s));
export default function RosterPage(){
 const {id}=useParams<{id:string}>();
 const [data,setData]=useState<Payload|null>(null),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(""),[success,setSuccess]=useState("");
 const [canEdit,setCanEdit]=useState(false),[name,setName]=useState(""),[primary,setPrimary]=useState("#22d3ee"),[secondary,setSecondary]=useState("#facc15"),[editing,setEditing]=useState(false);
 const load=useCallback(async(signal?:AbortSignal)=>{setLoading(true);try{
  const r=await fetch("/api/rosters/"+encodeURIComponent(id)+"/results",{cache:"no-store",signal});
  const j=await r.json();if(!r.ok)throw new Error(j.error??"Accès refusé.");
  if(!signal?.aborted){setData(j);setName(j.roster.name);setPrimary(j.roster.primaryColor);setSecondary(j.roster.secondaryColor);setError("");}
 }catch(e){if(!signal?.aborted)setError(e instanceof Error?e.message:"Données indisponibles.");}
 finally{if(!signal?.aborted)setLoading(false);}},[id]);
 useEffect(()=>{const c=new AbortController();void load(c.signal);void(async()=>{try{
  const r=await fetch("/api/rosters",{cache:"no-store",signal:c.signal});if(r.ok){const x=await r.json();if(!c.signal.aborted)setCanEdit(Boolean(x.canCreate));}
 }catch{}})();return()=>c.abort();},[load]);
 async function sync(){setBusy(true);setError("");setSuccess("");try{
  const r=await fetch("/api/rosters/"+encodeURIComponent(id)+"/results",{method:"POST"});const j=await r.json();
  if(!r.ok)throw new Error(j.error??"Synchronisation impossible.");
  setSuccess(j.imported+" matchs EA reçus.");await load();
 }catch(e){setError(e instanceof Error?e.message:"Erreur.");}finally{setBusy(false);}}
 async function save(status:"active"|"archived"="active"){setBusy(true);setError("");try{
  const r=await fetch("/api/rosters",{method:"PATCH",headers:{"Content-Type":"application/json"},
   body:JSON.stringify({id,name,primaryColor:primary,secondaryColor:secondary,status})});const j=await r.json();
  if(!r.ok)throw new Error(j.error??"Enregistrement impossible.");
  if(status==="archived"){window.location.assign("/rosters");return;}
  setSuccess("Paramètres enregistrés.");setEditing(false);await load();
 }catch(e){setError(e instanceof Error?e.message:"Erreur.");}finally{setBusy(false);}}
 return <main className="min-h-screen bg-[#060606] px-5 py-7 text-white"><div className="mx-auto max-w-5xl space-y-6">
  <a href="/rosters" className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white"><ArrowLeft size={15}/> Mes rosters</a>
  {loading&&!data&&<p role="status" className="rounded-xl border border-white/10 p-5">Chargement…</p>}
  {error&&<p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-300">{error}</p>}
  {data&&<><header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-[#111] p-6" style={{borderColor:data.roster.primaryColor+"66"}}>
   <div className="flex items-center gap-4">{data.roster.logoUrl?<img src={data.roster.logoUrl} alt={"Logo "+data.roster.name} className="h-16 w-16 shrink-0 rounded-xl object-contain"/>:<Shield size={36} style={{color:data.roster.primaryColor}}/>}
    <div><p className="text-xs font-black uppercase tracking-widest text-[#FBD046]">ATYOM · Roster</p>
     <h1 className="mt-1 text-3xl font-black">{data.roster.name}</h1>
     <p className="mt-2 text-sm text-slate-400">{data.roster.gameEdition} · Identifiant EA {data.roster.eaClubId}</p></div>
   </div>
   {data.roster.workspaceMode==="monitoring"&&<button type="button" disabled={busy} onClick={()=>void sync()}
    className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-black text-black disabled:opacity-50"
    style={{backgroundColor:data.roster.primaryColor}}>{busy?<LoaderCircle className="animate-spin" size={17}/>:<RefreshCw size={17}/>} Synchroniser EA</button>}
  </header>
  {success&&<p role="status" className="flex items-center gap-2 text-sm text-emerald-300"><CheckCircle2 size={17}/>{success}</p>}
  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
   {[["Matchs enregistrés",data.storedCount],["Victoires (50 derniers)",data.totals.wins],["Nuls (50 derniers)",data.totals.draws],["Défaites (50 derniers)",data.totals.losses]].map(([label,value])=>
    <div key={String(label)} className="rounded-xl border border-white/10 bg-[#111] p-4"><p className="text-xs text-slate-400">{label}</p><p className="mt-2 text-2xl font-black">{value}</p></div>)}
  </div>
  {data.roster.workspaceMode==="monitoring"&&<RosterSquadStudio rosterId={id} rosterName={data.roster.name} primary={data.roster.primaryColor} secondary={data.roster.secondaryColor} logoUrl={data.roster.logoUrl}/>}
  {data.roster.workspaceMode==="monitoring"&&<RosterProgramme rosterId={id} rosterName={data.roster.name} color={data.roster.primaryColor}/>}
  <section className="overflow-hidden rounded-xl border border-white/10 bg-[#111]">
   <h2 className="border-b border-white/10 p-5 font-black">Derniers résultats EA</h2>
   {data.matches.length===0?<p className="p-5 text-sm text-slate-400">Aucun résultat. Vérifie l'identifiant EA et lance la synchronisation.</p>:
   <div className="divide-y divide-white/10">{data.matches.map(m=><div key={m.matchId} className="flex items-center justify-between gap-3 px-5 py-3">
    <div className="min-w-0"><p className="truncate text-sm font-semibold">{data.roster.name} vs {m.opponent}</p><p className="mt-1 text-xs text-slate-500">{format(m.playedAt)}</p></div>
    <div className="flex items-center gap-2"><span className="whitespace-nowrap font-black">{m.goalsFor} - {m.goalsAgainst}</span>
     <span className={"rounded-md border px-2 py-1 text-xs font-black "+(m.result==="V"?"border-emerald-400/30 text-emerald-300":m.result==="D"?"border-rose-400/30 text-rose-300":"border-white/20 text-slate-300")}>{m.result}</span>
    </div></div>)}</div>}
   <p className="border-t border-white/10 px-5 py-3 text-xs text-slate-500">{data.note}</p>
  </section>
  {canEdit&&data.roster.workspaceMode==="monitoring"&&<section className="rounded-xl border border-white/10 bg-[#111] p-5">
   <button className="flex items-center gap-2 text-sm font-bold text-[#FBD046]" onClick={()=>setEditing(v=>!v)}><LockKeyhole size={16}/> Paramètres du roster</button>
   {editing&&<div className="mt-4 space-y-3">
    <RosterLogoForm id={id} onChanged={()=>void load()}/>
    <label className="block text-xs text-slate-400">Nom<input value={name} onChange={e=>setName(e.target.value)} maxLength={80} className="mt-1 w-full rounded-lg border border-white/15 bg-black p-3 text-sm text-white"/></label>
    <div className="flex gap-4">{[[primary,setPrimary,"Principale"],[secondary,setSecondary,"Accent"]].map(([value,setValue,label])=>
     <label key={String(label)} className="flex items-center gap-2 text-xs text-slate-400">{String(label)}
      <input type="color" value={value as string} onChange={e=>(setValue as (v:string)=>void)(e.target.value)}/></label>)}</div>
    <div className="flex flex-wrap gap-2">
     <button disabled={busy} onClick={()=>void save()} className="rounded-lg bg-[#FBD046] px-4 py-2 text-xs font-black text-black disabled:opacity-50">Enregistrer</button>

    </div>
   </div>}
  </section>}
  </>}
 </div></main>;
}
