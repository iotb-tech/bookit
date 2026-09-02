"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { LoginMode } from "@/lib/auth/actions";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
      <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.24-.2-1.79H12v3.4h5.52a4.75 4.75 0 0 1-2.05 3.03l-.02.11 2.98 2.31.21.02c1.94-1.79 3.06-4.43 3.06-7.08Z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.96-.89 6.61-2.42l-3.15-2.44c-.84.57-1.96.97-3.46.97-2.6 0-4.81-1.76-5.6-4.19l-.11.01-3.1 2.4-.04.1A9.99 9.99 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.4 13.92A6.01 6.01 0 0 1 6.08 12c0-.67.12-1.31.31-1.92l-.01-.13-3.14-2.44-.1.05A9.96 9.96 0 0 0 2 12c0 1.6.38 3.12 1.05 4.44l3.35-2.52Z" />
      <path fill="#EA4335" d="M12 5.89c1.88 0 3.15.81 3.88 1.49l2.8-2.73C16.97 3.06 14.7 2 12 2a10 10 0 0 0-8.95 5.56l3.34 2.52C7.19 7.65 9.4 5.89 12 5.89Z" />
    </svg>
  );
}

export default function SocialAuthButtons({
  mode = "mentee",
}: {
  mode?: LoginMode;
}) {
  const [loading, setLoading] = useState<"google" | "github" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const signIn = async (provider: "google" | "github") => {
    setError(null);
    setLoading(provider);

    const supabase = createClient();
    const callback = new URL("/auth/callback", window.location.origin);
    callback.searchParams.set("mode", mode);
    callback.searchParams.set(
      "next",
      mode === "mentor" ? "/mentor/dashboard" : "/dashboard"
    );

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: callback.toString(),
      },
    });

    if (oauthError) {
      setLoading(null);
      setError(oauthError.message);
    }
  };

  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => signIn("google")}
          disabled={loading !== null}
          className="flex h-10 items-center justify-center gap-2 rounded-md border border-neutral-200 bg-white text-xs font-semibold text-neutral-800 transition hover:border-neutral-300 hover:bg-neutral-50 disabled:cursor-wait disabled:opacity-60"
        >
          <GoogleIcon />
          {loading === "google" ? "Connecting…" : "Google"}
        </button>

        <button
          type="button"
          onClick={() => signIn("github")}
          disabled={loading !== null}
          className="flex h-10 items-center justify-center gap-2 rounded-md border border-neutral-200 bg-white text-xs font-semibold text-neutral-800 transition hover:border-neutral-300 hover:bg-neutral-50 disabled:cursor-wait disabled:opacity-60"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
            <path d="M12 .7A11.3 11.3 0 0 0 8.43 22.72c.57.1.77-.25.77-.55v-2.16c-3.16.69-3.83-1.34-3.83-1.34-.51-1.31-1.26-1.66-1.26-1.66-1.03-.7.08-.69.08-.69 1.14.08 1.74 1.17 1.74 1.17 1.01 1.74 2.66 1.24 3.31.95.1-.74.4-1.24.72-1.52-2.52-.29-5.17-1.26-5.17-5.59 0-1.24.44-2.25 1.17-3.04-.12-.29-.51-1.44.11-3 0 0 .95-.3 3.11 1.16A10.8 10.8 0 0 1 12 6.07c.96 0 1.92.13 2.83.38 2.16-1.46 3.11-1.16 3.11-1.16.62 1.56.23 2.71.11 3 .73.79 1.17 1.8 1.17 3.04 0 4.34-2.66 5.3-5.19 5.58.41.35.77 1.04.77 2.1v3.16c0 .3.2.66.78.55A11.3 11.3 0 0 0 12 .7Z" />
          </svg>
          {loading === "github" ? "Connecting…" : "GitHub"}
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-3 text-center text-xs text-error">
          {error}
        </p>
      )}
    </div>
  );
}
