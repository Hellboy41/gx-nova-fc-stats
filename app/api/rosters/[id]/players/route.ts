import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authorizeNewRoster, NO_CACHE, sameOrigin, type RosterCtx } from "@/lib/platform/roster-access";
export const dynamic="force-dynamic";
const selected="id,display_name,shirt_number,preferred_position,is_active";
const positions=new Set(["GK","DG","DD","DC","MDC","MC","MG","MD","MOC","ATG","ATD","BU","POLY","DCG","DCD","MCG","MCD","MDD","MDG"]);
const validName=(v:unknown):v is string=>typeof v==="string"&&v.trim().length>=2&&v.trim().length<=40;
const validNumber=(v:unknown)=>v===null||Number.isInteger(v)&&Number(v)>=1&&Number(v)<=99;
export async function GET(_req:Request,ctx:RosterCtx){
 try{
  const auth=await authorizeNewRoster(ctx);if(auth.error)return auth.error;
  const {data,error}=await createAdminClient().from("atyom_roster_players").select(selected)
    .eq("roster_id",auth.roster!.id).order("is_active",{ascending:false}).order("display_name");
  if(error)throw error;
  return NextResponse.json({players:data??[],canWrite:auth.profile!.role!=="viewer"},{headers:NO_CACHE});
 }catch(e){console.error("Roster players GET:",e);return NextResponse.json({error:"Effectif indisponible."},{status:500,headers:NO_CACHE});}
}
export async function POST(req:Request,ctx:RosterCtx){
 if(!sameOrigin(req))return NextResponse.json({error:"Origine interdite."},{status:403,headers:NO_CACHE});
 try{
  const auth=await authorizeNewRoster(ctx,true);if(auth.error)return auth.error;
  const b=await req.json().catch(()=>null);
  if(!b||!validName(b.name)||!validNumber(b.number)||typeof b.position!=="string"||!positions.has(b.position))
   return NextResponse.json({error:"Pseudo, numéro (facultatif) ou position invalide."},{status:400,headers:NO_CACHE});
  const {data,error}=await createAdminClient().from("atyom_roster_players").insert({
   roster_id:auth.roster!.id,display_name:b.name.trim(),shirt_number:b.number,preferred_position:b.position,
   is_active:true,created_by:auth.profile!.userId
  }).select(selected).single();
  if(error)return NextResponse.json({error:error.code==="23505"?"Ce joueur existe déjà.":"Impossible d'ajouter le joueur."},{status:error.code==="23505"?409:500,headers:NO_CACHE});
  return NextResponse.json({player:data},{status:201,headers:NO_CACHE});
 }catch(e){console.error("Roster players POST:",e);return NextResponse.json({error:"Impossible d'ajouter le joueur."},{status:500,headers:NO_CACHE});}
}
export async function PATCH(req:Request,ctx:RosterCtx){
 if(!sameOrigin(req))return NextResponse.json({error:"Origine interdite."},{status:403,headers:NO_CACHE});
 try{
  const auth=await authorizeNewRoster(ctx,true);if(auth.error)return auth.error;
  const b=await req.json().catch(()=>null);
  if(!b||typeof b.playerId!=="string"||!/^[a-f\d-]{36}$/i.test(b.playerId)||!validName(b.name)||
   !validNumber(b.number)||typeof b.position!=="string"||!positions.has(b.position)||typeof b.isActive!=="boolean")
   return NextResponse.json({error:"Modification invalide."},{status:400,headers:NO_CACHE});
  const {data,error}=await createAdminClient().from("atyom_roster_players").update({
   display_name:b.name.trim(),shirt_number:b.number,preferred_position:b.position,is_active:b.isActive,
   updated_at:new Date().toISOString()
  }).eq("id",b.playerId).eq("roster_id",auth.roster!.id).select(selected).maybeSingle();
  if(error||!data)return NextResponse.json({error:error?.code==="23505"?"Pseudo déjà utilisé.":"Joueur introuvable ou modification impossible."},{status:error?400:404,headers:NO_CACHE});
  return NextResponse.json({player:data},{headers:NO_CACHE});
 }catch(e){console.error("Roster players PATCH:",e);return NextResponse.json({error:"Impossible de modifier le joueur."},{status:500,headers:NO_CACHE});}
}
