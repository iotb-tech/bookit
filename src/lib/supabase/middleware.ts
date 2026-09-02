import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { env } from "../env";

const PUBLIC_EXACT_PATHS = ["/", "/login", "/signup"];
const PUBLIC_PREFIXES = ["/auth"];

function isPublicPath(pathname: string) {
  return (
    PUBLIC_EXACT_PATHS.includes(pathname) ||
    PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  );
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
  const isMentorPath = pathname === "/mentor" || pathname.startsWith("/mentor/");

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("redirectTo", `${pathname}${request.nextUrl.search}`);
    if (isMentorPath) url.searchParams.set("mode", "mentor");
    return NextResponse.redirect(url);
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
    url.pathname = requestedMentorMode && role === "mentor"
      ? "/mentor/dashboard"
      : "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
