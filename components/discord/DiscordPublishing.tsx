"use client";
import { useCallback,useEffect,useMemo,useState,type FormEvent } from "react";
import { CheckCircle2, CircleAlert, Link2, LoaderCircle, RefreshCw, Send, Trash2, Image as Picture } from "lucide-react";
type Publication={kind:"programme"|"results";period:"day"|"week";dateKey:string;weekStart:string;lastSyncedAt:string|null;error:string|null;messageId:string};
type Channel={id:string;label:string;discordChannelId:string|null;autoProgramme:boolean;autoResults:boolean;publications:Publication[]};
type Payload={canManage:boolean;canPublish:boolean;channels:Channel[];error?:string};
type Kind="programme"|"results";
type Period="day"|"week";
export function DiscordPublishing({rosterId,initialDate,pendingChanges=false}:{rosterId:string;initialDate:string;pendingChanges?:boolean}){
 const [channels,setChannels]=useState<Channel[]>([]);
 const [canManage,setCanManage]=useState(false),[canPublish,setCanPublish]=useState(false);
 const [selected,setSelected]=useState(""),[weekDate,setWeekDate]=useState(initialDate);
 const [period,setPeriod]=useState<Period>("week");
 const [name,setName]=useState(""),[url,setUrl]=useState("");
 const [showAdd,setShowAdd]=useState(false),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true);
 const [error,setError]=useState(""),[notice,setNotice]=useState("");
 const load=useCallback(async(signal?:AbortSignal)=>{
  try{
   const r=await fetch("/api/discord/channels?rosterId="+encodeURIComponent(rosterId),{cache:"no-store",signal});
   const data=await r.json() as Payload;
   if(!r.ok)throw new Error(data.error??"Canaux Discord indisponibles.");
   if(signal?.aborted)return;
   setChannels(data.channels??[]);setCanManage(data.canManage);setCanPublish(data.canPublish);
   setSelected(previous=>data.channels?.some(c=>c.id===previous)?previous:(data.channels?.[0]?.id??""));
  }catch(e){if(!signal?.aborted)setError(e instanceof Error?e.message:"Canaux indisponibles.");}
  finally{if(!signal?.aborted)setLoading(false);}
 },[rosterId]);
 useEffect(()=>{const c=new AbortController();void load(c.signal);return()=>c.abort();},[load]);
 useEffect(()=>{if(initialDate)setWeekDate(initialDate);},[initialDate]);
 const channel=useMemo(()=>channels.find(c=>c.id===selected),[channels,selected]);
 async function action(method:"POST"|"PATCH"|"DELETE",body:Record<string,unknown>){
  const response=await fetch("/api/discord/channels",{method,headers:{"Content-Type":"application/json"},body:JSON.stringify({rosterId,...body})});
  const data=await response.json() as {error?:string};
  if(!response.ok)throw new Error(data.error??"Action impossible.");
 }
 async function add(e:FormEvent){
  e.preventDefault();setBusy(true);setError("");setNotice("");
  try{
   await action("POST",{label:name,webhookUrl:url});
   setUrl("");setName("");setShowAdd(false);setNotice("Salon Discord connecté. Tu peux publier une première affiche.");await load();
  }catch(e){setError(e instanceof Error?e.message:"Webhook invalide.");}finally{setBusy(false);}
 }
 async function changeConfig(c:Channel,kind:Kind,checked:boolean){
  setBusy(true);setError("");setNotice("");
  try{
   await action("PATCH",{channelId:c.id,autoProgramme:kind==="programme"?checked:c.autoProgramme,
    autoResults:kind==="results"?checked:c.autoResults});
   setNotice("Synchronisation automatique mise à jour.");await load();
  }catch(e){setError(e instanceof Error?e.message:"Modification impossible.");}finally{setBusy(false);}
 }
 async function remove(){
  if(!channel||!window.confirm("Déconnecter ce salon Discord d'ATYOM ? Les messages déjà publiés resteront dans le salon."))return;
  setBusy(true);setError("");setNotice("");
  try{
   await action("DELETE",{channelId:channel.id});setNotice("Salon déconnecté.");await load();
  }catch(e){setError(e instanceof Error?e.message:"Suppression impossible.");}finally{setBusy(false);}
 }
 async function publish(kind:Kind){
  if(!channel||pendingChanges)return;
  setBusy(true);setError("");setNotice("");
  try{
   const r=await fetch("/api/discord/publish",{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({rosterId,channelId:channel.id,kind,period,date:weekDate})});
   const data=await r.json() as {error?:string;success?:boolean};
   if(!r.ok||!data.success)throw new Error(data.error??"Publication Discord impossible.");
   setNotice((kind==="programme"?"Programme":"Résultats")+" "+(period==="day"?"du jour":"de la semaine")+" publié : ce message sera actualisé après chaque changement enregistré.");
   await load();
  }catch(e){setError(e instanceof Error?e.message:"Publication impossible.");}finally{setBusy(false);}
 }
 return <section className="rounded-2xl border border-[#FBD046]/25 bg-[#101925] p-5">
  <div className="flex flex-wrap items-center justify-between gap-3">
   <div><h3 className="flex items-center gap-2 text-base font-black text-white"><Picture size={19} className="text-[#FBD046]"/> Affiches Discord synchronisées</h3>
    <p className="mt-1 text-xs text-slate-400">Programme et résultats en PNG · même message Discord mis à jour automatiquement.</p></div>
   <div className="flex gap-2">
    <button type="button" aria-label="Rafraîchir les canaux Discord" onClick={()=>void load()} className="rounded-lg border border-white/15 p-2 text-slate-300"><RefreshCw size={16}/></button>
    {canManage&&<button type="button" onClick={()=>setShowAdd(v=>!v)} className="rounded-lg border border-[#FBD046]/40 px-3 py-2 text-xs font-black text-[#FBD046]"><Link2 size={13} className="mr-1 inline"/> Associer un salon</button>}
   </div>
  </div>
  {loading&&<p className="mt-3 text-xs text-slate-400">Chargement des salons…</p>}
  {error&&<p role="alert" className="mt-3 flex items-center gap-2 text-xs text-rose-300"><CircleAlert size={15}/>{error}</p>}
  {notice&&<p role="status" className="mt-3 flex items-center gap-2 text-xs text-emerald-300"><CheckCircle2 size={15}/>{notice}</p>}
  {canManage&&showAdd&&<form onSubmit={add} className="mt-4 grid gap-3 border-t border-white/10 pt-4 sm:grid-cols-2">
    <label className="text-xs text-slate-300">Nom du salon
     <input required minLength={2} maxLength={60} value={name} onChange={e=>setName(e.target.value)}
      placeholder="Ex. Discord GX NØVA" className="mt-1 w-full rounded-lg border border-white/15 bg-[#060E17] p-3 text-sm text-white"/></label>
    <label className="text-xs text-slate-300">URL du webhook Discord
     <input required type="password" autoComplete="off" value={url} onChange={e=>setUrl(e.target.value)}
      placeholder="https://discord.com/api/webhooks/…" className="mt-1 w-full rounded-lg border border-white/15 bg-[#060E17] p-3 text-sm text-white"/></label>
    <p className="text-xs text-slate-400 sm:col-span-2">Discord → Paramètres du salon → Intégrations → Webhooks → Nouveau webhook → Copier l'URL. Ne partage jamais cette URL publiquement.</p>
    <button type="submit" disabled={busy} className="rounded-lg bg-[#FBD046] px-4 py-3 text-xs font-black text-black disabled:opacity-50 sm:col-span-2">Connecter ce salon</button>
   </form>}
  <div className="mt-5 space-y-3 border-t border-white/10 pt-4">
   <div className="grid gap-3 sm:grid-cols-2">
    <label className="text-xs font-semibold text-slate-300">Type de période
     <select value={period} onChange={e=>setPeriod(e.target.value as Period)}
      className="mt-1 block w-full rounded-lg border border-white/15 bg-[#06101B] px-3 py-3 text-sm text-white">
      <option value="week">Semaine entière · paysage 16:9</option>
      <option value="day">Un seul jour · affiche verticale</option>
     </select></label>
    <label className="text-xs font-semibold text-slate-300">{period==="day"?"Date de la journée":"Choisir un jour de la semaine"}
     <input type="date" value={weekDate} onChange={e=>setWeekDate(e.target.value)}
      className="mt-1 block w-full rounded-lg border border-white/15 bg-[#06101B] px-3 py-3 text-sm text-white [color-scheme:dark]"/></label>
   </div>
   <div className="grid gap-3 sm:grid-cols-2">
    {(["programme","results"] as Kind[]).map(kind=><div key={kind}
     className="rounded-xl border border-cyan-400/20 bg-[#071E30] p-3">
     <p className="text-sm font-black text-white">{kind==="programme"?"Programme":"Résultats"} {period==="day"?"du jour":"de la semaine"}</p>
     <p className="mt-1 text-xs text-slate-400">{period==="day"?"Visuel d’une journée":"Affiche paysage, journées en colonnes"}</p>
     <div className="mt-3 flex flex-wrap gap-2">
      <button type="button" disabled={!weekDate} onClick={()=>window.open("/api/discord/preview?"+
       new URLSearchParams({rosterId,kind,period,date:weekDate}),"_blank","noopener,noreferrer")}
       className="rounded-lg border border-cyan-400/30 px-3 py-2 text-xs font-black text-cyan-200 disabled:opacity-40">Aperçu PNG</button>
      {canPublish&&channel&&<button type="button" disabled={busy||pendingChanges||!weekDate} onClick={()=>void publish(kind)}
       className="flex items-center gap-2 rounded-lg bg-[#FBD046] px-3 py-2 text-xs font-black text-black disabled:opacity-40">
       {busy?<LoaderCircle size={14} className="animate-spin"/>:<Send size={14}/>} Publier / actualiser
      </button>}
     </div>
    </div>)}
   </div>
  </div>
  {channels.length>0&&<div className="mt-4 space-y-3">
   <label className="block text-xs font-semibold text-slate-300">Salon Discord de destination
    <select value={selected} onChange={e=>setSelected(e.target.value)}
     className="mt-1 block w-full rounded-lg border border-white/15 bg-[#06101B] px-3 py-3 text-sm text-white">
     {channels.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}
    </select>
   </label>
   {channel&&<>
    {pendingChanges&&<p className="text-xs text-amber-200">Enregistre d'abord les modifications du programme sur ATYOM avant de publier.</p>}
    {canManage&&<div className="flex flex-wrap items-center gap-4 border-t border-white/10 pt-3 text-xs text-slate-300">
     <label className="flex items-center gap-2"><input type="checkbox" checked={channel.autoProgramme} disabled={busy}
      onChange={e=>void changeConfig(channel,"programme",e.target.checked)}/> Actualiser automatiquement le programme</label>
     <label className="flex items-center gap-2"><input type="checkbox" checked={channel.autoResults} disabled={busy}
      onChange={e=>void changeConfig(channel,"results",e.target.checked)}/> Actualiser automatiquement les résultats</label>
     <button type="button" disabled={busy} onClick={()=>void remove()} className="flex items-center gap-1 text-rose-300"><Trash2 size={14}/> Déconnecter</button>
    </div>}
    <div className="space-y-1 text-[11px] text-slate-400">
     {channel.publications.slice(0,12).map(p=><p key={p.kind+p.period+p.dateKey}>
      {p.kind==="programme"?"Programme":"Résultats"} · {p.period==="day"?"jour du":"semaine du"} {p.dateKey} · {p.lastSyncedAt?"mise à jour "+new Intl.DateTimeFormat("fr-FR",{dateStyle:"short",timeStyle:"short"}).format(new Date(p.lastSyncedAt)):"publication en attente"}
      {p.error&&<span className="ml-2 text-rose-300">Erreur : {p.error}</span>}
     </p>)}
    </div>
   </>}
  </div>}
  {!loading&&channels.length===0&&<p className="mt-4 text-sm text-slate-400">
   Aucun salon connecté. {canManage?"Ajoute un webhook Discord pour publier la première affiche.":"Demande à un Admin ATYOM d'associer un salon Discord."}
  </p>}
  <p className="mt-3 text-[11px] text-slate-500">Les quatre formats ont chacun leur message Discord : programme jour, programme semaine, résultats jour et résultats semaine. Une première publication manuelle est nécessaire pour chaque date et format. Ensuite, les images sont remplacées automatiquement selon les options choisies.</p>
 </section>;
}
