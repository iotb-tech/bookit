"use client";

import Link from "next/link";
import {
  Bell,
  CalendarCheck2,
  CheckCheck,
  CircleAlert,
  UsersRound,
} from "lucide-react";
import {
  useNotificationActions,
  useNotifications,
} from "@/hooks/useNotifications";

function formatWhen(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function iconFor(type: string) {
  if (type.includes("study_group") || type.includes("waitlist")) {
    return UsersRound;
  }
  if (type.includes("cancel")) {
    return CircleAlert;
  }
  return CalendarCheck2;
}

export default function NotificationsPanel({
  emptyHref = "/resources",
}: {
  emptyHref?: string;
}) {
  const { data = [], isLoading, isError, refetch } = useNotifications();
  const { markRead, markAllRead } = useNotificationActions();
  const unread = data.filter((item) => !item.read_at).length;

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-24 animate-pulse rounded-xl border border-slate-100 bg-white"
          />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-red-100 bg-white px-6 py-12 text-center">
        <CircleAlert className="mx-auto text-red-300" size={30} />
        <p className="mt-3 text-sm font-semibold text-red-700">
          Notifications could not be loaded.
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-3 text-sm font-semibold text-primary-700"
        >
          Try again
        </button>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
        <Bell className="mx-auto text-slate-300" size={34} />
        <p className="mt-4 font-semibold text-slate-700">
          No notifications yet
        </p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
          Booking confirmations, mentor cancellation reasons, study-group
          sessions and reminders will appear here.
        </p>
        <Link
          href={emptyHref}
          className="mt-5 inline-flex h-10 items-center justify-center rounded-lg bg-primary-600 px-5 text-sm font-semibold text-white hover:bg-primary-700"
        >
          Browse Resources
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          {unread} unread · {data.length} recent notification
          {data.length === 1 ? "" : "s"}
        </p>

        {unread > 0 && (
          <button
            type="button"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
          >
            <CheckCheck size={15} />
            {markAllRead.isPending ? "Marking..." : "Mark all as read"}
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {data.map((item) => {
          const Icon = iconFor(item.type);
          const content = (
            <div
              className={`flex gap-4 border-b border-slate-100 px-5 py-5 last:border-b-0 ${
                item.read_at ? "bg-white" : "bg-primary-50/40"
              }`}
            >
              <span
                className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                  item.type.includes("cancel")
                    ? "bg-rose-50 text-rose-600"
                    : "bg-primary-50 text-primary-700"
                }`}
              >
                <Icon size={18} />
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-800">
                      {item.title}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      {item.body}
                    </p>
                  </div>
                  <span className="text-xs text-slate-400">
                    {formatWhen(item.scheduled_for)}
                  </span>
                </div>
              </div>

              {!item.read_at && (
                <button
                  type="button"
                  aria-label="Mark notification as read"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    markRead.mutate(item.id);
                  }}
                  className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-primary-600"
                />
              )}
            </div>
          );

          return item.href ? (
            <Link
              key={item.id}
              href={item.href}
              onClick={() => {
                if (!item.read_at) markRead.mutate(item.id);
              }}
              className="block hover:bg-slate-50"
            >
              {content}
            </Link>
          ) : (
            <div key={item.id}>{content}</div>
          );
        })}
      </div>
    </div>
  );
}
