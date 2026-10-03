import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type StaffRole = "admin" | "staff" | "viewer";

const ALLOWED_ROLES: StaffRole[] = [
  "admin",
  "staff",
  "viewer",
];

async function requireAdmin() {
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
        {
          error: "Non authentifié.",
        },
        {
          status: 401,
        }
      ),
      userId: null,
    };
  }

  const { data: profile, error: profileError } =
    await supabase
      .from("staff_profiles")
      .select("user_id, display_name, role, is_active")
      .eq("user_id", userId)
      .maybeSingle();

  if (
    profileError ||
    !profile ||
    profile.is_active !== true ||
    profile.role !== "admin"
  ) {
    return {
      error: NextResponse.json(
        {
          error:
            "Cette action est réservée aux administrateurs GX NOVA.",
        },
        {
          status: 403,
        }
      ),
      userId: null,
    };
  }

  return {
    error: null,
    userId,
  };
}

function validRole(value: unknown): value is StaffRole {
  return (
    typeof value === "string" &&
    ALLOWED_ROLES.includes(value as StaffRole)
  );
}

export async function GET() {
  const authorization = await requireAdmin();

  if (authorization.error) {
    return authorization.error;
  }

  const admin = createAdminClient();

  const { data: profiles, error: profilesError } =
    await admin
      .from("staff_profiles")
      .select(
        "user_id, display_name, role, is_active, created_at, updated_at"
      )
      .order("created_at", {
        ascending: true,
      });

  if (profilesError) {
    return NextResponse.json(
      {
        error:
          "Impossible de récupérer les profils staff.",
        details: profilesError.message,
      },
      {
        status: 500,
      }
    );
  }

  const { data: authData, error: authError } =
    await admin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

  if (authError) {
    return NextResponse.json(
      {
        error:
          "Impossible de récupérer les utilisateurs Supabase.",
        details: authError.message,
      },
      {
        status: 500,
      }
    );
  }

  const usersById = new Map(
    authData.users.map((user) => [
      user.id,
      user,
    ])
  );

  const profileIds = new Set(
    (profiles ?? []).map(
      (profile) => profile.user_id
    )
  );

  const staff = (profiles ?? []).map(
    (profile) => {
      const user = usersById.get(
        profile.user_id
      );

      return {
        userId: profile.user_id,
        email: user?.email ?? null,
        displayName: profile.display_name,
        role: profile.role,
        isActive: profile.is_active,
        createdAt: profile.created_at,
        lastSignInAt:
          user?.last_sign_in_at ?? null,
      };
    }
  );

  const availableUsers = authData.users
    .filter((user) => !profileIds.has(user.id))
    .map((user) => ({
      userId: user.id,
      email: user.email ?? null,
    }))
    .sort((a, b) =>
      (a.email ?? "").localeCompare(
        b.email ?? "",
        "fr"
      )
    );

  return NextResponse.json({
    staff,
    availableUsers,
  });
}

export async function POST(request: Request) {
  const authorization = await requireAdmin();

  if (authorization.error) {
    return authorization.error;
  }

  const body = await request.json().catch(() => ({}));

  const userId =
    typeof body.userId === "string"
      ? body.userId.trim()
      : "";

  const displayName =
    typeof body.displayName === "string"
      ? body.displayName.trim()
      : "";

  const role = body.role;

  if (!userId) {
    return NextResponse.json(
      {
        error:
          "L'utilisateur Supabase est obligatoire.",
      },
      {
        status: 400,
      }
    );
  }

  if (!validRole(role)) {
    return NextResponse.json(
      {
        error: "Rôle invalide.",
      },
      {
        status: 400,
      }
    );
  }

  const admin = createAdminClient();

  const { data: authUserData, error: authUserError } =
    await admin.auth.admin.getUserById(userId);

  if (
    authUserError ||
    !authUserData.user
  ) {
    return NextResponse.json(
      {
        error:
          "Cet utilisateur n'existe pas dans Supabase Authentication.",
      },
      {
        status: 404,
      }
    );
  }

  const fallbackName =
    authUserData.user.email
      ?.split("@")[0]
      .replace(/[._-]+/g, " ") ??
    "Membre GX NOVA";

  const { data: profile, error: upsertError } =
    await admin
      .from("staff_profiles")
      .upsert(
        {
          user_id: userId,
          display_name:
            displayName || fallbackName,
          role,
          is_active: true,
          updated_at:
            new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        }
      )
      .select(
        "user_id, display_name, role, is_active"
      )
      .single();

  if (upsertError) {
    return NextResponse.json(
      {
        error:
          "Impossible d'autoriser ce membre.",
        details: upsertError.message,
      },
      {
        status: 500,
      }
    );
  }

  return NextResponse.json({
    success: true,
    profile,
  });
}

