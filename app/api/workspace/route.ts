import { NextResponse } from "next/server";
import { requireActiveStaff } from "@/lib/auth/require-staff";
import { LEGACY_WORKSPACE } from "@/lib/platform/workspace";

/**
 * Contexte utilisateur (phase pilote).
 * Auth obligatoire ; ce point d'entrée évoluera vers une résolution de
 * membership en base par auth.uid(), avec vérification pour chaque requête.
 * Il ne permet jamais de changer de clubId via un paramètre utilisateur.
 */
export async function GET() {
  const { error, profile } = await requireActiveStaff();
  if (error) return error;

  const available = profile!.accessScope === "structure"
    ? LEGACY_WORKSPACE.rosters
    : LEGACY_WORKSPACE.rosters.filter(roster => profile!.allowedRosterIds.includes(roster.id));
  return NextResponse.json({
    workspace: { ...LEGACY_WORKSPACE, rosters: available },
    membership: {
      role: profile!.role,
      displayName: profile!.displayName,
      accessScope: profile!.accessScope,
      allowedRosterIds: profile!.allowedRosterIds,
    },
    actions: {
      createOrganisation: false,
      createRoster: false,
      switchRoster: false,
    },
  }, { headers: { "Cache-Control": "private, no-store" } });
}
