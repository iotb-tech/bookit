"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

import {
  ABSOLUTE_SESSION_LIFETIME_MS,
  ACTIVITY_PING_THROTTLE_MS,
  INACTIVITY_TIMEOUT_MS,
  SESSION_ACTIVITY_PING_STORAGE_KEY,
  SESSION_ACTIVITY_STORAGE_KEY,
  SESSION_CHECK_INTERVAL_MS,
  type SessionExpiryReason,
} from "@/lib/auth/sessionPolicy";
import { createClient } from "@/lib/supabase/client";

const PUBLIC_EXACT_PATHS = ["/", "/login", "/signup"];
const PUBLIC_PREFIXES = ["/auth"];

function isPublicPath(pathname: string) {
  return (
    PUBLIC_EXACT_PATHS.includes(pathname) ||
    PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  );
}

function readStoredNumber(key: string) {
  const value = window.localStorage.getItem(key);
  if (!value) return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function writeStoredNumber(key: string, value: number) {
  window.localStorage.setItem(key, String(value));
}

function clearStoredActivity() {
  window.localStorage.removeItem(SESSION_ACTIVITY_STORAGE_KEY);
  window.localStorage.removeItem(SESSION_ACTIVITY_PING_STORAGE_KEY);
}

export default function SessionExpiryGuard() {
  const pathname = usePathname();
  const expiringRef = useRef(false);
  const publicPath = isPublicPath(pathname);

  const expireSession = useCallback(async (reason: SessionExpiryReason) => {
    if (expiringRef.current) return;
    expiringRef.current = true;

    const supabase = createClient();

    clearStoredActivity();

    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      // The server expiry route also clears the session when reachable.
    }

    const currentPath = `${window.location.pathname}${window.location.search}`;
    const params = new URLSearchParams({
      reason,
      redirectTo: currentPath,
    });

    window.location.replace(`/auth/session-expired?${params.toString()}`);
  }, []);

  const redirectToLogin = useCallback(async () => {
    if (expiringRef.current) return;
    expiringRef.current = true;

    clearStoredActivity();

    try {
      const supabase = createClient();
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      // Continue to login even when the local session is already unavailable.
    }

    const redirectTo = `${window.location.pathname}${window.location.search}`;
    const params = new URLSearchParams({ redirectTo });
    window.location.replace(`/login?${params.toString()}`);
  }, []);

  const pingServerActivity = useCallback(async () => {
    if (isPublicPath(window.location.pathname) || expiringRef.current) {
      return;
    }

    const now = Date.now();
    const lastPing = readStoredNumber(SESSION_ACTIVITY_PING_STORAGE_KEY);

    if (lastPing && now - lastPing < ACTIVITY_PING_THROTTLE_MS) {
      return;
    }

    writeStoredNumber(SESSION_ACTIVITY_PING_STORAGE_KEY, now);

    try {
      const response = await fetch("/auth/activity", {
        method: "POST",
        cache: "no-store",
        credentials: "same-origin",
        keepalive: true,
        headers: {
          "x-bookit-activity": "1",
        },
      });

      // If middleware expired the session, fetch follows the redirect chain.
      // Use the final login URL instead of starting another expiry redirect.
      if (response.redirected) {
        clearStoredActivity();
        window.location.replace(response.url);
        return;
      }

      // A 401 means there is no authenticated server session anymore.
      // Go directly to login; do not create another expiry redirect loop.
      if (response.status === 401) {
        await redirectToLogin();
      }
    } catch {
      // A temporary network outage must not log the user out or extend
      // the server-side activity cookie. The local inactivity timer remains.
    }
  }, [redirectToLogin]);

  const verifySession = useCallback(async () => {
    if (expiringRef.current || isPublicPath(window.location.pathname)) {
      return;
    }

    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      await redirectToLogin();
      return;
    }

    const signedInAtRaw = session.user.last_sign_in_at;
    const signedInAt = signedInAtRaw
      ? new Date(signedInAtRaw).getTime()
      : Number.NaN;

    if (Number.isNaN(signedInAt)) {
      return;
    }

    const now = Date.now();

    if (now - signedInAt >= ABSOLUTE_SESSION_LIFETIME_MS) {
      await expireSession("absolute");
      return;
    }

    const storedActivity = readStoredNumber(SESSION_ACTIVITY_STORAGE_KEY);

    if (!storedActivity || storedActivity < signedInAt) {
      writeStoredNumber(SESSION_ACTIVITY_STORAGE_KEY, now);
      await pingServerActivity();
      return;
    }

    if (now - storedActivity >= INACTIVITY_TIMEOUT_MS) {
      await expireSession("inactive");
    }
  }, [expireSession, pingServerActivity, redirectToLogin]);

  const recordUserActivity = useCallback(() => {
    if (expiringRef.current || isPublicPath(window.location.pathname)) {
      return;
    }

    const now = Date.now();
    const lastActivity = readStoredNumber(SESSION_ACTIVITY_STORAGE_KEY);

    if (lastActivity && now - lastActivity >= INACTIVITY_TIMEOUT_MS) {
      expireSession("inactive").catch(() => undefined);
      return;
    }

    writeStoredNumber(SESSION_ACTIVITY_STORAGE_KEY, now);
    pingServerActivity().catch(() => undefined);
  }, [expireSession, pingServerActivity]);

  useEffect(() => {
    // Session enforcement must never run on the landing page, login/signup,
    // or authentication helper routes. This prevents an expired/signed-out
    // user from repeatedly redirecting while trying to log in or switch mode.
    if (publicPath) {
      clearStoredActivity();
      expiringRef.current = false;
      return;
    }

    const runVerification = () => {
      verifySession().catch(() => undefined);
    };

    const initialCheck = window.setTimeout(runVerification, 0);
    const periodicCheck = window.setInterval(
      runVerification,
      SESSION_CHECK_INTERVAL_MS
    );

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        runVerification();
      }
    };

    const handleFocus = () => {
      runVerification();
    };

    const activityEvents: Array<keyof WindowEventMap> = [
      "pointerdown",
      "keydown",
      "scroll",
      "touchstart",
    ];

    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, recordUserActivity, {
        passive: true,
      });
    });

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleFocus);

    return () => {
      window.clearTimeout(initialCheck);
      window.clearInterval(periodicCheck);

      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, recordUserActivity);
      });

      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleFocus);
    };
  }, [publicPath, recordUserActivity, verifySession]);

  return null;
}
