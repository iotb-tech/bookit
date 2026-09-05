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

function readStoredNumber(key: string) {
  const value = window.localStorage.getItem(key);
  if (!value) return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function writeStoredNumber(key: string, value: number) {
  window.localStorage.setItem(key, String(value));
}

export default function SessionExpiryGuard() {
  const pathname = usePathname();
  const expiringRef = useRef(false);

  const expireSession = useCallback(async (reason: SessionExpiryReason) => {
    if (expiringRef.current) return;
    expiringRef.current = true;

    const supabase = createClient();

    window.localStorage.removeItem(SESSION_ACTIVITY_STORAGE_KEY);
    window.localStorage.removeItem(SESSION_ACTIVITY_PING_STORAGE_KEY);

    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      // The server expiry route below also clears the session when reachable.
    }

    const params = new URLSearchParams({
      reason,
      redirectTo: `${window.location.pathname}${window.location.search}`,
    });

    window.location.replace(`/auth/session-expired?${params.toString()}`);
  }, []);

  const pingServerActivity = useCallback(async () => {
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

      if (response.status === 401 || response.redirected) {
        await expireSession("inactive");
      }
    } catch {
      // A temporary network outage must not extend the server-side activity cookie.
      // The client-side timer continues to enforce inactivity locally.
    }
  }, [expireSession]);

  const verifySession = useCallback(async () => {
    if (expiringRef.current) return;

    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
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
  }, [expireSession, pingServerActivity]);

  const recordUserActivity = useCallback(() => {
    if (expiringRef.current) return;

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
  }, [pathname, recordUserActivity, verifySession]);

  return null;
}
