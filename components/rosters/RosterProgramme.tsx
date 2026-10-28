"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { CalendarDays, LoaderCircle, Plus, RefreshCw, Trash2 } from "lucide-react";
type Event = {id:string;date:string;time:string;competition:string;opponent:string;type:"competition"|"tournament"|"friendly"};
type ApiResponse={events?:Event[];canWrite?:boolean;error?:string};
const EVENT_TYPES=[
 {value:"competition",label:"Championnat / Coupe"},
 {value:"tournament",label:"Tournoi"},
 {value:"friendly",label:"Match amical"},
];
const dateLabel=(date:string)=>new Intl.DateTimeFormat("fr-FR",{weekday:"short",day:"2-digit",month:"short",timeZone:"Europe/Paris"}).format(new Date(date+"T12:00:00Z"));
export function RosterProgramme({rosterId,rosterName,color}: {rosterId:string;rosterName:string;color:string}) {
 const [events,setEvents]=useState<Event[]>([]);
 const [canWrite,setCanWrite]=useState(false);
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState("");
 const [message,setMessage]=useState("");
 const [showForm,setShowForm]=useState(false);
 const [date,setDate]=useState("");
 const [time,setTime]=useState("21:20");
 const [opponent,setOpponent]=useState("");
 const [competition,setCompetition]=useState("");
 const [type,setType]=useState<Event["type"]>("competition");
 const base="/api/rosters/"+encodeURIComponent(rosterId)+"/events";
 const load=useCallback(async(signal?:AbortSignal)=>{
  setLoading(true);
  try{
   const response=await fetch(base,{cache:"no-store",signal});
   const data=await response.json() as ApiResponse;
   if(!response.ok)throw new Error(data.error??"Programme indisponible.");
   if(!signal?.aborted){setEvents(data.events??[]);setCanWrite(Boolean(data.canWrite));setError("");}
  }catch(e){if(!signal?.aborted)setError(e instanceof Error?e.message:"Programme indisponible.");}
  finally{if(!signal?.aborted)setLoading(false);}
 },[base]);
 useEffect(()=>{const c=new AbortController();void load(c.signal);return()=>c.abort();},[load]);
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();setSaving(true);setError("");setMessage("");
  try{
   const response=await fetch(base,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({date,time,opponent,competition,type})});
   const result=await response.json();
   if(!response.ok)throw new Error(result.error??"Enregistrement impossible.");
   setMessage("Rencontre ajoutée.");setOpponent("");setShowForm(false);
   await load();
  }catch(e){setError(e instanceof Error?e.message:"Enregistrement impossible.");}
  finally{setSaving(false);}
 }
 async function remove(id:string){
  if(!window.confirm("Supprimer cette rencontre du programme ?"))return;
  setSaving(true);setMessage("");setError("");
  try{
   const response=await fetch(base,{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({eventId:id})});
   const result=await response.json();
   if(!response.ok)throw new Error(result.error??"Suppression impossible.");
   setMessage("Rencontre supprimée.");await load();
  }catch(e){setError(e instanceof Error?e.message:"Suppression impossible.");}
  finally{setSaving(false);}
 }
 return <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#111]">
  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
   <div><h2 className="flex items-center gap-2 text-lg font-black"><CalendarDays size={20} style={{color}}/> Programme de {rosterName}</h2>
    <p className="mt-1 text-xs text-slate-400">Rencontres propres à ce roster · horaires en France</p></div>
   <div className="flex gap-2">
    <button disabled={loading} type="button" onClick={()=>void load()} className="rounded-lg border border-white/15 p-2 text-slate-300 disabled:opacity-40" aria-label="Actualiser le programme"><RefreshCw size={16}/></button>
    {canWrite&&<button type="button" onClick={()=>setShowForm(x=>!x)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-black text-black" style={{backgroundColor:color}}><Plus size={15}/> Rencontre</button>}
   </div>
  </div>
  {error&&<p role="alert" className="m-4 rounded-lg border border-rose-400/30 bg-rose-400/10 p-3 text-xs text-rose-200">{error}</p>}
  {message&&<p role="status" className="mx-5 mt-3 text-xs text-emerald-300">{message}</p>}
  {canWrite&&showForm&&<form onSubmit={submit} className="grid gap-3 border-b border-white/10 bg-black/20 p-5 sm:grid-cols-2">
   <label className="text-xs text-slate-300">Date
    <input type="date" required value={date} onChange={e=>setDate(e.target.value)}
      className="mt-1 w-full rounded-lg border border-white/15 bg-[#090909] p-3 text-sm text-white"/></label>
   <label className="text-xs text-slate-300">Horaire
    <input type="time" required value={time} onChange={e=>setTime(e.target.value)}
      className="mt-1 w-full rounded-lg border border-white/15 bg-[#090909] p-3 text-sm text-white"/></label>
   <label className="text-xs text-slate-300">Compétition / événement
    <input required maxLength={90} minLength={2} value={competition} onChange={e=>setCompetition(e.target.value)}
      placeholder="Ex. VPG France L3" className="mt-1 w-full rounded-lg border border-white/15 bg-[#090909] p-3 text-sm text-white"/></label>
   <label className="text-xs text-slate-300">Adversaire
    <input required maxLength={120} minLength={2} value={opponent} onChange={e=>setOpponent(e.target.value)}
      placeholder="Ex. QLF CITY" className="mt-1 w-full rounded-lg border border-white/15 bg-[#090909] p-3 text-sm text-white"/></label>
   <label className="text-xs text-slate-300 sm:col-span-2">Type
    <select value={type} onChange={e=>setType(e.target.value as Event["type"])}
      className="mt-1 w-full rounded-lg border border-white/15 bg-[#090909] p-3 text-sm text-white">
      {EVENT_TYPES.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}
    </select>
   </label>
   <button disabled={saving} type="submit" className="flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-xs font-black text-black disabled:opacity-40 sm:col-span-2" style={{backgroundColor:color}}>
    {saving?<LoaderCircle className="animate-spin" size={15}/>:<Plus size={15}/>} Ajouter au programme
   </button>
  </form>}
  {loading&&events.length===0?<p role="status" className="px-5 py-6 text-sm text-slate-400">Chargement du programme…</p>:
   events.length===0?<p className="px-5 py-6 text-sm text-slate-400">Aucune rencontre programmée. {canWrite?"Ajoute la première rencontre de ce roster.":""}</p>:
   <div className="divide-y divide-white/10">{events.map(e=><div key={e.id} className="flex items-center justify-between gap-3 px-5 py-3">
    <div className="min-w-0"><p className="text-sm font-bold">{rosterName} vs {e.opponent}</p>
     <p className="mt-1 text-xs text-slate-400">{dateLabel(e.date)} · {e.time} · {e.competition}</p></div>
    {canWrite&&<button type="button" aria-label={"Supprimer la rencontre contre "+e.opponent} disabled={saving} onClick={()=>void remove(e.id)}
     className="rounded-lg border border-rose-400/20 p-2 text-rose-200 disabled:opacity-40"><Trash2 size={15}/></button>}
   </div>)}</div>}
  {events.length>=200&&<p className="px-5 py-3 text-xs text-amber-200">La liste est limitée à 200 rencontres.</p>}
 </section>;
}
