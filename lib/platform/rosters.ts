import { createAdminClient } from "@/lib/supabase/admin";
import type { StaffProfile } from "@/lib/auth/require-staff";

export type AtyomRoster = {
  id: string; organisation_id: string; name: string; ea_club_id: string;
  game_edition: string; workspace_mode: "legacy"|"monitoring";
  status: "active"|"archived"; primary_color: string; secondary_color: string;
};
export const ROSTER_SELECT = "id,organisation_id,name,ea_club_id,game_edition,workspace_mode,status,primary_color,secondary_color";
export const rosterOutput = (r:AtyomRoster) => ({
  id:r.id,name:r.name,eaClubId:r.ea_club_id,gameEdition:r.game_edition,
  workspaceMode:r.workspace_mode,status:r.status,primaryColor:r.primary_color,secondaryColor:r.secondary_color,
});
export async function activeRosters(){
  const {data,error}=await createAdminClient().from("atyom_rosters").select(ROSTER_SELECT)
    .eq("organisation_id","atyom-pilot").eq("status","active").order("created_at");
  if(error)throw error;
  return (data??[]) as AtyomRoster[];
}
export async function permittedRosters(profile:StaffProfile){
  const all=await activeRosters();
  return profile.accessScope==="structure"?all:all.filter(r=>profile.allowedRosterIds.includes(r.id));
}
export async function activeRosterById(id:string){
  const {data,error}=await createAdminClient().from("atyom_rosters").select(ROSTER_SELECT)
    .eq("id",id).eq("organisation_id","atyom-pilot").eq("status","active").maybeSingle();
  if(error)throw error;
  return data as AtyomRoster|null;
}
