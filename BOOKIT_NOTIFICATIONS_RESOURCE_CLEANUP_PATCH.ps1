$ErrorActionPreference = "Stop"

# ============================================================
# BOOKIT - NOTIFICATION + RESOURCE CLEANUP PATCH
# ============================================================
#
# STRICTLY CHANGES:
# 1. Reschedule-feedback alert alignment
# 2. Notification UI:
#    - All / Unread / Read filtering
#    - improved counters
#    - Mark all as read
#    - Clear all
# 3. Archive old sample resources:
#    - Abdulsalam Idris
#    - Adewuyi Awwal
#    - Balogun Waliyat
#    - Study Group: Team 1
#    - Study Group: Team 2
#    - Study Group: Team 3
#    - Study Group: Team 4
#
# PRESERVES:
# - booking history
# - cancellation history
# - rescheduling logic
# - availability logic
# - ELITE
# - Harry Williams
# ============================================================

$Root = (Get-Location).Path

if (-not (Test-Path (Join-Path $Root "package.json"))) {
    throw "Run this patch from the root BOOKIT folder."
}

$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$BackupRoot = Join-Path $Root "_BOOKIT_PATCH_BACKUP_$Stamp"

New-Item -ItemType Directory -Force -Path $BackupRoot | Out-Null

$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)

function Backup-File {
    param([string]$RelativePath)

    $Source = Join-Path $Root $RelativePath

    if (-not (Test-Path $Source)) {
        return
    }

    $Destination = Join-Path $BackupRoot $RelativePath
    $DestinationFolder = Split-Path $Destination -Parent

    New-Item -ItemType Directory -Force -Path $DestinationFolder |
        Out-Null

    Copy-Item $Source $Destination -Force
}

function Read-File {
    param([string]$RelativePath)

    $Path = Join-Path $Root $RelativePath

    if (-not (Test-Path $Path)) {
        throw "Required BookIt file not found: $RelativePath"
    }

    return [System.IO.File]::ReadAllText($Path)
}

function Write-File {
    param(
        [string]$RelativePath,
        [string]$Content
    )

    $Path = Join-Path $Root $RelativePath
    $Folder = Split-Path $Path -Parent

    if (-not (Test-Path $Folder)) {
        New-Item -ItemType Directory -Force -Path $Folder |
            Out-Null
    }

    [System.IO.File]::WriteAllText(
        $Path,
        $Content,
        $Utf8NoBom
    )
}

Write-Host ""
Write-Host "BOOKIT NOTIFICATION + RESOURCE CLEANUP" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""

# ============================================================
# 1. ALIGN RESCHEDULE FEEDBACK
# ============================================================

$BookingCardRelative =
    "src/components/booking/BookingCard.tsx"

Backup-File $BookingCardRelative

$BookingCard = Read-File $BookingCardRelative

if (-not $BookingCard.Contains("BOOKIT-RESCHEDULE-ALERT-ALIGNMENT")) {

    $AlertPattern =
        '(?s)<AutoDismissAlert\b.*?/>'

    $Matches =
        [regex]::Matches(
            $BookingCard,
            $AlertPattern
        )

    if ($Matches.Count -gt 0) {

        $BookingCard =
            [regex]::Replace(
                $BookingCard,
                $AlertPattern,
                {
                    param($Match)

                    @"
{/* BOOKIT-RESCHEDULE-ALERT-ALIGNMENT */}
<div className="px-4 pt-4 sm:px-5">
  $($Match.Value)
</div>
"@
                }
            )

        Write-File `
            $BookingCardRelative `
            $BookingCard

        Write-Host `
            "[OK] Booking feedback/reschedule alert aligned." `
            -ForegroundColor Green
    }
    else {
        Write-Host `
            "[WARN] AutoDismissAlert was not found in BookingCard.tsx." `
            -ForegroundColor Yellow
    }
}
else {
    Write-Host `
        "[SKIP] Reschedule alert alignment already applied." `
        -ForegroundColor Yellow
}

# ============================================================
# 2. NOTIFICATION WORKSPACE
# ============================================================

$NotificationWorkspaceRelative =
    "src/components/notifications/NotificationsWorkspace.tsx"

Backup-File $NotificationWorkspaceRelative

