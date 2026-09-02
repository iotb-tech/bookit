import Link from "next/link";

import {
  CalendarCheck2,
  CalendarDays,
  Clock3,
  History,
  Search,
  XCircle,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getBookingsForCurrentUser } from "@/lib/bookings";
import { getCurrentUser } from "@/lib/auth/actions";
import AppShell from "@/components/layout/AppShell";
import PageBadge from "@/components/ui/PageBadge";

export const dynamic = "force-dynamic";

/* =========================================================
   FORMATTERS
========================================================= */

function formatDate(
  iso: string
) {
  return new Intl.DateTimeFormat(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    }
  ).format(new Date(iso));
}

function formatTime(
  iso: string
) {
  return new Intl.DateTimeFormat(
    "en-US",
    {
      hour: "numeric",
      minute: "2-digit",
    }
  ).format(new Date(iso));
}

/* =========================================================
   RESOURCE HELPERS
========================================================= */

function isStudyGroup(
  name?: string | null,
  type?: string | null
) {
  const normalizedType =
    (type ?? "")
      .trim()
      .toLowerCase()
      .replace(
        /[\s-]+/g,
        "_"
      );

  return (
    normalizedType ===
      "study_group" ||
    normalizedType ===
      "studygroup" ||
    (name ?? "")
      .toLowerCase()
      .includes(
        "study group"
      )
  );
}

