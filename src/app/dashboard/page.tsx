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
import { getCurrentUser } from "@/lib/auth/actions";
import AppShell from "@/components/layout/AppShell";

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

function formatTime(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

type DashboardBooking = {
  id: string;
  status: string;
  start_time: string;
  end_time: string;
  resource?: { name: string }[] | null;
};

async function getBookingsForCurrentUser(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<DashboardBooking[]> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) return [];

  const { data, error } = await supabase
    .from("bookings")
    .select("id, status, start_time, end_time, resource:resources(name)")
    .eq("user_id", user.id)
    .order("start_time", { ascending: true });

  if (error) throw error;

  return (data ?? []) as DashboardBooking[];
}

export default async function DashboardPage() {
  const user = await getCurrentUser();

  const bookings = await getBookingsForCurrentUser(await createClient()).catch(
    () => [],
  );

  // eslint-disable-next-line react-hooks/purity -- Server Component executes once per request, not re-rendered
  const now = Date.now();

  const upcoming = bookings.filter(
    (booking) =>
      booking.status === "confirmed" &&
      new Date(booking.end_time).getTime() >= now,
  );

  const past = bookings.filter(
    (booking) => new Date(booking.end_time).getTime() < now,
  );

  const cancelled = bookings.filter(
    (booking) => booking.status === "cancelled",
  );

  const totalHours = bookings
    .filter((booking) => booking.status === "confirmed")
    .reduce(
      (sum, booking) =>
        sum +
        Math.max(
          0,
          new Date(booking.end_time).getTime() -
            new Date(booking.start_time).getTime(),
        ) /
          3_600_000,
      0,
    );

  const fullName =
    (user?.user_metadata?.full_name as string | undefined) ||
    user?.email?.split("@")[0] ||
    "Alex";

  const firstName = fullName.split(" ")[0];

  const initials = fullName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const stats = [
    {
      label: "Upcoming Bookings",
      value: upcoming.length,
      icon: CalendarCheck2,
      iconClass: "bg-purple-50 text-primary-700",
    },
    {
      label: "Past Bookings",
      value: past.length,
      icon: History,
      iconClass: "bg-blue-50 text-blue-600",
    },
    {
      label: "Cancelled",
      value: cancelled.length,
      icon: XCircle,
      iconClass: "bg-red-50 text-red-500",
    },
    {
      label: "Total Hours",
      value: Math.round(totalHours),
      icon: Clock3,
      iconClass: "bg-amber-50 text-amber-600",
    },
  ];

  return (
    <AppShell>
      <main className="px-6 py-8 sm:px-8 lg:px-12 lg:py-10">
        <div className="mx-auto max-w-6xl">
          {/* Dashboard Header */}
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-700">Dashboard</p>

              <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-800">
                Welcome back, {firstName}! <span aria-hidden="true">👋</span>
              </h1>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Here&apos;s what&apos;s happening with your bookings.
              </p>
            </div>

            {/* Header Actions */}
            <div className="flex items-center gap-3">
              {/* Find a Session */}
              <Link
                href="/resources"
                className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700"
              >
                <Search size={17} />
                Find a Session
              </Link>

              {/* Profile Avatar */}
              <Link
                href="/profile"
                title="View profile"
                aria-label="View your profile"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-linear-to-br from-amber-300 to-orange-400 text-xs font-semibold text-white shadow-sm transition hover:scale-105 hover:shadow-md"
              >
                {initials}
              </Link>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map(({ label, value, icon: Icon, iconClass }) => (
              <div
                key={label}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_6px_rgba(15,23,42,0.03)] transition hover:-translate-y-0.5 hover:shadow-md"
              >
                {/* Card Heading */}
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium text-slate-500">{label}</p>

                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconClass}`}
                  >
                    <Icon size={18} strokeWidth={2} />
                  </span>
                </div>

                {/* Number */}
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
            ))}
          </div>

          {/* Upcoming Bookings */}
          <section className="mt-10">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">
                Upcoming Bookings
              </h2>

              <Link
                href="/my-bookings"
                className="text-sm font-semibold text-primary-700 transition hover:text-primary-800"
              >
                View all
              </Link>
            </div>

            <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
              {upcoming.length === 0 ? (
                <div className="px-5 py-12 text-center">
                  <CalendarCheck2
                    size={30}
                    className="mx-auto text-slate-300"
                  />

                  <p className="mt-3 text-sm font-medium text-slate-700">
                    No upcoming bookings yet.
                  </p>

                  <Link
                    href="/resources"
                    className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700"
                  >
                    <Search size={16} />
                    Find a Session
                  </Link>
                </div>
              ) : (
                upcoming.slice(0, 3).map((booking, index) => (
                  <div
                    key={booking.id}
                    className="grid items-center gap-4 border-b border-slate-100 px-6 py-5 last:border-b-0 md:grid-cols-[1.4fr_1fr_auto]"
                  >
                    {/* Resource Information */}
                    <div className="flex items-center gap-4">
                      <div
                        className={`flex h-11 w-11 items-center justify-center rounded-full text-xs font-semibold ${
                          index % 2
                            ? "bg-primary-100 text-primary-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {index % 2 ? "SB" : "JS"}
                      </div>

                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          {booking.resource?.[0]?.name ?? "Mentorship Session"}
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          with {index % 2 ? "Study Buddies" : "Jane Smith"}
                        </p>
                      </div>
                    </div>

                    {/* Date and Time */}
                    <div className="space-y-2 text-sm text-slate-500">
                      <p className="flex items-center gap-2">
                        <CalendarDays size={15} className="text-slate-400" />

                        {formatDate(booking.start_time)}
                      </p>

                      <p className="flex items-center gap-2">
                        <Clock3 size={15} className="text-slate-400" />
                        {formatTime(booking.start_time)} –{" "}
                        {formatTime(booking.end_time)}
                      </p>
                    </div>

                    {/* Status */}
                    <span className="w-fit rounded-full bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700">
                      Confirmed
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </main>
    </AppShell>
  );
}
