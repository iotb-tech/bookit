import { NextResponse } from "next/server";

import {
  SESSION_ACTIVITY_COOKIE,
  SESSION_ACTIVITY_COOKIE_MAX_AGE_SECONDS,
} from "@/lib/auth/sessionPolicy";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { success: false, error: "AUTH_REQUIRED" },
      { status: 401 }
    );
  }

  const response = NextResponse.json({ success: true });

  response.cookies.set(SESSION_ACTIVITY_COOKIE, String(Date.now()), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_ACTIVITY_COOKIE_MAX_AGE_SECONDS,
  });

  return response;
}