export async function PATCH(request: Request) {
  const authorization = await requireAdmin();

  if (authorization.error) {
    return authorization.error;
  }

  const currentUserId = authorization.userId!;
  const body = await request.json().catch(() => ({}));

  const userId =
    typeof body.userId === "string"
      ? body.userId.trim()
      : "";

  const displayName =
    typeof body.displayName === "string"
      ? body.displayName.trim()
      : "";

  const role = body.role;
  const isActive = body.isActive;

  if (!userId) {
    return NextResponse.json(
      {
        error: "Utilisateur manquant.",
      },
      {
        status: 400,
      }
    );
  }

  if (!displayName) {
    return NextResponse.json(
      {
        error:
          "Le nom affiché ne peut pas être vide.",
      },
      {
        status: 400,
      }
    );
  }

  if (!validRole(role)) {
    return NextResponse.json(
      {
        error: "Rôle invalide.",
      },
      {
        status: 400,
      }
    );
  }

  if (typeof isActive !== "boolean") {
    return NextResponse.json(
      {
        error: "État du compte invalide.",
      },
      {
        status: 400,
      }
    );
  }

  const admin = createAdminClient();

  const { data: existing, error: existingError } =
    await admin
      .from("staff_profiles")
      .select("user_id, role, is_active")
      .eq("user_id", userId)
      .maybeSingle();

  if (existingError || !existing) {
    return NextResponse.json(
      {
        error:
          "Profil staff introuvable.",
      },
      {
        status: 404,
      }
    );
  }

  if (userId === currentUserId) {
    if (role !== "admin") {
      return NextResponse.json(
        {
          error:
            "Vous ne pouvez pas retirer votre propre rôle administrateur.",
        },
        {
          status: 400,
        }
      );
    }

    if (!isActive) {
      return NextResponse.json(
        {
          error:
            "Vous ne pouvez pas désactiver votre propre compte.",
        },
        {
          status: 400,
        }
      );
    }
  }

  const removesAdminAccess =
    existing.role === "admin" &&
    existing.is_active === true &&
    (role !== "admin" || !isActive);

  if (removesAdminAccess) {
    const { count, error: countError } =
      await admin
        .from("staff_profiles")
        .select("user_id", {
          count: "exact",
          head: true,
        })
        .eq("role", "admin")
        .eq("is_active", true);

    if (countError) {
      return NextResponse.json(
        {
          error:
            "Impossible de vérifier les administrateurs actifs.",
        },
        {
          status: 500,
        }
      );
    }

    if ((count ?? 0) <= 1) {
      return NextResponse.json(
        {
          error:
            "Il doit rester au moins un administrateur actif.",
        },
        {
          status: 400,
        }
      );
    }
  }

  const { data: updated, error: updateError } =
    await admin
      .from("staff_profiles")
      .update({
        display_name: displayName,
        role,
        is_active: isActive,
        updated_at:
          new Date().toISOString(),
      })
      .eq("user_id", userId)
      .select(
        "user_id, display_name, role, is_active"
      )
      .single();

  if (updateError) {
    return NextResponse.json(
      {
        error:
          "Impossible de mettre à jour ce membre.",
        details: updateError.message,
      },
      {
        status: 500,
      }
    );
  }

  return NextResponse.json({
    success: true,
    profile: updated,
  });
}
