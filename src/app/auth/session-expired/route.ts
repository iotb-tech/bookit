import { NextResponse, type NextRequest } from "next/server";

import { SESSION_ACTIVITY_COOKIE } from "@/lib/auth/sessionPolicy";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    // Continue to the login page even if the session was already unavailable.
  }

  const url = new URL("/login", request.url);
  url.searchParams.set("expired", "1");

  const reason = request.nextUrl.searchParams.get("reason");
  const redirectTo = request.nextUrl.searchParams.get("redirectTo");
  const mode = request.nextUrl.searchParams.get("mode");

  if (reason === "absolute" || reason === "inactive") {
    url.searchParams.set("reason", reason);
  }

  if (redirectTo?.startsWith("/")) {
    url.searchParams.set("redirectTo", redirectTo);
  }

  if (mode === "mentor") {
    url.searchParams.set("mode", "mentor");
  }

  const response = NextResponse.redirect(url);
  response.cookies.delete(SESSION_ACTIVITY_COOKIE);

  return response;
}
