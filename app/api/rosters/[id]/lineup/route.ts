import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authorizeNewRoster, NO_CACHE, sameOrigin, type RosterCtx } from "@/lib/platform/roster-access";
import { formationByName, ROSTER_FORMATIONS } from "@/lib/platform/roster-formations";
export const dynamic="force-dynamic";
const idOk=(v:unknown):v is string=>typeof v==="string"&&/^[a-f\d-]{36}$/i.test(v);
const fields="formation,assignments,bench,updated_at";
export async function GET(_req:Request,ctx:RosterCtx){
 try{
  const auth=await authorizeNewRoster(ctx);if(auth.error)return auth.error;
  const {data,error}=await createAdminClient().from("atyom_roster_lineups").select(fields).eq("roster_id",auth.roster!.id).maybeSingle();
  if(error)throw error;
  return NextResponse.json({
   formation:data?.formation&&formationByName(data.formation)?data.formation:"4-3-3",
   assignments:data?.assignments??{},bench:data?.bench??[],updatedAt:data?.updated_at??null,
   formations:ROSTER_FORMATIONS.map(f=>f.name),canWrite:auth.profile!.role!=="viewer"
  },{headers:NO_CACHE});
 }catch(e){console.error("Roster lineup GET:",e);return NextResponse.json({error:"Composition indisponible."},{status:500,headers:NO_CACHE});}
}
export async function PUT(req:Request,ctx:RosterCtx){
 if(!sameOrigin(req))return NextResponse.json({error:"Origine interdite."},{status:403,headers:NO_CACHE});
 try{
  const auth=await authorizeNewRoster(ctx,true);if(auth.error)return auth.error;
  const b=await req.json().catch(()=>null);
  const formation=typeof b?.formation==="string"?formationByName(b.formation):null;
  if(!formation||!b.assignments||typeof b.assignments!=="object"||Array.isArray(b.assignments)||
    !Array.isArray(b.bench)||b.bench.length>12)
   return NextResponse.json({error:"Dispositif ou liste de joueurs invalide."},{status:400,headers:NO_CACHE});
  const allowed=new Set(formation.slots.map(s=>s.slot));
  const assignments:Record<string,string>={};
  for(const [slot,value] of Object.entries(b.assignments as Record<string,unknown>)){
   if(!allowed.has(slot)||!idOk(value))return NextResponse.json({error:"Poste ou joueur invalide."},{status:400,headers:NO_CACHE});
   assignments[slot]=value;
  }
  if(b.bench.some((value:unknown)=>!idOk(value)))
   return NextResponse.json({error:"Un remplaçant est invalide."},{status:400,headers:NO_CACHE});
  const ids=[...Object.values(assignments),...(b.bench as string[])];
  if(new Set(ids).size!==ids.length)return NextResponse.json({error:"Un joueur ne peut occuper plusieurs postes."},{status:400,headers:NO_CACHE});
  const admin=createAdminClient();
  if(ids.length){
   const {data,error}=await admin.from("atyom_roster_players").select("id").eq("roster_id",auth.roster!.id)
     .eq("is_active",true).in("id",ids);
   if(error)throw error;
   if(data?.length!==ids.length)return NextResponse.json({error:"Joueur inactif ou affecté à un autre roster."},{status:400,headers:NO_CACHE});
  }
  const {data,error}=await admin.from("atyom_roster_lineups").upsert({
   roster_id:auth.roster!.id,formation:formation.name,assignments,bench:b.bench,
   updated_by:auth.profile!.userId,updated_at:new Date().toISOString()
  },{onConflict:"roster_id"}).select(fields).single();
  if(error)throw error;
  return NextResponse.json({success:true,formation:data.formation,assignments:data.assignments,bench:data.bench,updatedAt:data.updated_at},{headers:NO_CACHE});
 }catch(e){console.error("Roster lineup PUT:",e);return NextResponse.json({error:"Impossible d'enregistrer la composition."},{status:500,headers:NO_CACHE});}
}
