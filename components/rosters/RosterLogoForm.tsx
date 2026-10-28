"use client";
import { useState, type ChangeEvent } from "react";
import { ImagePlus, LoaderCircle, Trash2 } from "lucide-react";

export function RosterLogoForm({id,onChanged}: {id:string;onChanged:()=>void}) {
 const [file,setFile]=useState<File|null>(null);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 async function upload(){
  if(!file)return;
  setLoading(true);setError("");setNotice("");
  try{
   const body=new FormData();body.append("logo",file);
   const response=await fetch("/api/rosters/"+encodeURIComponent(id)+"/logo",{method:"POST",body});
   const result=await response.json();
   if(!response.ok)throw new Error(result.error??"Logo non enregistré.");
   setNotice("Logo enregistré.");setFile(null);onChanged();
  }catch(e){setError(e instanceof Error?e.message:"Logo non enregistré.");}
  finally{setLoading(false);}
 }
 async function remove(){
  if(!window.confirm("Retirer le logo de ce roster ?"))return;
  setLoading(true);setError("");setNotice("");
  try{
   const response=await fetch("/api/rosters/"+encodeURIComponent(id)+"/logo",{method:"DELETE"});
   const result=await response.json();
   if(!response.ok)throw new Error(result.error??"Impossible de retirer le logo.");
   setNotice("Logo retiré.");setFile(null);onChanged();
  }catch(e){setError(e instanceof Error?e.message:"Impossible de retirer le logo.");}
  finally{setLoading(false);}
 }
 function select(e:ChangeEvent<HTMLInputElement>){setFile(e.target.files?.[0]??null);setError("");setNotice("");}
 return <div className="space-y-3 rounded-xl border border-white/10 bg-black/20 p-4">
   <h3 className="flex items-center gap-2 text-sm font-black"><ImagePlus size={17} className="text-[#FBD046]"/> Logo du roster</h3>
   <p className="text-xs text-slate-400">PNG, JPG ou WebP · 5 Mo maximum · visible uniquement pour les membres autorisés.</p>
   <input aria-label="Choisir le logo du roster" type="file" accept="image/png,image/jpeg,image/webp" onChange={select}
    className="block w-full text-xs text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-[#FBD046] file:px-3 file:py-2 file:font-black file:text-black"/>
   <div className="flex flex-wrap gap-2">
    <button type="button" disabled={!file||loading} onClick={()=>void upload()} className="flex items-center gap-2 rounded-lg bg-[#FBD046] px-4 py-2 text-xs font-black text-black disabled:opacity-40">
     {loading?<LoaderCircle size={14} className="animate-spin"/>:<ImagePlus size={14}/>} Enregistrer le logo</button>
    <button type="button" disabled={loading} onClick={()=>void remove()} className="flex items-center gap-2 rounded-lg border border-rose-400/30 px-3 py-2 text-xs font-semibold text-rose-200 disabled:opacity-40"><Trash2 size={14}/> Retirer</button>
   </div>
   {error&&<p role="alert" className="text-xs text-rose-300">{error}</p>}
   {notice&&<p role="status" className="text-xs text-emerald-300">{notice}</p>}
  </div>;
}
