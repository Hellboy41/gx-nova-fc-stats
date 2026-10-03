import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export type StaffRole = "admin" | "staff" | "viewer";

export type StaffProfile = {
  userId: string;
  displayName: string;
  role: StaffRole;
};

export async function requireActiveStaff(options?: {
  write?: boolean;
}) {
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
      .select("display_name, role, is_active")
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
    } satisfies StaffProfile,
  };
}
