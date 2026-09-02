import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function safeNext(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }
  return value;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const mode = requestUrl.searchParams.get("mode") === "mentor" ? "mentor" : "mentee";
  const requestedNext = safeNext(requestUrl.searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (mode === "mentor") {
        if (!user) {
          return NextResponse.redirect(
            new URL("/login?mode=mentor&error=auth_callback_failed", requestUrl.origin)
          );
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

        if (profile?.role !== "mentor") {
          await supabase.auth.signOut();
          return NextResponse.redirect(
            new URL("/login?mode=mentor&error=mentor_required", requestUrl.origin)
          );
        }

        return NextResponse.redirect(
          new URL("/mentor/dashboard", requestUrl.origin)
        );
      }

      const next = requestedNext.startsWith("/mentor")
        ? "/dashboard"
        : requestedNext;
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }
  }

  const loginUrl = new URL("/login", requestUrl.origin);
  if (mode === "mentor") loginUrl.searchParams.set("mode", "mentor");
  loginUrl.searchParams.set("error", "auth_callback_failed");
  return NextResponse.redirect(loginUrl);
}
