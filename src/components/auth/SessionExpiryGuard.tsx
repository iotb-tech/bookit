"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

const MAX_SESSION_AGE_MS = 24 * 60 * 60 * 1000;

export default function SessionExpiryGuard() {
  const router = useRouter();
  const pathname = usePathname();

  const timeoutRef = useRef<number | null>(null);
  const expiringRef = useRef(false);

  const clearExpiryTimer = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const expireSession = useCallback(async () => {
    if (expiringRef.current) return;

    expiringRef.current = true;
    clearExpiryTimer();

    const supabase = createClient();

    try {
      await supabase.auth.signOut();
    } finally {
      router.replace("/login?expired=1");
      router.refresh();
    }
  }, [clearExpiryTimer, router]);

  const verifySessionAge = useCallback(async () => {
    clearExpiryTimer();

    const supabase = createClient();

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return;
    }

    const lastSignInAt = user.last_sign_in_at;

    if (!lastSignInAt) {
      return;
    }

    const signedInAt = new Date(lastSignInAt).getTime();

    if (Number.isNaN(signedInAt)) {
      return;
    }

    const expiresAt = signedInAt + MAX_SESSION_AGE_MS;
    const remaining = expiresAt - Date.now();

    if (remaining <= 0) {
      await expireSession();
      return;
    }

    timeoutRef.current = window.setTimeout(() => {
      void expireSession();
    }, remaining);
  }, [clearExpiryTimer, expireSession]);

  useEffect(() => {
    void verifySessionAge();

    const periodicCheck = window.setInterval(() => {
      void verifySessionAge();
    }, 5 * 60 * 1000);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void verifySessionAge();
      }
    };

    const handleFocus = () => {
      void verifySessionAge();
    };

    document.addEventListener(
      "visibilitychange",
      handleVisibility
    );

    window.addEventListener(
      "focus",
      handleFocus
    );

    return () => {
      clearExpiryTimer();
      window.clearInterval(periodicCheck);

      document.removeEventListener(
        "visibilitychange",
        handleVisibility
      );

      window.removeEventListener(
        "focus",
        handleFocus
      );
    };
  }, [
    pathname,
    clearExpiryTimer,
    verifySessionAge,
  ]);

  return null;
}