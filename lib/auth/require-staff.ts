import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { LEGACY_WORKSPACE } from "@/lib/platform/workspace";

export type StaffRole = "admin" | "staff" | "viewer";
export type StaffAccessScope = "structure" | "rosters";

export type StaffProfile = {
  userId: string;
  displayName: string;
  role: StaffRole;
  accessScope: StaffAccessScope;
  allowedRosterIds: string[];
};

export async function requireActiveStaff(options?: { write?: boolean; requireStructure?: boolean; rosterId?: string }) {
  const supabase = await createClient();

  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();

  const userId =
    !claimsError && typeof claimsData?.claims?.sub === "string"
      ? claimsData.claims.sub
      : null;

  if (!userId) {
    return {
      error: NextResponse.json(
        { error: "Non authentifié." },
        { status: 401 }
      ),
      profile: null,
    };
  }

  const { data: profile, error: profileError } =
    await supabase
      .from("staff_profiles")
      .select("display_name, role, is_active, access_scope, allowed_roster_ids")
      .eq("user_id", userId)
      .maybeSingle();

  if (
    profileError ||
    !profile ||
    profile.is_active !== true ||
    !["admin", "staff", "viewer"].includes(profile.role)
  ) {
    return {
      error: NextResponse.json(
        { error: "Compte staff non autorisé." },
        { status: 403 }
      ),
      profile: null,
    };
  }

  // Vérifier le périmètre à chaque requête, sans accepter d’ID client comme preuve d’accès.
  const accessScope = profile.access_scope === "structure" ? "structure" : "rosters";
  const allowedRosterIds = Array.isArray(profile.allowed_roster_ids) ? profile.allowed_roster_ids.filter((id: unknown): id is string => typeof id === "string") : [];
  const needsRosterId = options?.rosterId ?? LEGACY_WORKSPACE.activeRosterId;
  if ((profile.role === "admin" && accessScope !== "structure") ||
      (options?.requireStructure && accessScope !== "structure") ||
      (!options?.requireStructure && accessScope !== "structure" && !allowedRosterIds.includes(needsRosterId))) {
    return { error: NextResponse.json({ error: "Vous n’avez pas accès à ce roster ou à cet espace de la structure." }, { status: 403 }), profile: null };
  }

  if (options?.write && profile.role === "viewer") {
    return {
      error: NextResponse.json(
        {
          error:
            "Le rôle Viewer est en lecture seule. Cette action nécessite un rôle Admin ou Staff.",
        },
        { status: 403 }
      ),
      profile: null,
    };
  }

  return {
    error: null,
    profile: {
      userId,
      displayName: profile.display_name,
      role: profile.role as StaffRole,
      accessScope,
      allowedRosterIds,
    } satisfies StaffProfile,
  };
}
