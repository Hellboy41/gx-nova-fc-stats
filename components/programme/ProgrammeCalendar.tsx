"use client";

import {useCallback,useEffect,useMemo,useState,type DragEvent,type FormEvent} from "react";
import {CalendarDays,ChevronLeft,ChevronRight,Clock3,GripVertical,LoaderCircle,MoveRight,RefreshCw,X} from "lucide-react";
import {addProgrammeDays} from "@/lib/programme-period";

type Status="upcoming"|"ea"|"forfeit"|"administrative";
export type CalendarMatch={
 id:string;date:string;time:string;opponent:string;competition:string;
 status:Status;goalsFor:number|null;goalsAgainst:number|null;
};
type Response={events?:CalendarMatch[];canEdit?:boolean;first?:string;last?:string;error?:string};
type Props={
 rosterId:string;rosterName:string;canEdit:boolean;initialDate:string;color?:string;
 onMoved?:(date:string)=>void;onOpenDate?:(date:string)=>void;
};
type Pending={match:CalendarMatch;date:string;time:string};
const WEEKDAYS=["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];
const COLOR:Record<Status,string>={
 upcoming:"border-cyan-400/25 bg-cyan-400/[0.09] text-cyan-100",
 ea:"border-emerald-400/25 bg-emerald-400/[0.10] text-emerald-200",
 forfeit:"border-amber-400/25 bg-amber-400/[0.10] text-amber-200",
 administrative:"border-violet-400/25 bg-violet-400/[0.10] text-violet-200",
};
const LABEL:Record<Status,string>={upcoming:"À jouer",ea:"Résultat EA",forfeit:"Forfait",administrative:"Hors EA"};
function monthShift(month:string,offset:number){
 const [year,m]=month.split("-").map(Number);
 return new Date(Date.UTC(year,m-1+offset,1)).toISOString().slice(0,7);
}
function dateText(date:string){
 return new Intl.DateTimeFormat("fr-FR",{day:"numeric",month:"short",year:"numeric",timeZone:"UTC"}).format(new Date(date+"T12:00:00Z"));
}
function validateTime(value:string){return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);}
export function ProgrammeCalendar({rosterId,rosterName,canEdit,initialDate,color="#FBD046",onMoved,onOpenDate}:Props){
 const [month,setMonth]=useState(initialDate.slice(0,7));
 const [matches,setMatches]=useState<CalendarMatch[]>([]);
 const [first,setFirst]=useState("");
 const [last,setLast]=useState("");
 const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false);
 const [error,setError]=useState(""),[notice,setNotice]=useState("");
 const [pending,setPending]=useState<Pending|null>(null);
 useEffect(()=>{if(/^\d{4}-(0[1-9]|1[0-2])$/.test(initialDate.slice(0,7)))setMonth(initialDate.slice(0,7));},[initialDate]);
 const load=useCallback(async(signal?:AbortSignal)=>{
  setLoading(true);setError("");
  try{
   const q=new URLSearchParams({rosterId,month});
   const r=await fetch("/api/programme/calendar?"+q,{cache:"no-store",signal});
   const data=await r.json() as Response;
   if(!r.ok)throw new Error(data.error??"Calendrier indisponible.");
   if(!signal?.aborted){setMatches(data.events??[]);setFirst(data.first??"");setLast(data.last??"");}
  }catch(e){if(!signal?.aborted)setError(e instanceof Error?e.message:"Calendrier indisponible.");}
  finally{if(!signal?.aborted)setLoading(false);}
 },[rosterId,month]);
 useEffect(()=>{const c=new AbortController();void load(c.signal);return()=>c.abort();},[load]);
 const dates=useMemo(()=>first?Array.from({length:42},(_,i)=>addProgrammeDays(first,i)):[],[first]);
 const byDate=useMemo(()=>{
  const map=new Map<string,CalendarMatch[]>();
  for(const m of matches){const list=map.get(m.date)??[];list.push(m);map.set(m.date,list);}
  return map;
 },[matches]);
 function propose(match:CalendarMatch,date=match.date){
  if(!canEdit||match.status!=="upcoming")return;
  setPending({match,date,time:match.time||"21:20"});setError("");setNotice("");
 }
 function drop(e:DragEvent<HTMLDivElement>,date:string){
  if(!canEdit)return;
  e.preventDefault();
  const encoded=e.dataTransfer.getData("application/x-atyom-match");
  const match=matches.find(v=>v.id===encoded);
  if(match)propose(match,date);
 }
 async function save(e:FormEvent<HTMLFormElement>){
  e.preventDefault();
  if(!pending||!canEdit)return;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(pending.date)||!validateTime(pending.time)){
   setError("Choisis une date et un horaire valides.");return;
  }
  setSaving(true);setError("");setNotice("");
  try{
   const response=await fetch("/api/programme/calendar/move",{
    method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({
     rosterId,eventId:pending.match.id,
     fromDate:pending.match.date,fromTime:pending.match.time,
     toDate:pending.date,toTime:pending.time,
    }),
   });
   const data=await response.json() as {success?:boolean;error?:string};
   if(!response.ok||!data.success)throw new Error(data.error??"Déplacement impossible.");
   setPending(null);
   setNotice("Match reporté au "+dateText(pending.date)+" à "+pending.time+".");
   onMoved?.(pending.date);
   await load();
  }catch(e){setError(e instanceof Error?e.message:"Déplacement impossible. Actualise le programme.");}
  finally{setSaving(false);}
 }
 const monthLabel=new Intl.DateTimeFormat("fr-FR",{month:"long",year:"numeric",timeZone:"UTC"})
  .format(new Date(month+"-01T12:00:00Z"));
 const today=new Date().toLocaleDateString("en-CA",{timeZone:"Europe/Paris"});
 return <section className="overflow-hidden rounded-3xl border border-white/10 bg-[#071321]">
  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 bg-[#0A1827] px-5 py-5">
   <div className="flex min-w-0 items-center gap-3">
    <span className="rounded-xl border border-[#FBD046]/25 bg-[#FBD046]/10 p-3 text-[#FBD046]"><CalendarDays size={21}/></span>
    <div><h2 className="text-lg font-black capitalize text-white">{monthLabel}</h2>
     <p className="mt-1 text-xs text-slate-400">{rosterName} · glisse un match sur une autre journée, ou utilise « Décaler »</p></div>
   </div>
   <div className="flex items-center gap-2">
    <button type="button" aria-label="Mois précédent" onClick={()=>setMonth(m=>monthShift(m,-1))}
     className="rounded-lg border border-white/10 p-2.5 text-white hover:bg-white/10"><ChevronLeft size={18}/></button>
    <button type="button" onClick={()=>setMonth(today.slice(0,7))}
     className="rounded-lg border border-white/10 px-3 py-2.5 text-xs font-black text-slate-200 hover:bg-white/10">Aujourd’hui</button>
    <button type="button" aria-label="Mois suivant" onClick={()=>setMonth(m=>monthShift(m,1))}
     className="rounded-lg border border-white/10 p-2.5 text-white hover:bg-white/10"><ChevronRight size={18}/></button>
    <button type="button" aria-label="Actualiser le calendrier" disabled={loading} onClick={()=>void load()}
     className="rounded-lg border border-white/10 p-2.5 text-slate-200 hover:bg-white/10 disabled:opacity-40"><RefreshCw size={17} className={loading?"animate-spin":""}/></button>
   </div>
  </div>
  {error&&<p role="alert" className="m-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">{error}</p>}
  {notice&&<p role="status" className="m-4 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-200">{notice}</p>}
  <div className="flex flex-wrap gap-x-4 gap-y-2 border-b border-white/10 px-5 py-3 text-[11px] font-bold text-slate-300">
   {[["À jouer","bg-cyan-400"],["Joué EA","bg-emerald-400"],["Forfait","bg-amber-400"],["Hors EA","bg-violet-400"]].map(([label,cls])=>
    <span key={label} className="inline-flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${cls}`}/>{label}</span>)}
   <span className="ml-auto text-slate-500">{matches.length} rencontre{matches.length!==1?"s":""} sur la période</span>
  </div>
  <div className="overflow-x-auto">
   <div className="min-w-[740px]">
    <div className="grid grid-cols-7 border-b border-white/10 bg-black/20">
     {WEEKDAYS.map(d=><div key={d} className="px-2 py-3 text-center text-[11px] font-black uppercase tracking-wider text-slate-400">{d}</div>)}
    </div>
    {loading&&!dates.length?<div role="status" className="p-10 text-center text-sm text-slate-400">Chargement du calendrier…</div>:
    <div className="grid grid-cols-7">
     {dates.map(date=>{
      const daily=byDate.get(date)??[];
      const inMonth=date.slice(0,7)===month;
      return <div key={date} onDragOver={e=>{if(canEdit)e.preventDefault();}} onDrop={e=>drop(e,date)}
       className={`relative min-h-[160px] border-b border-r border-white/[0.07] p-2 transition ${inMonth?"bg-[#081523]":"bg-black/30"} ${date===today?"ring-1 ring-inset ring-[#FBD046]/40":""}`}>
       <div className="mb-2 flex items-center justify-between gap-1">
        {onOpenDate?<button type="button" title="Voir le programme de ce jour" onClick={()=>onOpenDate(date)}
         className={`rounded-lg px-2 py-1 text-xs font-black hover:bg-white/10 ${date===today?"bg-[#FBD046]/15 text-[#FBD046]":inMonth?"text-white":"text-slate-500"}`}>
         {Number(date.slice(8))}</button>:
         <span className={`rounded-lg px-2 py-1 text-xs font-black ${date===today?"text-[#FBD046]":inMonth?"text-white":"text-slate-500"}`}>{Number(date.slice(8))}</span>}
        {daily.length>0&&<span className="rounded-md bg-white/5 px-1.5 text-[10px] text-slate-400">{daily.length}</span>}
       </div>
       <div className="space-y-1.5">
        {daily.map(m=><div key={m.id}
         draggable={canEdit&&m.status==="upcoming"}
         onDragStart={e=>{if(canEdit&&m.status==="upcoming"){e.dataTransfer.setData("application/x-atyom-match",m.id);e.dataTransfer.effectAllowed="move";}}}
         className={`rounded-lg border p-2 text-left shadow-sm ${COLOR[m.status]} ${canEdit&&m.status==="upcoming"?"cursor-grab active:cursor-grabbing":""}`}>
         <p className="flex items-center gap-1 text-[10px] font-black"><Clock3 size={11}/>{m.time||"--:--"}
          {canEdit&&m.status==="upcoming"&&<GripVertical size={12} className="ml-auto opacity-50"/>}</p>
         <p className="mt-1 line-clamp-2 break-words text-[11px] font-bold leading-snug" title={m.opponent}>{m.opponent}</p>
         {m.status!=="upcoming"?<p className="mt-1 text-[10px] font-bold">
          {m.goalsFor!=null&&m.goalsAgainst!=null?`${m.goalsFor}–${m.goalsAgainst} · `:""}{LABEL[m.status]}</p>:
          canEdit&&<button type="button" onClick={()=>propose(m)}
           className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold underline decoration-dotted underline-offset-2 hover:text-white">
           <MoveRight size={12}/> Décaler</button>}
        </div>)}
       </div>
      </div>;
     })}
    </div>}
   </div>
  </div>
  <p className="px-5 py-3 text-xs text-slate-500">
   {canEdit?"Les matchs finalisés EA, par forfait ou hors EA sont verrouillés. Le déplacement conserve la préparation de la rencontre.":"Calendrier en lecture seule."}
  </p>
  {pending&&<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4">
   <form role="dialog" aria-modal="true" aria-label="Reporter une rencontre" onSubmit={e=>void save(e)}
    className="w-full max-w-lg rounded-3xl border border-[#FBD046]/25 bg-[#0B1524] p-5 shadow-2xl sm:p-7">
    <div className="flex items-start justify-between gap-3">
     <div><p className="text-[11px] font-black uppercase tracking-[.18em] text-[#FBD046]">Modification du programme</p>
      <h3 className="mt-2 text-xl font-black text-white">Reporter le match</h3>
      <p className="mt-2 text-sm text-slate-300">{rosterName} vs {pending.match.opponent}</p>
      <p className="mt-1 text-xs text-slate-500">{pending.match.competition}</p></div>
     <button type="button" onClick={()=>setPending(null)} aria-label="Fermer" disabled={saving} className="rounded-lg p-2 text-slate-300 hover:bg-white/10"><X size={19}/></button>
    </div>
    <p className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-slate-400">
     Horaire initial : {dateText(pending.match.date)} à {pending.match.time||"définir"}
    </p>
    <div className="mt-4 grid grid-cols-2 gap-3">
     <label className="text-xs font-semibold text-slate-300">Nouvelle date
      <input type="date" required value={pending.date} onChange={e=>setPending(p=>p?{...p,date:e.target.value}:p)}
       className="mt-2 w-full rounded-xl border border-white/15 bg-[#050E18] px-3 py-3 text-sm text-white [color-scheme:dark]"/></label>
     <label className="text-xs font-semibold text-slate-300">Nouvel horaire
      <input type="time" required value={pending.time} onChange={e=>setPending(p=>p?{...p,time:e.target.value}:p)}
       className="mt-2 w-full rounded-xl border border-white/15 bg-[#050E18] px-3 py-3 text-sm text-white [color-scheme:dark]"/></label>
    </div>
    <p className="mt-4 text-xs text-slate-400">L’adversaire, la compétition et les disponibilités/compositions déjà préparées sont conservés.</p>
    {error&&<p role="alert" className="mt-3 text-xs text-rose-300">{error}</p>}
    <div className="mt-6 flex flex-wrap justify-end gap-2">
     <button type="button" disabled={saving} onClick={()=>setPending(null)} className="rounded-lg border border-white/15 px-4 py-3 text-xs font-bold text-slate-300">Annuler</button>
     <button type="submit" disabled={saving} style={{backgroundColor:color}}
      className="flex items-center gap-2 rounded-lg px-4 py-3 text-xs font-black text-black disabled:opacity-40">
      {saving?<LoaderCircle size={15} className="animate-spin"/>:<MoveRight size={15}/>}
      {saving?"Déplacement…":"Confirmer le report"}</button>
    </div>
   </form>
  </div>}
 </section>;
}
