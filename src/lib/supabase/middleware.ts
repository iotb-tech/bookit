import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import {
  ABSOLUTE_SESSION_LIFETIME_MS,
  INACTIVITY_TIMEOUT_MS,
  SESSION_ACTIVITY_COOKIE,
  SESSION_ACTIVITY_COOKIE_MAX_AGE_SECONDS,
  type SessionExpiryReason,
} from "../auth/sessionPolicy";
import { env } from "../env";

const PUBLIC_EXACT_PATHS = ["/", "/login", "/signup"];
const PUBLIC_PREFIXES = ["/auth"];

function isPublicPath(pathname: string) {
  return (
    PUBLIC_EXACT_PATHS.includes(pathname) ||
    PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  );
}

function setActivityCookie(response: NextResponse, timestamp: number) {
  response.cookies.set(SESSION_ACTIVITY_COOKIE, String(timestamp), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_ACTIVITY_COOKIE_MAX_AGE_SECONDS,
  });
}

function expiredRedirect(
  request: NextRequest,
  reason: SessionExpiryReason
) {
  const url = request.nextUrl.clone();
  const { pathname, search } = request.nextUrl;
  const isMentorPath = pathname === "/mentor" || pathname.startsWith("/mentor/");

  url.pathname = "/auth/session-expired";
  url.search = "";
  url.searchParams.set("reason", reason);
  url.searchParams.set("redirectTo", `${pathname}${search}`);

  if (isMentorPath) {
    url.searchParams.set("mode", "mentor");
  }

  return NextResponse.redirect(url);
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublic = isPublicPath(pathname);
  const isActivityRoute = pathname === "/auth/activity";
  const isMentorPath = pathname === "/mentor" || pathname.startsWith("/mentor/");

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("redirectTo", `${pathname}${request.nextUrl.search}`);
    if (isMentorPath) url.searchParams.set("mode", "mentor");
    return NextResponse.redirect(url);
  }

  // Enforce the security policy on protected pages and the authenticated
  // activity endpoint. Login, signup, landing and session-expired routes
  // must remain usable after a session has expired.
  if (user && (!isPublic || isActivityRoute)) {
    const now = Date.now();
    const signedInAt = user.last_sign_in_at
      ? new Date(user.last_sign_in_at).getTime()
      : Number.NaN;

    if (
      !Number.isNaN(signedInAt) &&
      now - signedInAt >= ABSOLUTE_SESSION_LIFETIME_MS
    ) {
      return expiredRedirect(request, "absolute");
    }

    const rawLastActivity = request.cookies.get(SESSION_ACTIVITY_COOKIE)?.value;
    const parsedLastActivity = rawLastActivity
      ? Number(rawLastActivity)
      : Number.NaN;

    const hasValidActivity =
      Number.isFinite(parsedLastActivity) &&
      parsedLastActivity <= now + 60_000 &&
      (Number.isNaN(signedInAt) || parsedLastActivity >= signedInAt);

    if (hasValidActivity) {
      if (now - parsedLastActivity >= INACTIVITY_TIMEOUT_MS) {
        return expiredRedirect(request, "inactive");
      }
    } else if (!Number.isNaN(signedInAt)) {
      if (now - signedInAt >= INACTIVITY_TIMEOUT_MS) {
        return expiredRedirect(request, "inactive");
      }

      setActivityCookie(response, now);
    } else {
      setActivityCookie(response, now);
    }
  }

  let role: "mentee" | "mentor" = "mentee";

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    role = profile?.role === "mentor" ? "mentor" : "mentee";
  }

  if (user && isMentorPath && role !== "mentor") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (user && (pathname === "/login" || pathname === "/signup")) {
    const requestedMentorMode = request.nextUrl.searchParams.get("mode") === "mentor";
    const url = request.nextUrl.clone();
    url.pathname =
      requestedMentorMode && role === "mentor"
        ? "/mentor/dashboard"
        : "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
