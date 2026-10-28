import { NextResponse } from "next/server";
import { requireActiveStaff } from "@/lib/auth/require-staff";
import { activeRosterById } from "@/lib/platform/rosters";
export const NO_CACHE={"Cache-Control":"private, no-store"};
export type RosterCtx={params:Promise<{id:string}>};
export async function authorizeNewRoster(ctx:RosterCtx,write=false){
 const {id}=await ctx.params;
 if(!/^roster-[a-f0-9]{32}$/.test(id))return {error:NextResponse.json({error:"Roster introuvable."},{status:404,headers:NO_CACHE}),roster:null,profile:null};
 const auth=await requireActiveStaff({rosterId:id,write});
 if(auth.error)return {error:auth.error,roster:null,profile:null};
 const roster=await activeRosterById(id);
 if(!roster||roster.workspace_mode!=="monitoring")return {error:NextResponse.json({error:"Roster archivé ou introuvable."},{status:404,headers:NO_CACHE}),roster:null,profile:null};
 return {error:null,roster,profile:auth.profile};
}
export const sameOrigin=(req:Request)=>!req.headers.get("origin")||req.headers.get("origin")===new URL(req.url).origin;