function getResourceInitials(
  name?: string | null,
  type?: string | null
) {
  const resourceName =
    name?.trim() ||
    "Booked Session";

  if (
    isStudyGroup(
      resourceName,
      type
    )
  ) {
    const teamMatch =
      resourceName.match(
        /Team\s+(\d+)/i
      );

    if (teamMatch) {
      return `T${teamMatch[1]}`;
    }
  }

  return resourceName
    .split(/\s+/)
    .filter(Boolean)
    .map(
      (part) => part[0]
    )
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/* =========================================================
   DASHBOARD
========================================================= */

export default async function DashboardPage() {
  const user =
    await getCurrentUser();

  const supabase =
    await createClient();

  const bookings =
    await getBookingsForCurrentUser(
      supabase
    ).catch(() => []);

  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();

  /* Upcoming */
  const upcoming =
    bookings
      .filter(
        (booking) =>
          (booking.status ===
            "confirmed" ||
            booking.status ===
            "pending") &&
          new Date(
            booking.end_time
          ).getTime() >= now
      )
      .sort(
        (a, b) =>
          new Date(
            a.start_time
          ).getTime() -
          new Date(
            b.start_time
          ).getTime()
      );

  /* Past */
  const past =
    bookings
      .filter(
        (booking) =>
          booking.status !==
            "cancelled" &&
          new Date(
            booking.end_time
          ).getTime() < now
      )
      .sort(
        (a, b) =>
          new Date(
            b.start_time
          ).getTime() -
          new Date(
            a.start_time
          ).getTime()
      );

  /* Cancelled */
  const cancelled =
    bookings.filter(
      (booking) =>
        booking.status ===
        "cancelled"
    );

  /* Hours */
  const totalHours =
    bookings
      .filter(
        (booking) =>
          booking.status ===
          "confirmed"
      )
      .reduce(
        (
          total,
          booking
        ) => {
          const start =
            new Date(
              booking.start_time
            ).getTime();

          const end =
            new Date(
              booking.end_time
            ).getTime();

          return (
            total +
            Math.max(
              0,
              end - start
            ) /
              3_600_000
          );
        },
        0
      );

  /* User */
  const fullName =
    (user?.user_metadata
      ?.full_name as
      | string
      | undefined) ||
    user?.email?.split(
      "@"
    )[0] ||
    "Alex";

  const firstName =
    fullName.split(" ")[0];

  const initials =
    fullName
      .split(/\s+/)
      .filter(Boolean)
      .map(
        (part) =>
          part[0]
      )
      .join("")
      .slice(0, 2)
      .toUpperCase();

  /* Stats */
  const stats = [
    {
      label:
        "Upcoming Bookings",
      value:
        upcoming.length,
      icon:
        CalendarCheck2,
      iconClass:
        "bg-primary-50 text-primary-700",
    },

    {
      label:
        "Past Bookings",
      value: past.length,
      icon: History,
      iconClass:
        "bg-blue-50 text-blue-600",
    },

    {
      label: "Cancelled",
      value:
        cancelled.length,
      icon: XCircle,
      iconClass:
        "bg-rose-50 text-rose-600",
    },

    {
      label: "Total Hours",
      value: Math.round(
        totalHours
      ),
      icon: Clock3,
      iconClass:
        "bg-amber-50 text-amber-600",
    },
  ];

  return (
    <AppShell>
      <main className="px-6 py-8 sm:px-8 lg:px-12 lg:py-10">
        <div className="mx-auto max-w-6xl">

          {/* =========================================
              HEADER
          ========================================= */}

          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">

            <div>
              <PageBadge label="Dashboard" />

              <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-800">
                Welcome back,{" "}
                {firstName}!{" "}
                <span aria-hidden="true">
                  👋
                </span>
              </h1>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Here&apos;s
                what&apos;s
                happening with
                your bookings.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <Link
                href="/resources"
                className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700"
              >
                <Search
                  size={17}
                />
                Find a Session
              </Link>

              <Link
                href="/profile"
                title="View profile"
                aria-label="View your profile"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-orange-400 text-xs font-semibold text-white shadow-sm transition hover:scale-105 hover:shadow-md"
              >
                {initials}
              </Link>
            </div>
          </div>

          {/* =========================================
              STATISTICS
          ========================================= */}

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map(
              ({
                label,
                value,
                icon: Icon,
                iconClass,
              }) => (
                <div
                  key={
                    label
                  }
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_6px_rgba(15,23,42,0.03)] transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium text-slate-500">
                      {label}
                    </p>

                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconClass}`}
                    >
                      <Icon
                        size={18}
                        strokeWidth={
                          2
                        }
                      />
                    </span>
                  </div>

                  <p className="mt-3 text-3xl font-semibold text-slate-800">
                    {value}
                  </p>

                  <Link
                    href="/my-bookings"
                    className="mt-4 inline-block text-sm font-semibold text-primary-700 transition hover:text-primary-800"
                  >
                    View all
                  </Link>
                </div>
              )
            )}
          </div>

          {/* =========================================
              UPCOMING BOOKINGS
          ========================================= */}

          <section className="mt-10">
            <div className="flex items-center justify-between">

              <h2 className="text-lg font-semibold text-slate-800">
                Upcoming
                Bookings
              </h2>

              <Link
                href="/my-bookings"
                className="text-sm font-semibold text-primary-700 transition hover:text-primary-800"
              >
                View all
              </Link>
            </div>

            <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">

              {upcoming.length ===
              0 ? (
                <div className="px-6 py-12 text-center">

                  <CalendarCheck2
                    size={30}
                    className="mx-auto text-slate-300"
                  />

                  <p className="mt-3 text-sm font-medium text-slate-700">
                    No upcoming
                    bookings yet.
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    Find a mentor
                    or study group
                    and book your
                    next session.
                  </p>

                  <Link
                    href="/resources"
                    className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700"
                  >
                    <Search
                      size={
                        16
                      }
                    />
                    Find a Session
                  </Link>
                </div>
              ) : (
                upcoming
                  .slice(0, 3)
                  .map(
                    (
                      booking,
                      index
                    ) => {
                      const resourceName =
                        booking
                          .resource
                          ?.name ??
                        "Booked Session";

                      const resourceType =
                        booking
                          .resource
                          ?.type;

                      const studyGroup =
                        isStudyGroup(
                          resourceName,
                          resourceType
                        );

                      const resourceInitials =
                        getResourceInitials(
                          resourceName,
                          resourceType
                        );

                      return (
                        <div
                          key={
                            booking.id
                          }
                          className="grid items-center gap-4 border-b border-slate-100 px-6 py-5 last:border-b-0 md:grid-cols-[1.4fr_1fr_auto]"
                        >

                          {/* Resource */}
                          <div className="flex items-center gap-4">

                            <div
                              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                                studyGroup
                                  ? index %
                                      2
                                    ? "bg-primary-100 text-primary-700"
                                    : "bg-emerald-100 text-emerald-700"
                                  : index %
                                      2
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              {
                                resourceInitials
                              }
                            </div>

                            <div>
                              <p className="text-sm font-semibold text-slate-800">
                                {
                                  resourceName
                                }
                              </p>

                              <p className="mt-1 text-sm text-slate-500">
                                {studyGroup
                                  ? "Study group session"
                                  : "Mentorship session"}
                              </p>
                            </div>
                          </div>

                          {/* Date */}
                          <div className="space-y-2 text-sm text-slate-500">

                            <p className="flex items-center gap-2">
                              <CalendarDays
                                size={
                                  15
                                }
                                className="text-slate-400"
                              />

                              {formatDate(
                                booking.start_time
                              )}
                            </p>

                            <p className="flex items-center gap-2">
                              <Clock3
                                size={
                                  15
                                }
                                className="text-slate-400"
                              />

                              {formatTime(
                                booking.start_time
                              )}{" "}
                              –{" "}
                              {formatTime(
                                booking.end_time
                              )}
                            </p>
                          </div>

                          {/* Status */}
                          <span className="w-fit rounded-full bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700">
                            Confirmed
                          </span>
                        </div>
                      );
                    }
                  )
              )}
            </div>
          </section>
        </div>
      </main>
    </AppShell>
  );
}