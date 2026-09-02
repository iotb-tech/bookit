"use client";

import { useEffect } from "react";

export default function AutoDismissAlert({
  message,
  error,
  onDismiss,
  delay = 4000,
  className = "",
}: {
  message?: string | null;
  error?: string | null;
  onDismiss: () => void;
  delay?: number;
  className?: string;
}) {
  useEffect(() => {
    if (!message || error) return;

    const timer = window.setTimeout(onDismiss, delay);
    return () => window.clearTimeout(timer);
  }, [message, error, onDismiss, delay]);

  if (!message && !error) return null;

  return (
    <div
      role={error ? "alert" : "status"}
      className={`${className} rounded-lg border px-4 py-3 text-sm ${
        error
          ? "border-red-100 bg-red-50 text-red-700"
          : "border-green-100 bg-green-50 text-green-700"
      }`}
    >
      {error ?? message}
    </div>
  );
}
