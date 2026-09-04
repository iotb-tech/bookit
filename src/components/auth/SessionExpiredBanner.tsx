"use client";

import { Clock3 } from "lucide-react";
import { useSyncExternalStore } from "react";

function subscribeToLocationChange(
  callback: () => void
) {
  window.addEventListener(
    "popstate",
    callback
  );

  return () => {
    window.removeEventListener(
      "popstate",
      callback
    );
  };
}

function getLocationSnapshot() {
  return window.location.search;
}

function getServerSnapshot() {
  return "";
}

export default function SessionExpiredBanner() {
  const search = useSyncExternalStore(
    subscribeToLocationChange,
    getLocationSnapshot,
    getServerSnapshot
  );

  const expired =
    new URLSearchParams(
      search
    ).get("expired") === "1";

  if (!expired) {
    return null;
  }

  return (
    <div className="fixed left-1/2 top-6 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 shadow-lg dark:border-amber-500/20 dark:bg-amber-500/10">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
          <Clock3 size={16} />
        </div>

        <div>
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
            Session expired
          </p>

          <p className="mt-1 text-sm leading-5 text-amber-700 dark:text-amber-300">
            Your session has expired.
            Please log in again.
          </p>
        </div>
      </div>
    </div>
  );
}