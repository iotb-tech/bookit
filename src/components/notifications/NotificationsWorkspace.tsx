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

function formatNotificationDate(
  value: string
) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
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

  const [
    showClearConfirm,
    setShowClearConfirm,
  ] = useState(false);

  const loadNotifications =
    useCallback(async () => {
      const { data, error } =
        await supabase
          .from("notifications")
          .select(
            "id,user_id,type,title,body,href,scheduled_for,read_at,created_at"
          )
          .order("created_at", {
            ascending: false,
          })
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

      const visible = (
        (data ?? []) as NotificationRow[]
      ).filter(
        (item) => {
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
    }, [supabase]);

  useEffect(() => {
    const refreshNotifications = () => {
      loadNotifications().catch(
        (error: unknown) => {
          console.error(
            "Failed to refresh notifications:",
            error
          );
        }
      );
    };

    refreshNotifications();

    const interval =
      window.setInterval(
        refreshNotifications,
        30000
      );

    window.addEventListener(
      "bookit:notifications-changed",
      refreshNotifications
    );

    return () => {
      window.clearInterval(interval);

      window.removeEventListener(
        "bookit:notifications-changed",
        refreshNotifications
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

  const markOneAsRead = async (
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

    const { error } =
      await supabase
        .from("notifications")
        .update({
          read_at: readAt,
        })
        .eq(
          "id",
          notification.id
        );

    if (error) {
      console.error(
        "Failed to mark notification as read:",
        error
      );

      await loadNotifications();
      return;
    }

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

      try {
        const readAt =
          new Date().toISOString();

        const {
          data: { user },
          error: userError,
        } =
          await supabase.auth.getUser();

        if (
          userError ||
          !user
        ) {
          console.error(
            "Unable to get current user:",
            userError
          );

          return;
        }

        const { error } =
          await supabase
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

        if (error) {
          console.error(
            "Failed to mark all notifications as read:",
            error
          );

          return;
        }

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
      } finally {
        setMarkingAll(false);
      }
    };

  const clearAll = async () => {
    setClearing(true);

    try {
      const {
        data: { user },
        error: userError,
      } =
        await supabase.auth.getUser();

      if (
        userError ||
        !user
      ) {
        console.error(
          "Unable to get current user:",
          userError
        );

        return;
      }

      const {
        error,
      } =
        await supabase.rpc(
          "clear_my_notifications"
        );

      if (error) {
        console.error(
          "Unable to clear notifications:",
          error
        );

        return;
      }

      setNotifications([]);
      setShowClearConfirm(false);

      window.dispatchEvent(
        new Event(
          "bookit:notifications-changed"
        )
      );
    } finally {
      setClearing(false);
    }
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

  const handleNotificationClick = (
    notification: NotificationRow
  ) => {
    markOneAsRead(
      notification
    ).catch(
      (error: unknown) => {
        console.error(
          "Failed to update notification:",
          error
        );
      }
    );
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead().catch(
      (error: unknown) => {
        console.error(
          "Failed to mark notifications as read:",
          error
        );
      }
    );
  };

  const handleClearAll = () => {
    clearAll().catch(
      (error: unknown) => {
        console.error(
          "Failed to clear notifications:",
          error
        );
      }
    );
  };

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
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div
              role="tablist"
              aria-label="Notification filters"
              className="flex w-fit max-w-full gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1 dark:bg-[#151923]"
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
                      {
                        item.label
                      }

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

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={
                  handleMarkAllAsRead
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
                      handleNotificationClick(
                        notification
                      )
                    }
                    className={`flex w-full items-start gap-4 px-5 py-4 text-left transition hover:bg-slate-50 dark:hover:bg-white/5 sm:px-6 ${
                      index !==
                      filteredNotifications.length -
                        1
                        ? "border-b border-slate-100 dark:border-[#252c37]"
                        : ""
                    } ${
                      unread
                        ? "bg-primary-50/40 dark:bg-primary-500/5"
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
              Clear all
              notifications?
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
                onClick={
                  handleClearAll
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