import { NextResponse } from "next/server";
import { requireActiveStaff } from "@/lib/auth/require-staff";
import { LEGACY_WORKSPACE } from "@/lib/platform/workspace";
import { permittedRosters } from "@/lib/platform/rosters";

/**
 * Contexte utilisateur (phase pilote).
 * Auth obligatoire ; ce point d'entrée évoluera vers une résolution de
 * membership en base par auth.uid(), avec vérification pour chaque requête.
 * Il ne permet jamais de changer de clubId via un paramètre utilisateur.
 */
export async function GET() {
  const { error, profile } = await requireActiveStaff({profileOnly:true});
  if (error) return error;

  const allowed = await permittedRosters(profile!);
  const available = allowed.map(r => ({id:r.id,organisationId:"atyom-pilot",name:r.name,
    game:"ea-fc" as const,gameEdition:r.game_edition,eaClubId:r.ea_club_id,status:"active" as const}));
  return NextResponse.json({
    workspace: { ...LEGACY_WORKSPACE, rosters: available,
      activeRosterId: available.find(r => r.id === LEGACY_WORKSPACE.activeRosterId)?.id ?? available[0]?.id ?? "" },
    membership: {
      role: profile!.role,
      displayName: profile!.displayName,
      accessScope: profile!.accessScope,
      allowedRosterIds: profile!.allowedRosterIds,
    },
    actions: {
      createOrganisation: false,
      createRoster: profile!.role === "admin" && profile!.accessScope === "structure",
      switchRoster: false,
    },
  }, { headers: { "Cache-Control": "private, no-store" } });
}
