import Link from "next/link";
import { redirect } from "next/navigation";

import {
  ArrowRight,
  CalendarDays,
  Clock3,
  CircleAlert,
  UserRoundCheck,
  UsersRound,
} from "lucide-react";

import MentorAppShell from "@/components/mentor/MentorAppShell";
import PageBadge from "@/components/ui/PageBadge";
import { getMentorDashboardData } from "@/lib/mentor";

export const dynamic = "force-dynamic";

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(iso));
}

function formatTime(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export default async function MentorDashboardPage() {
  const {
    context,
    sessions,
    availability,
    generatedAt,
  } = await getMentorDashboardData();

  if (!context) {
    redirect("/login?mode=mentor");
  }

  const fullName =
    context.profile.full_name ||
    context.profile.email?.split("@")[0] ||
    "Mentor";

  const firstName = fullName.split(" ")[0];
  const now = new Date(generatedAt).getTime();

  const generatedDate = new Date(generatedAt);
  const todayStart = new Date(
    generatedDate.getFullYear(),
    generatedDate.getMonth(),
    generatedDate.getDate()
  ).getTime();
  const tomorrowStart = todayStart + 86_400_000;

  const upcoming = sessions
    .filter(
      (session) =>
        session.status === "confirmed" &&
        new Date(session.end_time).getTime() >= now
    )
    .sort(
      (a, b) =>
        new Date(a.start_time).getTime() -
        new Date(b.start_time).getTime()
    );

  const today = upcoming.filter((session) => {
    const start = new Date(session.start_time).getTime();
    return start >= todayStart && start < tomorrowStart;
  });

  const availableSlots = availability.filter(
    (slot) =>
      slot.status === "available" &&
      new Date(slot.start_time).getTime() >= now
  );

  const uniqueMentees = new Set(
    sessions.map((session) => session.user_id)
  ).size;

  const completed = sessions.filter(
    (session) =>
      session.status === "confirmed" &&
      new Date(session.end_time).getTime() < now
  );

  const mentoringHours = completed.reduce(
    (sum, session) =>
      sum +
      Math.max(
        0,
        new Date(session.end_time).getTime() -
          new Date(session.start_time).getTime()
      ) /
        3_600_000,
    0
  );

  const stats = [
    {
      label: "Today's Sessions",
      value: today.length,
      icon: CalendarDays,
      iconClass: "bg-primary-50 text-primary-700",
    },
    {
      label: "Upcoming Sessions",
      value: upcoming.length,
      icon: UsersRound,
      iconClass: "bg-blue-50 text-blue-600",
    },
    {
      label: "Available Slots",
      value: availableSlots.length,
      icon: Clock3,
      iconClass: "bg-amber-50 text-amber-600",
    },
    {
      label: "Mentees Booked",
      value: uniqueMentees,
      icon: UserRoundCheck,
      iconClass: "bg-emerald-50 text-emerald-600",
    },
  ];

  return (
    <MentorAppShell>
      <main className="px-6 py-8 sm:px-8 lg:px-12 lg:py-10">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <PageBadge label="Mentor Dashboard" />

              <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-800">
                Welcome back, {firstName}! <span aria-hidden="true">👋</span>
              </h1>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Here&apos;s what&apos;s happening with your mentorship sessions.
              </p>
            </div>

            <Link
              href="/mentor/availability"
              className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700"
            >
              <Clock3 size={17} />
              Manage Availability
            </Link>
          </div>

          {!context.resource && (
            <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-5">
              <div className="flex gap-3">
                <CircleAlert
                  className="mt-0.5 shrink-0 text-amber-700"
                  size={20}
                />
                <div>
                  <p className="font-semibold text-amber-900">
                    Your mentor account is active, but your mentor profile is not set up yet.
                  </p>
                  <p className="mt-1 text-sm text-amber-700">
                    Complete your profile before creating availability or receiving bookings.
                  </p>
                  <Link
                    href="/mentor/profile"
                    className="mt-3 inline-flex items-center text-sm font-semibold text-primary-700"
                  >
                    Set up mentor profile
                    <ArrowRight size={15} className="ml-1" />
                  </Link>
                </div>
              </div>
            </div>
          )}

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map(({ label, value, icon: Icon, iconClass }) => (
              <div
                key={label}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_6px_rgba(15,23,42,0.03)] transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium text-slate-500">
                    {label}
                  </p>
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-lg ${iconClass}`}
                  >
                    <Icon size={18} />
                  </span>
                </div>
                <p className="mt-4 text-3xl font-bold text-slate-800">
                  {value}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-8 grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_6px_rgba(15,23,42,0.03)]">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div>
                  <h2 className="font-semibold text-slate-800">
                    Upcoming Sessions
                  </h2>
                  <p className="mt-1 text-xs text-slate-400">
                    See who has booked you next.
                  </p>
                </div>
                <Link
                  href="/mentor/sessions"
                  className="text-sm font-semibold text-primary-700"
                >
                  View all
                </Link>
              </div>

              {upcoming.length === 0 ? (
                <div className="px-5 py-12 text-center">
                  <UsersRound className="mx-auto text-slate-300" size={30} />
                  <p className="mt-3 text-sm font-semibold text-slate-700">
                    No upcoming sessions
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Create availability so mentees can book you.
                  </p>
                </div>
              ) : (
                <div>
                  {upcoming.slice(0, 5).map((session) => (
                    <div
                      key={session.id}
                      className="grid gap-3 border-b border-slate-100 px-5 py-4 last:border-b-0 md:grid-cols-[1fr_auto] md:items-center"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          {session.mentee.full_name}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {session.mentee.email ?? "Mentee email unavailable"}
                        </p>
                      </div>
                      <div className="text-sm text-slate-500 md:text-right">
                        <p>{formatDate(session.start_time)}</p>
                        <p className="mt-1 text-xs">
                          {formatTime(session.start_time)} - {formatTime(session.end_time)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_6px_rgba(15,23,42,0.03)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-slate-800">
                    Booking Status
                  </h2>
                  <p className="mt-1 text-xs text-slate-400">
                    Control whether mentees can book you.
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                    context.resource?.status === "available"
                      ? "bg-green-50 text-green-700"
                      : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {context.resource?.status === "available"
                    ? "Accepting bookings"
                    : "Paused"}
                </span>
              </div>

              <div className="mt-5 rounded-lg bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-800">
                  {context.resource?.name ?? "Mentor profile not created"}
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {context.resource?.headline ??
                    "Add a headline and your areas of expertise."}
                </p>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <p className="text-[11px] font-medium text-slate-400">
                    Completed sessions
                  </p>
                  <p className="mt-1 text-xl font-bold text-slate-800">
                    {completed.length}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <p className="text-[11px] font-medium text-slate-400">
                    Mentoring hours
                  </p>
                  <p className="mt-1 text-xl font-bold text-slate-800">
                    {Math.round(mentoringHours * 10) / 10}
                  </p>
                </div>
              </div>

              <Link
                href="/mentor/profile"
                className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary-700"
              >
                Edit mentor profile
                <ArrowRight size={15} />
              </Link>
            </section>
          </div>
        </div>
      </main>
    </MentorAppShell>
  );
}
