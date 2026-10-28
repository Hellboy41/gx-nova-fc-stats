import { NextResponse } from "next/server";
import { requireActiveStaff } from "@/lib/auth/require-staff";
import { createAdminClient } from "@/lib/supabase/admin";
import { activeRosterById,rosterWithLogo } from "@/lib/platform/rosters";
export const dynamic="force-dynamic";
const NO_CACHE={"Cache-Control":"private, no-store"};
type RouteContext={params:Promise<{id:string}>};
async function authorize(ctx:RouteContext,write=false){
 const {id}=await ctx.params;
 if(!/^(gx-nova-legacy|roster-[a-f0-9]{32})$/.test(id))return {error:NextResponse.json({error:"Roster introuvable."},{status:404,headers:NO_CACHE}),roster:null};
 const auth=await requireActiveStaff({rosterId:id,write});
 if(auth.error)return {error:auth.error,roster:null};
 const roster=await activeRosterById(id);
 if(!roster)return {error:NextResponse.json({error:"Roster inactif ou introuvable."},{status:404,headers:NO_CACHE}),roster:null};
 return {error:null,roster};
}
export async function GET(_request:Request,ctx:RouteContext){
 try{
  const access=await authorize(ctx);
  if(access.error)return access.error;
  const r=access.roster!,admin=createAdminClient();
  const matchSource=r.workspace_mode==="legacy"?"matches":"atyom_roster_results";
  const q=admin.from(matchSource).select("ea_match_id,played_at,opponent_name,goals_for,goals_against,result")
    .eq(r.workspace_mode==="legacy"?"club_id":"roster_id",r.workspace_mode==="legacy"?r.ea_club_id:r.id)
    .order("played_at",{ascending:false}).limit(50);
  const {data,error}=await q;
  if(error)throw error;
  const {count:stored}=await admin.from(matchSource).select("ea_match_id",{head:true,count:"exact"})
    .eq(r.workspace_mode==="legacy"?"club_id":"roster_id",r.workspace_mode==="legacy"?r.ea_club_id:r.id);
  const matches=(data??[]).map(m=>({matchId:m.ea_match_id,playedAt:m.played_at,opponent:m.opponent_name,
   goalsFor:m.goals_for,goalsAgainst:m.goals_against,result:m.result}));
  const totals=matches.reduce((a,m)=>{a.played++;if(m.result==="V")a.wins++;if(m.result==="N")a.draws++;if(m.result==="D")a.losses++;return a;},{played:0,wins:0,draws:0,losses:0});
  return NextResponse.json({roster:await rosterWithLogo(r),matches,storedCount:stored??0,shownCount:matches.length,form:matches.slice(0,5).map(m=>m.result),totals,
   note:r.workspace_mode==="legacy"?"Historique GX NØVA (base historique).":"Historique indépendant : derniers matchs EA synchronisés, sans correction tactique des matchs."},{headers:NO_CACHE});
 }catch(e){console.error("Roster results:",e);return NextResponse.json({error:"Résultats indisponibles."},{status:500,headers:NO_CACHE});}
}
export async function POST(request:Request,ctx:RouteContext){
 const origin=request.headers.get("origin");
 if(origin&&origin!==new URL(request.url).origin)return NextResponse.json({error:"Origine interdite."},{status:403,headers:NO_CACHE});
 let access:Awaited<ReturnType<typeof authorize>>;
 try{access=await authorize(ctx,true);}catch{return NextResponse.json({error:"Roster indisponible."},{status:500,headers:NO_CACHE});}
 if(access.error)return access.error;
 const roster=access.roster!;
 if(roster.workspace_mode==="legacy")
  return NextResponse.json({error:"Utilise la synchronisation historique de GX NØVA."},{status:400,headers:NO_CACHE});
 try{
  const url="https://proclubs.ea.com/api/fc/clubs/matches?"+new URLSearchParams({
   platform:"common-gen5",clubIds:roster.ea_club_id,matchType:"friendlyMatch",maxResultCount:"50"
  });
  const response=await fetch(url,{cache:"no-store",signal:AbortSignal.timeout(12000),headers:{
   Accept:"application/json, text/plain, */*",
   "User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/154 Safari/537.36",
   Referer:"https://www.ea.com/",Origin:"https://www.ea.com"
  }});
  if(!response.ok)return NextResponse.json({error:"EA ne répond pas pour cet identifiant (HTTP "+response.status+")."},{status:502,headers:NO_CACHE});
  const raw:unknown=await response.json();
  if(!Array.isArray(raw))return NextResponse.json({error:"Format EA inattendu."},{status:502,headers:NO_CACHE});
  const rows=new Map<string,{roster_id:string;ea_match_id:string;played_at:string;opponent_name:string;goals_for:number;goals_against:number;result:string;imported_at:string}>();
  for(const unknownMatch of raw.slice(0,50)){
   if(!unknownMatch||typeof unknownMatch!=="object"||Array.isArray(unknownMatch))continue;
   const match=unknownMatch as Record<string,unknown>;
   if(!match.clubs||typeof match.clubs!=="object"||Array.isArray(match.clubs))continue;
   const clubs=match.clubs as Record<string,{goals?:number|string;goalsAgainst?:number|string;details?:{name?:string}}>;
   const team=clubs[roster.ea_club_id];
   if(!team)continue;
   const matchId=String(match.matchId??"");
   const timestamp=Number(match.timestamp);
   const scoreFor=Number(team.goals??NaN),scoreAgainst=Number(team.goalsAgainst??NaN);
   if(!/^[a-zA-Z0-9_-]{1,80}$/.test(matchId)||!Number.isFinite(timestamp)||timestamp<1500000000||
     timestamp>Date.now()/1000+120||!Number.isInteger(scoreFor)||!Number.isInteger(scoreAgainst)||
     scoreFor<0||scoreAgainst<0||scoreFor>99||scoreAgainst>99)continue;
   const opponent=Object.entries(clubs).find(([id])=>id!==roster.ea_club_id)?.[1];
   const name=typeof opponent?.details?.name==="string"?opponent.details.name.trim().slice(0,120):"Adversaire inconnu";
   rows.set(matchId,{roster_id:roster.id,ea_match_id:matchId,played_at:new Date(timestamp*1000).toISOString(),
    opponent_name:name||"Adversaire inconnu",goals_for:scoreFor,goals_against:scoreAgainst,
    result:scoreFor>scoreAgainst?"V":scoreFor<scoreAgainst?"D":"N",imported_at:new Date().toISOString()});
  }
  if(rows.size){
   const {error}=await createAdminClient().from("atyom_roster_results").upsert(Array.from(rows.values()),{onConflict:"roster_id,ea_match_id"});
   if(error)throw error;
  }
  return NextResponse.json({success:true,imported:rows.size,roster:roster.name},{headers:NO_CACHE});
 }catch(e){console.error("EA roster sync:",e);return NextResponse.json({error:"Synchronisation EA impossible. Vérifie l'identifiant ou réessaie ultérieurement."},{status:502,headers:NO_CACHE});}
}
