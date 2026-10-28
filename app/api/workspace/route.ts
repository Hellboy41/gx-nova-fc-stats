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

  return NextResponse.json({
    workspace: LEGACY_WORKSPACE,
    membership: {
      role: profile!.role,
      displayName: profile!.displayName,
    },
    actions: {
      createOrganisation: false,
      createRoster: false,
      switchRoster: false,
    },
  }, { headers: { "Cache-Control": "private, no-store" } });
}
