"use client";
import { useState, type FormEvent } from "react";
import { Plus, ShieldCheck, LoaderCircle } from "lucide-react";
export function RosterManager(){
 const [name,setName]=useState(""),[eaId,setEaId]=useState(""),[edition,setEdition]=useState("FC27");
 const [primary,setPrimary]=useState("#22d3ee"),[secondary,setSecondary]=useState("#facc15");
 const [busy,setBusy]=useState(false),[error,setError]=useState("");
 async function create(event:FormEvent<HTMLFormElement>){
  event.preventDefault();setBusy(true);setError("");
  try{
   const response=await fetch("/api/rosters",{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({name,eaClubId:eaId,gameEdition:edition,primaryColor:primary,secondaryColor:secondary})});
   const data=await response.json();
   if(!response.ok||!data.roster)throw new Error(data.error??"Création impossible.");
   window.location.assign("/rosters/"+data.roster.id);
  }catch(e){setError(e instanceof Error?e.message:"Création impossible.");setBusy(false);}
 }
 return <section className="rounded-2xl border border-[#FBD046]/30 bg-[#101010] p-6">
  <div className="flex items-start justify-between gap-3">
   <div><p className="text-xs font-black uppercase tracking-widest text-[#FBD046]">Administrateur ATYOM</p>
    <h2 className="mt-1 flex items-center gap-2 text-xl font-black"><Plus size={20}/> Créer un nouveau roster</h2>
    <p className="mt-2 text-sm text-slate-400">Crée ton équipe sans intervention technique. L'identifiant EA reste propre à cette équipe et ne modifie jamais celui de GX NØVA.</p>
   </div>
  </div>
  <form onSubmit={create} className="mt-5 grid gap-3 md:grid-cols-2">
   <label className="text-xs font-semibold text-slate-300">Nom du roster
    <input required minLength={2} maxLength={80} value={name} onChange={e=>setName(e.target.value)}
      placeholder="Ex. ATYOM Academy" className="mt-2 w-full rounded-xl border border-white/15 bg-black/50 p-3 text-sm text-white outline-none focus:border-[#FBD046]/60"/>
   </label>
   <label className="text-xs font-semibold text-slate-300">Identifiant du club EA
    <input required inputMode="numeric" pattern="[1-9][0-9]*" maxLength={20} value={eaId}
      onChange={e=>setEaId(e.target.value)} placeholder="Ex. 123456"
      className="mt-2 w-full rounded-xl border border-white/15 bg-black/50 p-3 text-sm text-white outline-none focus:border-[#FBD046]/60"/>
   </label>
   <label className="text-xs font-semibold text-slate-300">Jeu
    <select value={edition} onChange={e=>setEdition(e.target.value)}
      className="mt-2 w-full rounded-xl border border-white/15 bg-black/50 p-3 text-sm text-white">
      <option value="FC27">FC27</option><option value="FC26">FC26</option>
    </select>
   </label>
   <div className="flex flex-wrap items-end gap-5">
    <label className="flex items-center gap-2 text-xs font-semibold text-slate-300">Couleur principale
      <input type="color" value={primary} onChange={e=>setPrimary(e.target.value)} className="h-10 w-12 cursor-pointer rounded border border-white/20 bg-black"/>
    </label>
    <label className="flex items-center gap-2 text-xs font-semibold text-slate-300">Accent
      <input type="color" value={secondary} onChange={e=>setSecondary(e.target.value)} className="h-10 w-12 cursor-pointer rounded border border-white/20 bg-black"/>
    </label>
   </div>
   {error&&<p role="alert" className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-300 md:col-span-2">{error}</p>}
   <div className="flex flex-wrap items-center justify-between gap-3 md:col-span-2">
    <p className="flex items-center gap-2 text-xs text-slate-500"><ShieldCheck size={15}/> Accès initial : administrateurs / périmètre Structure. Tu pourras ensuite autoriser des membres dans Paramètres.</p>
    <button disabled={busy} type="submit" className="flex items-center gap-2 rounded-xl bg-[#FBD046] px-5 py-3 text-sm font-black text-black disabled:opacity-50">
     {busy?<LoaderCircle size={17} className="animate-spin"/>:<Plus size={17}/>} Créer le roster
    </button>
   </div>
  </form>
  <p className="mt-3 text-xs text-slate-500">Les nouveaux rosters démarrent dans un espace de suivi EA distinct. Les outils avancés GX NØVA restent réservés au roster historique.</p>
 </section>;
}
