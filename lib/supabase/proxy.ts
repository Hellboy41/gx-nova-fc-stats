import { createServerClient } from "@supabase/ssr";
import {
  NextResponse,
  type NextRequest,
} from "next/server";

function unauthorizedResponse(
  request: NextRequest,
  status: 401 | 403,
  message: string
) {
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json(
      {
        error: message,
      },
      {
        status,
      }
    );
  }

  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set(
    "reason",
    status === 401 ? "login" : "forbidden"
  );

  return NextResponse.redirect(url);
}

export async function updateSession(
  request: NextRequest
) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePublishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabasePublishableKey) {
    return NextResponse.json(
      {
        error:
          "Configuration Supabase incomplète côté serveur.",
      },
      {
        status: 500,
      }
    );
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabasePublishableKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          supabaseResponse = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(
            ({ name, value, options }) => {
              supabaseResponse.cookies.set(
                name,
                value,
                options
              );
            }
          );

          Object.entries(headers).forEach(
            ([key, value]) => {
              supabaseResponse.headers.set(key, value);
            }
          );
        },
      },
    }
  );

  // Important : ne rien placer entre la création du client
  // et getClaims(), afin de laisser Supabase gérer correctement
  // le rafraîchissement de la session.
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();

  const claims = claimsError
    ? null
    : claimsData?.claims;

  const pathname = request.nextUrl.pathname;

  const isPublicPath =
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth");

  if (!claims) {
    if (isPublicPath) {
      return supabaseResponse;
    }

    return unauthorizedResponse(
      request,
      401,
      "Connexion requise."
    );
  }

  if (isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  const userId = String(claims.sub ?? "");

  if (!userId) {
    return unauthorizedResponse(
      request,
      401,
      "Session invalide."
    );
  }

  const { data: staffProfile, error: staffError } =
    await supabase
      .from("staff_profiles")
      .select("user_id, display_name, role, is_active")
      .eq("user_id", userId)
      .maybeSingle();

  if (
    staffError ||
    !staffProfile ||
    staffProfile.is_active !== true
  ) {
    return unauthorizedResponse(
      request,
      403,
      "Ce compte n'est pas autorisé à accéder au dashboard GX NOVA."
    );
  }

  const isApiMutation =
    pathname.startsWith("/api/") &&
    ["POST", "PUT", "PATCH", "DELETE"].includes(
      request.method.toUpperCase()
    );

  const isViewerMutation =
    staffProfile.role === "viewer" &&
    isApiMutation &&
    pathname !== "/api/logout";

  if (isViewerMutation) {
    return NextResponse.json(
      {
        error:
          "Le rôle Viewer est en lecture seule. Cette action nécessite un rôle Admin ou Staff.",
      },
      {
        status: 403,
      }
    );
  }

  return supabaseResponse;
}