$NotificationWorkspace = @'
"use client";

import {
  AlertCircle,
  Bell,
  CalendarClock,
  Check,
  CheckCheck,
  Inbox,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";

type NotificationFilter =
  | "all"
  | "unread"
  | "read";

type NotificationRow = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  href: string | null;
  scheduled_for: string | null;
  read_at: string | null;
  created_at: string;
};

type NotificationsWorkspaceProps = {
  title: string;
  description: string;
};

function notificationIcon(type: string) {
  const value = type.toLowerCase();

  if (
    value.includes("cancel") ||
    value.includes("error")
  ) {
    return {
      icon: AlertCircle,
      wrapper:
        "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400",
    };
  }

  if (
    value.includes("booking") ||
    value.includes("reschedule") ||
    value.includes("session")
  ) {
    return {
      icon: CalendarClock,
      wrapper:
        "bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-300",
    };
  }

  return {
    icon: Bell,
    wrapper:
      "bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300",
  };
}

function formatNotificationDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(
    "en",
    {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }
  ).format(date);
}

export default function NotificationsWorkspace({
  title,
  description,
}: NotificationsWorkspaceProps) {
  const router = useRouter();

  const supabase = useMemo(
    () => createClient(),
    []
  );

  const db = supabase as any;

  const [notifications, setNotifications] =
    useState<NotificationRow[]>([]);

  const [filter, setFilter] =
    useState<NotificationFilter>("all");

  const [loading, setLoading] =
    useState(true);

  const [clearing, setClearing] =
    useState(false);

  const [markingAll, setMarkingAll] =
    useState(false);

  const [showClearConfirm, setShowClearConfirm] =
    useState(false);

  const loadNotifications =
    useCallback(async () => {
      const { data, error } =
        await db
          .from("notifications")
          .select(
            "id,user_id,type,title,body,href,scheduled_for,read_at,created_at"
          )
          .order(
            "created_at",
            { ascending: false }
          )
          .limit(100);

      if (error) {
        console.error(
          "Unable to load notifications:",
          error
        );

        setLoading(false);
        return;
      }

      const now = Date.now();

      const visible =
        (data ?? []).filter(
          (item: NotificationRow) => {
            if (!item.scheduled_for) {
              return true;
            }

            const scheduled =
              new Date(
                item.scheduled_for
              ).getTime();

            return (
              Number.isNaN(scheduled) ||
              scheduled <= now
            );
          }
        );

      setNotifications(visible);
      setLoading(false);
    }, [db]);

  useEffect(() => {
    void loadNotifications();

    const interval =
      window.setInterval(
        () => {
          void loadNotifications();
        },
        30000
      );

    const refresh = () => {
      void loadNotifications();
    };

    window.addEventListener(
      "bookit:notifications-changed",
      refresh
    );

    return () => {
      window.clearInterval(interval);

      window.removeEventListener(
        "bookit:notifications-changed",
        refresh
      );
    };
  }, [loadNotifications]);

  const totalCount =
    notifications.length;

  const unreadCount =
    notifications.filter(
      (notification) =>
        !notification.read_at
    ).length;

  const readCount =
    totalCount - unreadCount;

  const filteredNotifications =
    notifications.filter(
      (notification) => {
        if (filter === "unread") {
          return !notification.read_at;
        }

        if (filter === "read") {
          return Boolean(
            notification.read_at
          );
        }

        return true;
      }
    );

  const markOneAsRead =
    async (
      notification: NotificationRow
    ) => {
      if (notification.read_at) {
        if (notification.href) {
          router.push(
            notification.href
          );
        }

        return;
      }

      const readAt =
        new Date().toISOString();

      setNotifications(
        (current) =>
          current.map((item) =>
            item.id ===
            notification.id
              ? {
                  ...item,
                  read_at: readAt,
                }
              : item
          )
      );

      await db
        .from("notifications")
        .update({
          read_at: readAt,
        })
        .eq(
          "id",
          notification.id
        );

      window.dispatchEvent(
        new Event(
          "bookit:notifications-changed"
        )
      );

      if (notification.href) {
        router.push(
          notification.href
        );
      }
    };

  const markAllAsRead =
    async () => {
      const unreadIds =
        notifications
          .filter(
            (item) =>
              !item.read_at
          )
          .map(
            (item) => item.id
          );

      if (
        unreadIds.length === 0
      ) {
        return;
      }

      setMarkingAll(true);

      const readAt =
        new Date().toISOString();

      const {
        data: {
          user,
        },
      } =
        await supabase.auth.getUser();

      if (!user) {
        setMarkingAll(false);
        return;
      }

      const { error } =
        await db
          .from("notifications")
          .update({
            read_at: readAt,
          })
          .eq(
            "user_id",
            user.id
          )
          .in(
            "id",
            unreadIds
          );

      if (!error) {
        setNotifications(
          (current) =>
            current.map(
              (item) => ({
                ...item,
                read_at:
                  item.read_at ??
                  readAt,
              })
            )
        );

        window.dispatchEvent(
          new Event(
            "bookit:notifications-changed"
          )
        );
      }

      setMarkingAll(false);
    };

  const clearAll =
    async () => {
      setClearing(true);

      const { error } =
        await db.rpc(
          "clear_my_notifications"
        );

      if (!error) {
        setNotifications([]);
        setShowClearConfirm(false);

        window.dispatchEvent(
          new Event(
            "bookit:notifications-changed"
          )
        );
      }
      else {
        console.error(
          "Unable to clear notifications:",
          error
        );
      }

      setClearing(false);
    };

  const filters: {
    key: NotificationFilter;
    label: string;
    count: number;
  }[] = [
    {
      key: "all",
      label: "All",
      count: totalCount,
    },
    {
      key: "unread",
      label: "Unread",
      count: unreadCount,
    },
    {
      key: "read",
      label: "Read",
      count: readCount,
    },
  ];

  return (
    <>
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          {title}
        </h1>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
          {description}
        </p>
      </div>

      <section className="mt-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-[#2b3240] dark:bg-[#11151d] sm:p-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 dark:border-[#2b3240] dark:bg-[#151923]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Total
                </p>

                <p className="mt-0.5 text-lg font-bold text-slate-900 dark:text-white">
                  {totalCount}
                </p>
              </div>

              <div className="rounded-xl border border-primary-100 bg-primary-50 px-4 py-2.5 dark:border-primary-500/20 dark:bg-primary-500/10">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary-600 dark:text-primary-300">
                  Unread
                </p>

                <p className="mt-0.5 text-lg font-bold text-primary-700 dark:text-primary-300">
                  {unreadCount}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 dark:border-[#2b3240] dark:bg-[#11151d]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Read
                </p>

                <p className="mt-0.5 text-lg font-bold text-slate-900 dark:text-white">
                  {readCount}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  void markAllAsRead()
                }
                disabled={
                  unreadCount === 0 ||
                  markingAll
                }
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#343c4a] dark:bg-[#11151d] dark:text-slate-200 dark:hover:bg-[#151923]"
              >
                <CheckCheck
                  size={16}
                />

                {markingAll
                  ? "Marking..."
                  : "Mark all as read"}
              </button>

              <button
                type="button"
                onClick={() =>
                  setShowClearConfirm(
                    true
                  )
                }
                disabled={
                  totalCount === 0
                }
                className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-500/20 dark:bg-[#11151d] dark:text-rose-400 dark:hover:bg-rose-500/10"
              >
                <Trash2
                  size={16}
                />

                Clear all
              </button>
            </div>
          </div>

          <div
            role="tablist"
            aria-label="Notification filters"
            className="mt-5 flex w-fit max-w-full gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1 dark:bg-[#151923]"
          >
            {filters.map(
              (item) => {
                const active =
                  filter ===
                  item.key;

                return (
                  <button
                    key={
                      item.key
                    }
                    type="button"
                    role="tab"
                    aria-selected={
                      active
                    }
                    onClick={() =>
                      setFilter(
                        item.key
                      )
                    }
                    className={`inline-flex min-w-fit items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition ${
                      active
                        ? "bg-white text-primary-700 shadow-sm dark:bg-[#11151d] dark:text-primary-300"
                        : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
                    }`}
                  >
                    {item.label}

                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        active
                          ? "bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-300"
                          : "bg-white/70 text-slate-500 dark:bg-white/5 dark:text-slate-400"
                      }`}
                    >
                      {
                        item.count
                      }
                    </span>
                  </button>
                );
              }
            )}
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-[#2b3240] dark:bg-[#11151d]">
          {loading ? (
            <div className="px-6 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
              Loading notifications...
            </div>
          ) : filteredNotifications.length ===
            0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-300">
                <Inbox
                  size={21}
                />
              </div>

              <h2 className="mt-4 text-base font-semibold text-slate-900 dark:text-white">
                {filter ===
                "unread"
                  ? "No unread notifications"
                  : filter ===
                      "read"
                    ? "No read notifications"
                    : "No notifications yet"}
              </h2>

              <p className="mt-1 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
                New booking,
                reschedule,
                cancellation and
                study-group updates
                will appear here.
              </p>
            </div>
          ) : (
            filteredNotifications.map(
              (
                notification,
                index
              ) => {
                const {
                  icon: Icon,
                  wrapper,
                } =
                  notificationIcon(
                    notification.type
                  );

                const unread =
                  !notification.read_at;

                return (
                  <button
                    type="button"
                    key={
                      notification.id
                    }
                    onClick={() =>
                      void markOneAsRead(
                        notification
                      )
                    }
                    className={`flex w-full items-start gap-4 px-5 py-4 text-left transition hover:bg-slate-50 dark:hover:bg-white/[0.025] sm:px-6 ${
                      index !==
                      filteredNotifications.length -
                        1
                        ? "border-b border-slate-100 dark:border-[#252c37]"
                        : ""
                    } ${
                      unread
                        ? "bg-primary-50/40 dark:bg-primary-500/[0.045]"
                        : "bg-white dark:bg-[#11151d]"
                    }`}
                  >
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${wrapper}`}
                    >
                      <Icon
                        size={18}
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white">
                            {
                              notification.title
                            }
                          </p>

                          <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                            {
                              notification.body
                            }
                          </p>
                        </div>

                        <div className="flex shrink-0 items-center gap-2 text-xs text-slate-400">
                          <span>
                            {formatNotificationDate(
                              notification.created_at
                            )}
                          </span>

                          {unread ? (
                            <span
                              aria-label="Unread"
                              className="h-2 w-2 rounded-full bg-primary-600"
                            />
                          ) : (
                            <Check
                              size={14}
                              aria-label="Read"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              }
            )
          )}
        </div>
      </section>

      {showClearConfirm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-[#2b3240] dark:bg-[#11151d]">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
              <Trash2
                size={20}
              />
            </div>

            <h2 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">
              Clear all notifications?
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
              This removes all
              notifications currently
              in your inbox. Future
              scheduled reminders are
              not affected.
            </p>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                disabled={
                  clearing
                }
                onClick={() =>
                  setShowClearConfirm(
                    false
                  )
                }
                className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:border-[#343c4a] dark:text-slate-200"
              >
                Keep notifications
              </button>

              <button
                type="button"
                disabled={
                  clearing
                }
                onClick={() =>
                  void clearAll()
                }
                className="rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60"
              >
                {clearing
                  ? "Clearing..."
                  : "Clear all"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
'@

Write-File `
    $NotificationWorkspaceRelative `
    $NotificationWorkspace

Write-Host `
    "[OK] Notification workspace created." `
    -ForegroundColor Green

# ============================================================
# NOTIFICATION BADGE
# ============================================================

$BadgeRelative =
    "src/components/notifications/NotificationBadge.tsx"

Backup-File $BadgeRelative

$BadgeContent = @'
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";

type NotificationBadgeProps = {
  className?: string;
  [key: string]: unknown;
};

export function NotificationBadge({
  className = "",
}: NotificationBadgeProps) {
  const supabase = useMemo(
    () => createClient(),
    []
  );

  const db = supabase as any;

  const [count, setCount] =
    useState(0);

  const loadCount =
    useCallback(async () => {
      const { data, error } =
        await db
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
        return;
      }

      const now = Date.now();

      const visible =
        (data ?? []).filter(
          (item: {
            scheduled_for:
              | string
              | null;
          }) => {
            if (
              !item.scheduled_for
            ) {
              return true;
            }

            return (
              new Date(
                item.scheduled_for
              ).getTime() <= now
            );
          }
        );

      setCount(
        visible.length
      );
    }, [db]);

  useEffect(() => {
    void loadCount();

    const interval =
      window.setInterval(
        () => {
          void loadCount();
        },
        30000
      );

    const refresh = () => {
      void loadCount();
    };

    window.addEventListener(
      "bookit:notifications-changed",
      refresh
    );

    return () => {
      window.clearInterval(
        interval
      );

      window.removeEventListener(
        "bookit:notifications-changed",
        refresh
      );
    };
  }, [loadCount]);

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
'@

Write-File `
    $BadgeRelative `
    $BadgeContent

Write-Host `
    "[OK] Notification badge updated." `
    -ForegroundColor Green

# ============================================================
# MENTEE MESSAGES PAGE
# ============================================================

$MenteeMessagesRelative =
    "src/app/messages/page.tsx"

Backup-File $MenteeMessagesRelative

$MenteeMessages = @'
import AppShell from "@/components/layout/AppShell";
import NotificationsWorkspace from "@/components/notifications/NotificationsWorkspace";
import PageBadge from "@/components/ui/PageBadge";

export const dynamic =
  "force-dynamic";

export default function MessagesPage() {
  return (
    <AppShell>
      <main className="min-h-screen bg-[#fbfbfd] px-6 py-8 dark:bg-[#0f1219] sm:px-8 lg:px-10 lg:py-10">
        <div className="mx-auto max-w-7xl">
          <PageBadge label="Messages" />

          <div className="mt-4">
            <NotificationsWorkspace
              title="Stay connected around your sessions"
              description="Booking confirmations, mentor cancellation reasons, study-group updates, reschedule decisions and session reminders appear here."
            />
          </div>
        </div>
      </main>
    </AppShell>
  );
}
'@

Write-File `
    $MenteeMessagesRelative `
    $MenteeMessages

Write-Host `
    "[OK] Mentee Messages page updated." `
    -ForegroundColor Green

# ============================================================
# MENTOR MESSAGES PAGE
# ============================================================

$MentorMessagesRelative =
    "src/app/mentor/messages/page.tsx"

Backup-File $MentorMessagesRelative

$MentorMessages = @'
import MentorAppShell from "@/components/mentor/MentorAppShell";
import NotificationsWorkspace from "@/components/notifications/NotificationsWorkspace";
import PageBadge from "@/components/ui/PageBadge";

export const dynamic =
  "force-dynamic";

export default function MentorMessagesPage() {
  return (
    <MentorAppShell>
      <main className="min-h-screen bg-[#fbfbfd] px-6 py-8 dark:bg-[#0f1219] sm:px-8 lg:px-10 lg:py-10">
        <div className="mx-auto max-w-7xl">
          <PageBadge label="Messages" />

          <div className="mt-4">
            <NotificationsWorkspace
              title="Session notifications"
              description="New booking requests, mentee cancellations, reschedule requests and study-group activity appear here."
            />
          </div>
        </div>
      </main>
    </MentorAppShell>
  );
}
'@

Write-File `
    $MentorMessagesRelative `
    $MentorMessages

Write-Host `
    "[OK] Mentor Messages page updated." `
    -ForegroundColor Green

# ============================================================
# 3. DATABASE MIGRATION
# ============================================================

$MigrationRelative =
    "supabase/migrations/20260904_notification_cleanup_and_sample_resource_archive.sql"

Backup-File $MigrationRelative

$Migration = @'
-- =========================================================
-- BOOKIT NOTIFICATION CLEANUP + SAMPLE RESOURCE ARCHIVE
-- 2026-09-04
--
-- Adds:
--   clear_my_notifications()
--
-- Archives old sample mentors/groups without deleting
-- booking history or related records.
-- =========================================================

alter table public.resources
  add column if not exists archived_at timestamptz;

create or replace function public.clear_my_notifications()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer := 0;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  delete from public.notifications
  where user_id = auth.uid()
    and (
      scheduled_for is null
      or scheduled_for <= now()
    );

  get diagnostics deleted_count = row_count;

  return deleted_count;
end;
$$;

revoke all
on function public.clear_my_notifications()
from public;

grant execute
on function public.clear_my_notifications()
to authenticated;

-- ---------------------------------------------------------
-- Archive original sample mentors / study groups.
--
-- Do NOT hard-delete because historic bookings may still
-- reference these resources.
-- ---------------------------------------------------------

update public.resources
set archived_at =
  coalesce(
    archived_at,
    now()
  )
where lower(trim(name)) in (
  lower('Abdulsalam Idris'),
  lower('Adewuyi Awwal'),
  lower('Balogun Waliyat'),
  lower('Study Group: Team 1'),
  lower('Study Group: Team 2'),
  lower('Study Group: Team 3'),
  lower('Study Group: Team 4')
);

-- Harry Williams and ELITE are intentionally untouched.
'@

Write-File `
    $MigrationRelative `
    $Migration

Write-Host `
    "[OK] Supabase migration created." `
    -ForegroundColor Green

# ============================================================
# KEEP SAMPLE RESOURCES ARCHIVED AFTER FUTURE SEEDS
# ============================================================

$SeedRelative =
    "supabase/seed.sql"

if (
    Test-Path (
        Join-Path $Root $SeedRelative
    )
) {
    Backup-File $SeedRelative

    $Seed =
        Read-File $SeedRelative

    $SeedMarker =
        "BOOKIT SAMPLE RESOURCE ARCHIVE GUARD"

    if (
        -not $Seed.Contains(
            $SeedMarker
        )
    ) {
        $SeedGuard = @'

-- =========================================================
-- BOOKIT SAMPLE RESOURCE ARCHIVE GUARD
-- Keeps legacy demo resources out of the public application
-- after a future seed while preserving their records.
-- =========================================================

update public.resources
set archived_at =
  coalesce(
    archived_at,
    now()
  )
where lower(trim(name)) in (
  lower('Abdulsalam Idris'),
  lower('Adewuyi Awwal'),
  lower('Balogun Waliyat'),
  lower('Study Group: Team 1'),
  lower('Study Group: Team 2'),
  lower('Study Group: Team 3'),
  lower('Study Group: Team 4')
);
'@

        $Seed =
            $Seed.TrimEnd() +
            "`r`n`r`n" +
            $SeedGuard.TrimStart()

        Write-File `
            $SeedRelative `
            $Seed

        Write-Host `
            "[OK] Seed cleanup guard added." `
            -ForegroundColor Green
    }
}

# ============================================================
# README
# ============================================================

$ReadmeRelative =
    "docs/NOTIFICATION_RESOURCE_CLEANUP_PATCH.md"

$Readme = @'
# BookIt Notification + Resource Cleanup Patch

This patch changes only:

1. Reschedule-feedback alignment.
2. Notifications:
   - All
   - Unread
   - Read
   - Mark all as read
   - Clear all
   - improved notification counts
3. Archives the old sample resources:
   - Abdulsalam Idris
   - Adewuyi Awwal
   - Balogun Waliyat
   - Study Group: Team 1
   - Study Group: Team 2
   - Study Group: Team 3
   - Study Group: Team 4

It intentionally preserves:

- Harry Williams
- ELITE
- historical bookings
- historical cancellations
- booking approval workflow
- rescheduling workflow
- availability
- attendance
- waitlist functionality

## Supabase

After applying the patch, run:

supabase/migrations/20260904_notification_cleanup_and_sample_resource_archive.sql

in the Supabase SQL Editor.

The legacy resources are archived instead of hard-deleted so historic
bookings are not damaged.

Future approved mentors may create new active mentor resources, and new
Study Groups can be created normally.
'@

Write-File `
    $ReadmeRelative `
    $Readme

# ============================================================
# FINISH
# ============================================================

Write-Host ""
Write-Host "PATCH COMPLETE" -ForegroundColor Green
Write-Host "=============="
Write-Host ""
Write-Host "Backup:"
Write-Host $BackupRoot -ForegroundColor Cyan
Write-Host ""
Write-Host "IMPORTANT:"
Write-Host "Run this SQL file in Supabase SQL Editor:" -ForegroundColor Yellow
Write-Host $MigrationRelative -ForegroundColor Cyan
Write-Host ""
Write-Host "Then restart BookIt:"
Write-Host "Remove-Item -Recurse -Force .next" -ForegroundColor Yellow
Write-Host "npm run dev" -ForegroundColor Yellow
Write-Host ""