"use client";
import {useCallback,useEffect,useMemo,useState,type FormEvent} from "react";
import {Check, CircleAlert, ClipboardList, Download, LoaderCircle, Plus, RefreshCw, Save, Shield, Shirt, UserRoundPlus, Users, X} from "lucide-react";
import {TacticalPitch,type PitchPlayer} from "@/components/lineups/TacticalPitch";
import {ROSTER_FORMATIONS,formationByName,remapRosterAssignments} from "@/lib/platform/roster-formations";
import {downloadLineupPoster} from "@/lib/platform/lineup-poster";

type Player={id:string;display_name:string;shirt_number:number|null;preferred_position:string;is_active:boolean};
type PlayerReply={players:Player[];canWrite:boolean;error?:string};
type LineupReply={formation:string;assignments:Record<string,string>;bench:string[];canWrite:boolean;updatedAt:string|null;error?:string};
type Tab="lineup"|"squad";
const OPTIONS=["POLY","GK","DG","DD","DC","DCG","DCD","MDC","MC","MCG","MCD","MG","MD","MOC","BU","ATG","ATD"];
export function RosterSquadStudio({rosterId,rosterName,primary,secondary,logoUrl}:{
 rosterId:string;rosterName:string;primary:string;secondary:string;logoUrl?:string|null;
}){
 const [tab,setTab]=useState<Tab>("lineup");
 const [players,setPlayers]=useState<Player[]>([]);
 const [formation,setFormation]=useState("4-3-3");
 const [assignments,setAssignments]=useState<Record<string,string>>({});
 const [bench,setBench]=useState<string[]>([]);
 const [selectedSlot,setSelectedSlot]=useState<string|null>(null);
 const [benchCandidate,setBenchCandidate]=useState("");
 const [canWrite,setCanWrite]=useState(false);
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [dirty,setDirty]=useState(false);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const [editingId,setEditingId]=useState<string|null>(null);
 const [editName,setEditName]=useState("");
 const [editNumber,setEditNumber]=useState("");
 const [editPosition,setEditPosition]=useState("POLY");
 const [newName,setNewName]=useState("");
 const [newNumber,setNewNumber]=useState("");
 const [newPosition,setNewPosition]=useState("POLY");
 const [edition,setEdition]=useState(0);
 const base="/api/rosters/"+encodeURIComponent(rosterId);
 const load=useCallback(async(signal:AbortSignal)=>{
  setLoading(true);
  try{
   const [a,b]=await Promise.all([fetch(base+"/players",{cache:"no-store",signal}),fetch(base+"/lineup",{cache:"no-store",signal})]);
   const [p,l]=await Promise.all([a.json() as Promise<PlayerReply>,b.json() as Promise<LineupReply>]);
   if(!a.ok||!b.ok)throw new Error(p.error??l.error??"Effectif indisponible.");
   if(signal.aborted)return;
   setPlayers(p.players??[]);setCanWrite(Boolean(p.canWrite&&l.canWrite));
   setFormation(formationByName(l.formation)?l.formation:"4-3-3");
   const eligible=new Set((p.players??[]).filter(player=>player.is_active).map(player=>player.id));
   setAssignments(Object.fromEntries(Object.entries(l.assignments??{}).filter(([,id])=>eligible.has(id))));
   setBench((l.bench??[]).filter(id=>eligible.has(id)));
   setSelectedSlot(null);setDirty(false);setError("");
  }catch(e){if(!signal.aborted)setError(e instanceof Error?e.message:"Chargement impossible.");}
  finally{if(!signal.aborted)setLoading(false);}
 },[base]);
 useEffect(()=>{const c=new AbortController();void load(c.signal);return()=>c.abort();},[load,edition]);
 const active=useMemo(()=>players.filter(p=>p.is_active),[players]);
 const byId=useMemo(()=>new Map(active.map(p=>[p.id,p])),[active]);
 const slots=formationByName(formation)?.slots??[];
 const starting=Object.values(assignments).filter(id=>byId.has(id));
 const validBench=bench.filter(id=>byId.has(id)&&!starting.includes(id));
 const spots:PitchPlayer[]=slots.map(s=>{
  const p=byId.get(assignments[s.slot]);
  return {slot:s.slot,x:s.x,y:s.y,name:p?.display_name??"",number:p?.shirt_number??null};
 });
 function changeFormation(next:string){
  if(!formationByName(next))return;
  setAssignments(remapRosterAssignments(assignments,formation,next));setFormation(next);setSelectedSlot(null);setDirty(true);setNotice("");
 }
 function choose(slot:string,id:string){
  const next={...assignments};
  for(const key of Object.keys(next))if(next[key]===id&&key!==slot)delete next[key];
  if(id)next[slot]=id;else delete next[slot];
  setAssignments(next);setBench(old=>old.filter(item=>item!==id));setDirty(true);setNotice("");
 }
 function addBench(){
  if(!benchCandidate||validBench.length>=12)return;
  setBench(old=>[...old,benchCandidate]);setBenchCandidate("");setDirty(true);setNotice("");
 }
 async function saveLineup(){
  if(!canWrite)return;setBusy(true);setError("");setNotice("");
  try{
   const r=await fetch(base+"/lineup",{method:"PUT",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({formation,assignments,bench:validBench})});
   const data=await r.json();
   if(!r.ok)throw new Error(data.error??"Enregistrement impossible.");
   setDirty(false);setNotice("Composition enregistrée.");setBench(data.bench);
  }catch(e){setError(e instanceof Error?e.message:"Enregistrement impossible.");}
  finally{setBusy(false);}
 }
 async function createPlayer(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(!canWrite)return;
  setBusy(true);setError("");setNotice("");
  try{
   const r=await fetch(base+"/players",{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({name:newName,number:newNumber?Number(newNumber):null,position:newPosition})});
   const data=await r.json();
   if(!r.ok)throw new Error(data.error??"Ajout impossible.");
   setNewName("");setNewNumber("");setNewPosition("POLY");setNotice("Joueur ajouté à l'effectif.");
   // Ne pas écraser une composition en cours d'édition.
   setPlayers(old=>[...old,data.player].sort((a,b)=>a.display_name.localeCompare(b.display_name,"fr")));
  }catch(e){setError(e instanceof Error?e.message:"Ajout impossible.");}finally{setBusy(false);}
 }
 function startEditing(p:Player){
  setEditingId(p.id);setEditName(p.display_name);setEditNumber(p.shirt_number==null?"":String(p.shirt_number));
  setEditPosition(p.preferred_position);setError("");setNotice("");
 }
 async function saveEdited(){
  const p=players.find(x=>x.id===editingId);
  if(!p)return;
  setBusy(true);setError("");setNotice("");
  try{
   const r=await fetch(base+"/players",{method:"PATCH",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({playerId:p.id,name:editName,number:editNumber?Number(editNumber):null,position:editPosition,isActive:p.is_active})});
   const data=await r.json();
   if(!r.ok)throw new Error(data.error??"Modification impossible.");
   setPlayers(old=>old.map(x=>x.id===p.id?data.player:x));
   setEditingId(null);setNotice("Fiche joueur actualisée.");
  }catch(e){setError(e instanceof Error?e.message:"Modification impossible.");}finally{setBusy(false);}
 }
 async function togglePlayer(p:Player){
  if(!canWrite)return;
  if(dirty){setError("Enregistre ou réinitialise d'abord la composition avant de modifier l'effectif.");return;}
  setBusy(true);setError("");setNotice("");
  try{
   const r=await fetch(base+"/players",{method:"PATCH",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({playerId:p.id,name:p.display_name,number:p.shirt_number,position:p.preferred_position,isActive:!p.is_active})});
   const data=await r.json();
   if(!r.ok)throw new Error(data.error??"Modification impossible.");
   setPlayers(old=>old.map(x=>x.id===p.id?data.player:x));
   setNotice(p.is_active?"Joueur désactivé, historique conservé.":"Joueur réactivé.");
  }catch(e){setError(e instanceof Error?e.message:"Modification impossible.");}finally{setBusy(false);}
 }
 async function exportPng(){
  setError("");try{
   await downloadLineupPoster({rosterName,formation,spots,primary,secondary,bench:validBench.map(id=>byId.get(id)?.display_name??"")});
  }catch(e){setError(e instanceof Error?e.message:"Export impossible.");}
 }
 return <section className="space-y-5">
  <div className="flex flex-wrap items-center justify-between gap-3">
   <div><p className="text-xs font-black uppercase tracking-[.18em]" style={{color:primary}}>Performance · {rosterName}</p>
    <h2 className="mt-1 text-2xl font-black">Effectif & composition</h2>
    <p className="mt-1 text-xs text-slate-400">11 titulaires, banc et postes personnalisés · données indépendantes par roster</p></div>
   <div className="flex rounded-xl border border-white/10 bg-black/30 p-1">
    {[{id:"lineup",label:"Composition",icon:Shirt},{id:"squad",label:"Effectif",icon:Users}].map(t=>{
     const Icon=t.icon;return <button type="button" key={t.id} onClick={()=>setTab(t.id as Tab)}
      className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-black transition ${tab===t.id?"bg-white/10 text-white":"text-slate-500 hover:text-white"}`}
      style={tab===t.id?{boxShadow:`inset 0 0 0 1px ${primary}6b`}:undefined}><Icon size={15}/>{t.label}</button>;
    })}
   </div>
  </div>
  {loading&&<p role="status" className="rounded-xl border border-white/10 bg-[#111] p-4 text-sm text-slate-400">Chargement de l'effectif…</p>}
  {error&&<p role="alert" className="flex items-center gap-2 rounded-xl border border-rose-400/25 bg-rose-400/10 p-3 text-sm text-rose-200"><CircleAlert size={17}/>{error}</p>}
  {notice&&<p role="status" className="flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-xs text-emerald-300"><Check size={16}/>{notice}</p>}
  {!loading&&tab==="squad"&&<div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
   {canWrite&&<form onSubmit={createPlayer} className="self-start space-y-4 rounded-2xl border border-white/10 bg-[#111] p-5">
    <h3 className="flex items-center gap-2 font-black"><UserRoundPlus size={19} style={{color:primary}}/> Ajouter un joueur</h3>
    <label className="block text-xs text-slate-300">Pseudo
     <input required minLength={2} maxLength={40} value={newName} onChange={e=>setNewName(e.target.value)} placeholder="Ex. HELLBOY"
      className="mt-2 w-full rounded-xl border border-white/15 bg-black/30 p-3 text-sm text-white"/></label>
    <div className="grid grid-cols-2 gap-3">
     <label className="block text-xs text-slate-300">Numéro
      <input type="number" min={1} max={99} value={newNumber} onChange={e=>setNewNumber(e.target.value)} placeholder="41"
       className="mt-2 w-full rounded-xl border border-white/15 bg-black/30 p-3 text-sm text-white"/></label>
     <label className="block text-xs text-slate-300">Poste
      <select value={newPosition} onChange={e=>setNewPosition(e.target.value)}
       className="mt-2 w-full rounded-xl border border-white/15 bg-black/30 p-3 text-sm text-white">
       {OPTIONS.map(o=><option key={o} value={o}>{o}</option>)}</select></label>
    </div>
    <button type="submit" disabled={busy} className="flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-black text-black disabled:opacity-50" style={{backgroundColor:primary}}>
     {busy?<LoaderCircle size={16} className="animate-spin"/>:<Plus size={16}/>} Ajouter à l'effectif</button>
   </form>}
   <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#111]">
    <div className="flex justify-between border-b border-white/10 px-5 py-4"><h3 className="font-black">Joueurs du roster</h3><span className="text-xs text-slate-400">{active.length} actifs</span></div>
    {players.length===0?<p className="p-5 text-sm text-slate-400">Aucun joueur. Ajoute les membres de l'équipe pour construire la composition.</p>:
    <div className="max-h-[630px] divide-y divide-white/5 overflow-y-auto">{players.map(p=><div key={p.id} className="flex items-center gap-3 px-5 py-3">
     <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-sm font-black" style={{borderColor:primary+"55",color:primary}}>{p.shirt_number??"—"}</span>
     <div className="min-w-0 flex-1"><p className={`truncate text-sm font-bold ${p.is_active?"text-white":"text-slate-500"}`}>{p.display_name}</p>
      <p className="text-xs text-slate-500">{p.preferred_position} · {p.is_active?"Actif":"Inactif"}</p></div>
     {canWrite&&<div className="flex shrink-0 gap-2">
      <button type="button" disabled={busy} onClick={()=>startEditing(p)} className="rounded-lg border border-white/15 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Modifier</button>
      <button type="button" disabled={busy} onClick={()=>void togglePlayer(p)}
       className={`rounded-lg border px-3 py-2 text-xs font-bold disabled:opacity-50 ${p.is_active?"border-rose-400/20 text-rose-300":"border-emerald-400/20 text-emerald-300"}`}>
       {p.is_active?"Désactiver":"Réactiver"}</button>
     </div>}
    </div>)}</div>}
   </div>
  </div>}
  {!loading&&tab==="squad"&&editingId&&canWrite&&<form onSubmit={e=>{e.preventDefault();void saveEdited();}} className="rounded-2xl border border-white/15 bg-[#111] p-5">
   <h3 className="font-black" style={{color:primary}}>Modifier la fiche joueur</h3>
   <div className="mt-4 grid gap-3 sm:grid-cols-3">
    <label className="text-xs text-slate-300">Pseudo<input required minLength={2} maxLength={40} value={editName} onChange={e=>setEditName(e.target.value)}
      className="mt-2 w-full rounded-lg border border-white/15 bg-black p-3 text-sm text-white"/></label>
    <label className="text-xs text-slate-300">Numéro<input type="number" min={1} max={99} value={editNumber} onChange={e=>setEditNumber(e.target.value)}
      className="mt-2 w-full rounded-lg border border-white/15 bg-black p-3 text-sm text-white"/></label>
    <label className="text-xs text-slate-300">Poste<select value={editPosition} onChange={e=>setEditPosition(e.target.value)}
      className="mt-2 w-full rounded-lg border border-white/15 bg-black p-3 text-sm text-white">{OPTIONS.map(o=><option key={o} value={o}>{o}</option>)}</select></label>
   </div>
   <div className="mt-4 flex gap-3">
    <button type="submit" disabled={busy} className="rounded-lg px-4 py-2 text-xs font-black text-black disabled:opacity-50" style={{backgroundColor:primary}}>Enregistrer le joueur</button>
    <button type="button" onClick={()=>setEditingId(null)} className="rounded-lg border border-white/15 px-4 py-2 text-xs text-slate-300">Annuler</button>
   </div>
  </form>}
  {!loading&&tab==="lineup"&&<div className="space-y-4">
   <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#111] p-4">
    <div><p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Dispositif tactique</p>
     <select disabled={!canWrite||busy} value={formation} onChange={e=>changeFormation(e.target.value)}
      className="mt-1 rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-lg font-black text-white disabled:opacity-50">
      {ROSTER_FORMATIONS.map(f=><option key={f.name} value={f.name}>{f.name}</option>)}</select></div>
    <div className="flex flex-wrap items-center gap-2">
     <button type="button" onClick={()=>void exportPng()} className="flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2.5 text-xs font-black text-white"><Download size={15}/> Export PNG</button>
     {canWrite&&<button type="button" disabled={loading||busy} onClick={()=>setEdition(n=>n+1)}
      className="flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2.5 text-xs font-bold text-slate-300"><RefreshCw size={15}/> Annuler</button>}
     {canWrite&&<button type="button" disabled={busy||!dirty} onClick={()=>void saveLineup()}
      className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-black text-black disabled:opacity-40" style={{backgroundColor:primary}}>
      {busy?<LoaderCircle size={15} className="animate-spin"/>:<Save size={15}/>} Enregistrer</button>}
    </div>
   </div>
   <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(310px,.75fr)]">
    <TacticalPitch rosterName={rosterName} formation={formation} theme={{primary,secondary}}
      logoUrl={logoUrl} spots={spots} selectedSlot={selectedSlot}
      onSelect={canWrite?(slot)=>setSelectedSlot(slot):undefined}/>
    <div className="space-y-4">
     <div className="rounded-2xl border border-white/10 bg-[#111] p-5">
      <h3 className="flex items-center gap-2 font-black"><ClipboardList size={17} style={{color:primary}}/> Onze de départ</h3>
      <p className="mt-1 text-xs text-slate-400">{starting.length} / 11 titulaires · Sélectionne un poste sur le terrain ou dans la liste.</p>
      {active.length===0&&<button type="button" onClick={()=>setTab("squad")} className="mt-3 text-sm font-black" style={{color:primary}}>Ajouter des joueurs à l'effectif</button>}
      <div className="mt-4 max-h-[455px] space-y-2 overflow-y-auto pr-1">{slots.map(s=><div key={s.slot}
       className="flex items-center gap-2 rounded-xl border p-2" style={{borderColor:selectedSlot===s.slot?primary+"88":"#FFFFFF16",background:selectedSlot===s.slot?primary+"12":"#080F14"}}>
       <button type="button" onClick={()=>setSelectedSlot(s.slot)} className="w-12 shrink-0 text-center text-xs font-black" style={{color:primary}}>{s.slot}</button>
       <select aria-label={"Joueur du poste "+s.slot} value={byId.has(assignments[s.slot])?assignments[s.slot]:""}
        disabled={!canWrite||busy} onFocus={()=>setSelectedSlot(s.slot)} onChange={e=>choose(s.slot,e.target.value)}
        className="min-w-0 flex-1 rounded-lg border border-white/10 bg-[#07101A] px-3 py-2 text-sm text-white disabled:opacity-60">
        <option value="">Poste libre</option>
        {active.map(p=><option key={p.id} value={p.id} disabled={Object.entries(assignments).some(([other,id])=>other!==s.slot&&id===p.id)||validBench.includes(p.id)}>
         {p.display_name}{p.shirt_number?" #"+p.shirt_number:""}</option>)}
       </select>
      </div>)}</div>
     </div>
     <div className="rounded-2xl border border-white/10 bg-[#111] p-5">
      <div className="flex items-center justify-between"><h3 className="font-black">Remplaçants</h3><span className="text-xs text-slate-400">{validBench.length} / 12</span></div>
      {canWrite&&<div className="mt-3 flex gap-2"><select value={benchCandidate} onChange={e=>setBenchCandidate(e.target.value)}
       className="min-w-0 flex-1 rounded-lg border border-white/15 bg-[#07101A] p-2 text-xs text-white">
       <option value="">Choisir un joueur…</option>
       {active.filter(p=>!starting.includes(p.id)&&!validBench.includes(p.id)).map(p=><option value={p.id} key={p.id}>{p.display_name}</option>)}
      </select>
      <button type="button" onClick={addBench} disabled={!benchCandidate||validBench.length>=12}
       className="rounded-lg px-3 text-black disabled:opacity-40" style={{backgroundColor:primary}}><Plus size={17}/></button></div>}
      <div className="mt-3 space-y-2">{validBench.length===0?<p className="text-xs text-slate-500">Aucun remplaçant sélectionné.</p>:
       validBench.map(id=><div key={id} className="flex items-center justify-between rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm">
        <span>{byId.get(id)?.display_name}</span>
        {canWrite&&<button type="button" aria-label={"Retirer "+byId.get(id)?.display_name} onClick={()=>{setBench(old=>old.filter(x=>x!==id));setDirty(true);}} className="text-rose-300"><X size={16}/></button>}
       </div>)}</div>
     </div>
    </div>
   </div>
   {dirty&&<p role="status" className="flex items-center gap-2 text-xs text-amber-300"><Shield size={14}/> Modifications non enregistrées.</p>}
  </div>}
 </section>;
}
