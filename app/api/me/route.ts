import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();

  const claims = claimsError
    ? null
    : claimsData?.claims;

  if (!claims?.sub) {
    return NextResponse.json(
      {
        error: "Non authentifié.",
      },
      {
        status: 401,
      }
    );
  }

  const { data: profile, error: profileError } =
    await supabase
      .from("staff_profiles")
      .select("display_name, role, is_active")
      .eq("user_id", String(claims.sub))
      .maybeSingle();

  if (
    profileError ||
    !profile ||
    profile.is_active !== true
  ) {
    return NextResponse.json(
      {
        error: "Compte staff non autorisé.",
      },
      {
        status: 403,
      }
    );
  }

  return NextResponse.json({
    user: {
      id: String(claims.sub),
      email:
        typeof claims.email === "string"
          ? claims.email
          : null,
      displayName: profile.display_name,
      role: profile.role,
    },
  });
}
