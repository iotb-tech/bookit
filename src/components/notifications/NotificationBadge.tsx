"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";

type NotificationBadgeProps = {
  className?: string;
};

type NotificationBadgeRow = {
  id: string;
  scheduled_for: string | null;
};

export function NotificationBadge({
  className = "",
}: NotificationBadgeProps) {
  const supabase = useMemo(
    () => createClient(),
    []
  );

  const [count, setCount] =
    useState(0);

  useEffect(() => {
    let active = true;

    const loadCount = async () => {
      const { data, error } =
        await supabase
          .from("notifications")
          .select(
            "id,scheduled_for"
          )
          .is(
            "read_at",
            null
          )
          .limit(100);

      if (error) {
        console.error(
          "Unable to load unread notification count:",
          error
        );

        return;
      }

      const now = Date.now();

      const rows =
        (data ??
          []) as NotificationBadgeRow[];

      const visibleCount =
        rows.filter(
          (item) => {
            if (
              !item.scheduled_for
            ) {
              return true;
            }

            const scheduled =
              new Date(
                item.scheduled_for
              ).getTime();

            return (
              Number.isNaN(
                scheduled
              ) ||
              scheduled <= now
            );
          }
        ).length;

      if (active) {
        setCount(
          visibleCount
        );
      }
    };

    const refreshCount = () => {
      loadCount().catch(
        (error: unknown) => {
          console.error(
            "Failed to refresh notification count:",
            error
          );
        }
      );
    };

    /*
     * Start outside the synchronous
     * effect body so React's lint rule
     * does not treat this as an
     * immediate state update.
     */
    const initialTimer =
      window.setTimeout(
        refreshCount,
        0
      );

    const interval =
      window.setInterval(
        refreshCount,
        30000
      );

    window.addEventListener(
      "bookit:notifications-changed",
      refreshCount
    );

    return () => {
      active = false;

      window.clearTimeout(
        initialTimer
      );

      window.clearInterval(
        interval
      );

      window.removeEventListener(
        "bookit:notifications-changed",
        refreshCount
      );
    };
  }, [supabase]);

  if (count <= 0) {
    return null;
  }

  return (
    <span
      className={`inline-flex min-w-5 items-center justify-center rounded-full bg-primary-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white ${className}`}
      aria-label={`${count} unread notifications`}
    >
      {count > 99
        ? "99+"
        : count}
    </span>
  );
}

export default NotificationBadge;