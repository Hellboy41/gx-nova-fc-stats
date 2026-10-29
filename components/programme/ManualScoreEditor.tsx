"use client";
import { useEffect,useState } from "react";
import { CheckCircle2, PencilLine, Save, Trash2 } from "lucide-react";
export type ManualResult={
 eventId:string;goalsFor:number;goalsAgainst:number;result:"V"|"N"|"D";kind:"forfeit"|"administrative";
};
type Props={rosterId:string;eventId:string;dateKey:string;canEdit:boolean;linkedToEa?:boolean;
 manualResult?:ManualResult|null;onSaved:()=>void;compact?:boolean};
export function ManualScoreEditor({rosterId,eventId,dateKey,canEdit,linkedToEa=false,manualResult,onSaved,compact=false}:Props){
 const [open,setOpen]=useState(false),[busy,setBusy]=useState(false);
 const [forScore,setForScore]=useState("3"),[against,setAgainst]=useState("0");
 const [kind,setKind]=useState<"forfeit"|"administrative">("forfeit");
 const [error,setError]=useState("");
 useEffect(()=>{setForScore(String(manualResult?.goalsFor??3));setAgainst(String(manualResult?.goalsAgainst??0));
   setKind(manualResult?.kind??"forfeit");},[manualResult?.goalsFor,manualResult?.goalsAgainst,manualResult?.kind,eventId]);
 async function save(remove=false){
  setBusy(true);setError("");
  try{
   const r=await fetch("/api/results/manual",{
    method:remove?"DELETE":"PUT",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({rosterId,eventId,dateKey,goalsFor:Number(forScore),goalsAgainst:Number(against),kind})
   });
   const data=await r.json();
   if(!r.ok)throw new Error(data.error??"Impossible d'enregistrer le résultat.");
   setOpen(false);onSaved();
  }catch(e){setError(e instanceof Error?e.message:"Enregistrement impossible.");}
  finally{setBusy(false);}
 }
 if(linkedToEa)return null;
 return <div className={`rounded-xl border ${compact?"border-amber-400/25 bg-amber-400/[0.05] p-3":"border-[#FBD046]/25 bg-[#FBD046]/[0.04] p-4"}`}>
  <div className="flex flex-wrap items-center justify-between gap-2">
   <div>
    {manualResult?<p className="flex items-center gap-2 text-sm font-black text-emerald-300">
      <CheckCircle2 size={15}/>{manualResult.kind==="forfeit"?"Forfait":"Résultat hors EA"} · {manualResult.goalsFor} - {manualResult.goalsAgainst}
      <span className="text-xs text-slate-400">({manualResult.result})</span></p>:
     <p className="text-xs font-black text-[#FBD046]">Score administratif / forfait</p>}
    <p className="mt-1 text-[11px] text-slate-400">Compté dans le bilan collectif, sans statistiques individuelles.</p>
   </div>
   {canEdit&&<button type="button" onClick={()=>setOpen(o=>!o)} disabled={busy}
    className="flex items-center gap-1.5 rounded-lg border border-[#FBD046]/30 px-3 py-2 text-xs font-black text-[#FBD046] disabled:opacity-50">
    <PencilLine size={14}/>{manualResult?"Corriger":"Saisir un score"}</button>}
  </div>
  {canEdit&&open&&<div className="mt-4 space-y-3 border-t border-white/10 pt-4">
   <label className="block text-xs font-semibold text-slate-300">Type de résultat
    <select value={kind} onChange={e=>setKind(e.target.value as "forfeit"|"administrative")}
     className="mt-1 w-full rounded-lg border border-white/15 bg-[#10151B] px-3 py-2 text-sm text-white">
     <option value="forfeit">Forfait (équipe absente / victoire ou défaite administrative)</option>
     <option value="administrative">Résultat validé hors EA</option>
    </select>
   </label>
   <div className="flex flex-wrap items-end gap-3">
    <label className="text-xs text-slate-300">Buts pour
     <input aria-label="Buts pour" required type="number" min="0" max="99" step="1" value={forScore} onChange={e=>setForScore(e.target.value)}
      className="mt-1 block w-24 rounded-lg border border-white/20 bg-[#10151B] px-3 py-2 text-center text-lg font-black text-white"/></label>
    <span className="pb-2 text-xl text-slate-400">–</span>
    <label className="text-xs text-slate-300">Buts contre
     <input aria-label="Buts contre" required type="number" min="0" max="99" step="1" value={against} onChange={e=>setAgainst(e.target.value)}
      className="mt-1 block w-24 rounded-lg border border-white/20 bg-[#10151B] px-3 py-2 text-center text-lg font-black text-white"/></label>
   </div>
   <p className="text-xs text-amber-200/80">Renseigne le score officiellement attribué par la ligue, et non un score fictif. Ce résultat ne sera pas importé depuis EA.</p>
   {error&&<p role="alert" className="text-xs text-rose-300">{error}</p>}
   <div className="flex flex-wrap gap-2">
    <button type="button" disabled={busy||forScore===""||against===""||!Number.isInteger(Number(forScore))||!Number.isInteger(Number(against))||
      Number(forScore)<0||Number(forScore)>99||Number(against)<0||Number(against)>99}
     onClick={()=>void save()} className="flex items-center gap-2 rounded-lg bg-[#FBD046] px-4 py-2 text-xs font-black text-black disabled:opacity-40">
     <Save size={14}/>{busy?"Enregistrement…":"Enregistrer le résultat"}</button>
    {manualResult&&<button type="button" disabled={busy} onClick={()=>{if(window.confirm("Annuler ce score manuel et le retirer des statistiques ?"))void save(true);}}
      className="flex items-center gap-2 rounded-lg border border-rose-400/30 px-3 py-2 text-xs font-bold text-rose-300 disabled:opacity-40">
      <Trash2 size={14}/> Retirer le résultat</button>}
   </div>
  </div>}
 </div>;
}
