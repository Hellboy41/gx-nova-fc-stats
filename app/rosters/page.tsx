"use client";
import {useEffect,useState} from "react";
import {ArrowLeft,ArrowUpRight,Layers3,Shield,Users} from "lucide-react";
import {useClubBranding} from "@/lib/platform/use-club-branding";
type Roster={id:string;name:string;eaClubId:string;gameEdition:string;workspaceMode:string;status:string;primaryColor:string;secondaryColor:string};
export default function RostersPage(){
 const branding=useClubBranding();
 const [rosters,setRosters]=useState<Roster[]>([]),[error,setError]=useState(""),[loading,setLoading]=useState(true),[canCreate,setCanCreate]=useState(false);
 useEffect(()=>{const c=new AbortController();void(async()=>{try{
  const r=await fetch("/api/rosters",{cache:"no-store",signal:c.signal});const data=await r.json();
  if(!r.ok)throw new Error(data.error??"Rosters indisponibles.");
  if(!c.signal.aborted){setRosters(data.rosters??[]);setCanCreate(Boolean(data.canCreate));}
 }catch(e){if(!c.signal.aborted)setError(e instanceof Error?e.message:"Erreur.");}finally{if(!c.signal.aborted)setLoading(false);}})();return()=>c.abort();},[]);
 return <main className="min-h-screen bg-[#060606] px-5 py-7 text-white">
  <div className="mx-auto max-w-5xl space-y-6">
   <header className="flex flex-wrap items-center justify-between gap-3">
    <div><a href="/" className="flex items-center gap-2 text-xs text-slate-400 hover:text-white"><ArrowLeft size={15}/> Centre ATYOM</a>
     <p className="mt-5 text-xs font-black uppercase tracking-widest" style={{color:branding.structure.primaryColor}}>{branding.structure.name} · Espace esport</p>
     <h1 className="mt-2 text-3xl font-black">Mes rosters</h1><p className="mt-2 text-sm text-slate-400">Les équipes auxquelles ton compte a accès.</p>
    </div>
    {canCreate&&<a href="/organisation" className="rounded-xl border border-[#FBD046]/40 bg-[#FBD046]/10 px-4 py-3 text-sm font-black text-[#FBD046]">Créer un roster</a>}
   </header>
   {loading&&<p role="status" className="rounded-xl border border-white/10 p-5 text-slate-400">Chargement…</p>}
   {error&&<p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-5 text-rose-300">{error}</p>}
   {!loading&&!error&&rosters.length===0&&<p className="rounded-xl border border-white/10 p-5 text-slate-400">Aucun roster actif ne t'est attribué. Contacte un administrateur ATYOM.</p>}
   <div className="grid gap-4 sm:grid-cols-2">
    {rosters.map(r=><a href={r.workspaceMode==="legacy"?"/":"/rosters/"+r.id} key={r.id}
      className="group rounded-2xl border bg-[#111] p-5 transition hover:bg-[#181818]" style={{borderColor:r.primaryColor+"55"}}>
     <div className="flex items-start justify-between gap-3">
      <div className="flex items-center gap-3">
       {r.workspaceMode==="legacy"&&branding.roster.logoUrl?<img src={branding.roster.logoUrl} alt="" className="h-14 w-14 object-contain"/>:
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-black/60"><Shield size={28} style={{color:r.primaryColor}}/></div>}
       <div><h2 className="text-lg font-black">{r.workspaceMode==="legacy"?branding.roster.name:r.name}</h2>
        <p className="mt-1 text-xs text-slate-400">{r.gameEdition} · EA {r.eaClubId}</p></div>
      </div><ArrowUpRight size={17} className="text-slate-500 transition group-hover:text-white"/>
     </div>
     <p className="mt-5 flex items-center gap-2 text-xs text-slate-400"><Layers3 size={14}/>{r.workspaceMode==="legacy"?"Centre de performance complet":"Suivi EA indépendant"}</p>
    </a>)}
   </div>
  </div>
 </main>;
}
