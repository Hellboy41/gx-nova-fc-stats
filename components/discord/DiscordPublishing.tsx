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
 const [publicationKind,setPublicationKind]=useState<Kind>("programme");
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
 return <section className="rounded-2xl border border-cyan-400/20 bg-[#101925] p-4 sm:p-5">
  <div className="flex flex-wrap items-center justify-between gap-3">
   <div>
    <h3 className="flex items-center gap-2 text-base font-black text-white"><Picture size={19} className="text-cyan-300"/> Partager sur Discord</h3>
    <p className="mt-1 text-xs text-slate-400">Choisis le visuel, la date et le salon. ATYOM actualisera ensuite les messages publiés.</p>
   </div>
   {channel&&<span className="rounded-lg border border-emerald-400/20 bg-emerald-400/5 px-3 py-2 text-[11px] font-bold text-emerald-300">
    Salon connecté
   </span>}
  </div>
  {loading&&<p role="status" className="mt-3 text-xs text-slate-400">Chargement des salons…</p>}
  {error&&<p role="alert" className="mt-3 flex items-center gap-2 text-xs text-rose-300"><CircleAlert size={15}/>{error}</p>}
  {notice&&<p role="status" className="mt-3 flex items-center gap-2 text-xs text-emerald-300"><CheckCircle2 size={15}/>{notice}</p>}

  <div className="mt-4 rounded-2xl border border-white/10 bg-[#071522] p-4">
   <div className="grid gap-4 md:grid-cols-2">
    <div>
     <p className="mb-2 text-xs font-bold text-slate-300">1. Que veux-tu publier ?</p>
     <div role="group" aria-label="Contenu de la publication" className="inline-flex w-full gap-1 rounded-lg bg-[#050E19] p-1">
      <button type="button" onClick={()=>setPublicationKind("programme")} aria-pressed={publicationKind==="programme"}
       className={publicationKind==="programme"?"flex-1 rounded-md bg-cyan-400 px-3 py-2.5 text-sm font-black text-[#071321]":"flex-1 rounded-md px-3 py-2.5 text-sm font-bold text-slate-400 hover:bg-white/10"}>
       Programme</button>
      <button type="button" onClick={()=>setPublicationKind("results")} aria-pressed={publicationKind==="results"}
       className={publicationKind==="results"?"flex-1 rounded-md bg-cyan-400 px-3 py-2.5 text-sm font-black text-[#071321]":"flex-1 rounded-md px-3 py-2.5 text-sm font-bold text-slate-400 hover:bg-white/10"}>
       Résultats</button>
     </div>
    </div>
    <div>
     <label className="block text-xs font-bold text-slate-300">2. Quelle période ?
      <select value={period} onChange={e=>setPeriod(e.target.value as Period)}
       className="mt-2 block w-full rounded-lg border border-white/15 bg-[#050E19] px-3 py-3 text-sm text-white">
       <option value="week">Toute la semaine · format paysage</option>
       <option value="day">Un seul jour · format vertical</option>
      </select>
     </label>
    </div>
    <label className="block text-xs font-bold text-slate-300">3. {period==="day"?"Quelle journée ?":"Quelle semaine ?"}
     <input type="date" value={weekDate} onChange={e=>setWeekDate(e.target.value)}
      className="mt-2 block w-full rounded-lg border border-white/15 bg-[#050E19] px-3 py-3 text-sm text-white [color-scheme:dark]"/>
    </label>
    <label className="block text-xs font-bold text-slate-300">4. Dans quel salon ?
     {channels.length>0?
      <select value={selected} onChange={e=>setSelected(e.target.value)}
       className="mt-2 block w-full rounded-lg border border-white/15 bg-[#050E19] px-3 py-3 text-sm text-white">
       {channels.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}
      </select>:
      <p className="mt-2 rounded-lg border border-amber-400/20 bg-amber-400/5 px-3 py-3 text-xs text-amber-200">
       Aucun salon connecté. Ouvre « Paramètres Discord » pour en associer un.
      </p>}
    </label>
   </div>
   <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/10 pt-4">
    {weekDate&&<a
     href={"/api/discord/preview?"+new URLSearchParams({rosterId,kind:publicationKind,period,date:weekDate}).toString()}
     target="_blank" rel="noopener noreferrer"
     className="inline-flex items-center gap-2 rounded-lg border border-cyan-400/30 px-4 py-2.5 text-sm font-black text-cyan-200 hover:bg-cyan-400/10">
     <Picture size={16}/> Voir l'aperçu PNG</a>}
    {canPublish&&<button type="button" disabled={busy||pendingChanges||!weekDate||!channel}
     onClick={()=>void publish(publicationKind)}
     className="inline-flex items-center gap-2 rounded-lg bg-[#FBD046] px-4 py-2.5 text-sm font-black text-black disabled:opacity-40">
     {busy?<LoaderCircle size={15} className="animate-spin"/>:<Send size={15}/>} Publier / actualiser</button>}
    {!canPublish&&<p className="text-xs text-slate-400">Accès en lecture seule : un membre du staff peut publier.</p>}
   </div>
   {pendingChanges&&<p className="mt-3 text-xs font-bold text-amber-300">Enregistre d’abord les modifications du programme avant la publication.</p>}
  </div>

  <details className="mt-4 rounded-xl border border-white/10 bg-[#091521]">
   <summary className="cursor-pointer select-none px-4 py-3 text-sm font-bold text-slate-300 hover:text-white">
    Paramètres Discord et historique des publications
   </summary>
   <div className="space-y-4 border-t border-white/10 p-4">
    <div className="flex flex-wrap gap-2">
     <button type="button" onClick={()=>void load()}
      className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-white/10">
      <RefreshCw size={14}/> Actualiser les salons
     </button>
     {canManage&&<button type="button" onClick={()=>setShowAdd(v=>!v)}
      className="inline-flex items-center gap-1.5 rounded-lg border border-[#FBD046]/30 px-3 py-2 text-xs font-black text-[#FBD046] hover:bg-[#FBD046]/10">
      <Link2 size={14}/> Associer un salon
     </button>}
    </div>
    {canManage&&showAdd&&<form onSubmit={add} className="grid gap-3 rounded-xl border border-white/10 bg-[#050F19] p-3 sm:grid-cols-2">
     <label className="text-xs text-slate-300">Nom du salon
      <input required minLength={2} maxLength={60} value={name} onChange={e=>setName(e.target.value)}
       placeholder="Ex. Discord GX NØVA" className="mt-1 w-full rounded-lg border border-white/15 bg-[#060E17] p-3 text-sm text-white"/></label>
     <label className="text-xs text-slate-300">URL du webhook Discord
      <input required type="password" autoComplete="off" value={url} onChange={e=>setUrl(e.target.value)}
       placeholder="https://discord.com/api/webhooks/…" className="mt-1 w-full rounded-lg border border-white/15 bg-[#060E17] p-3 text-sm text-white"/></label>
     <p className="text-xs text-slate-400 sm:col-span-2">Discord → Paramètres du salon → Intégrations → Webhooks. Ne partage pas cette URL.</p>
     <button type="submit" disabled={busy} className="rounded-lg bg-[#FBD046] px-4 py-2.5 text-xs font-black text-black disabled:opacity-40 sm:col-span-2">Connecter le salon</button>
    </form>}
    {channel&&canManage&&<div className="flex flex-wrap gap-4 text-xs text-slate-300">
     <label className="flex items-center gap-2"><input type="checkbox" checked={channel.autoProgramme} disabled={busy}
      onChange={e=>void changeConfig(channel,"programme",e.target.checked)}/> Synchroniser automatiquement le programme</label>
     <label className="flex items-center gap-2"><input type="checkbox" checked={channel.autoResults} disabled={busy}
      onChange={e=>void changeConfig(channel,"results",e.target.checked)}/> Synchroniser automatiquement les résultats</label>
     <button type="button" disabled={busy} onClick={()=>void remove()} className="inline-flex items-center gap-1 text-rose-300">
      <Trash2 size={14}/> Déconnecter ce salon</button>
    </div>}
    {channel&&<div className="space-y-1 text-xs text-slate-400">
     <p className="font-bold text-slate-300">Dernières publications</p>
     {channel.publications.length===0&&<p>Aucune publication enregistrée pour ce salon.</p>}
     {channel.publications.slice(0,12).map(p=><p key={p.kind+p.period+p.dateKey}>
      {p.kind==="programme"?"Programme":"Résultats"} · {p.period==="day"?"jour du":"semaine du"} {p.dateKey} · {p.lastSyncedAt?"Actualisé le "+new Intl.DateTimeFormat("fr-FR",{dateStyle:"short",timeStyle:"short"}).format(new Date(p.lastSyncedAt)):"En attente"}
      {p.error&&<span className="ml-2 text-rose-300">Erreur : {p.error}</span>}
     </p>)}
    </div>}
    <p className="text-[11px] text-slate-500">La première publication se fait manuellement. Ensuite, l'image du même message Discord est actualisée si la synchronisation est activée.</p>
   </div>
  </details>
 </section>;
}
