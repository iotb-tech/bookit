"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { CalendarDays, Clock3, ExternalLink, LogOut, UsersRound, Video } from "lucide-react";
import { useRouter } from "next/navigation";
import { leaveStudyGroupAction } from "@/lib/study-groups/actions";
import type { MyStudyGroup } from "@/types/studyGroup";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

const WEEKDAY_LABELS: Record<number, string> = {
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
  7: "Sunday",
};

function formatClock(value: string) {
  const [hourValue, minuteValue] = value.split(":").map(Number);
  const date = new Date(2000, 0, 1, hourValue || 0, minuteValue || 0);
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export default function MyStudyGroupsList({ groups }: { groups: MyStudyGroup[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<MyStudyGroup | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const leave = () => {
    if (!selected) return;
    setError(null);
    startTransition(async () => {
      const result = await leaveStudyGroupAction(selected.id);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setSelected(null);
      router.refresh();
    });
  };

  if (groups.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
        <UsersRound className="mx-auto text-slate-300" size={36} />
        <p className="mt-4 font-semibold text-slate-700">You have not joined a study group yet</p>
        <p className="mt-1 text-sm text-slate-400">Browse Study Groups and join one that matches what you want to learn or build.</p>
        <Link href="/resources" className="mt-5 inline-flex h-10 items-center justify-center rounded-lg bg-primary-600 px-5 text-sm font-semibold text-white hover:bg-primary-700">
          Browse Study Groups
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-5">
        {groups.map((group) => (
          <article key={group.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_2px_10px_rgba(15,23,42,0.03)] sm:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-50 text-sm font-bold text-primary-700">
                    {group.name.split(/\s+/).filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "SG"}
                  </div>
                  <div>
                    <h2 className="font-semibold text-slate-900">{group.name}</h2>
                    <p className="mt-1 text-xs text-slate-400">Joined {formatDate(group.joined_at)}</p>
                  </div>
                </div>

                <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-500">
                  {group.description || "Collaborate, learn and attend shared sessions with your study group."}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/resources/${group.id}`} className="inline-flex h-10 items-center gap-2 rounded-lg border border-primary-200 bg-primary-50 px-4 text-sm font-semibold text-primary-700 hover:bg-primary-100">
                  View Group <ExternalLink size={15} />
                </Link>
                <button type="button" onClick={() => { setSelected(group); setError(null); }} className="inline-flex h-10 items-center gap-2 rounded-lg border border-red-200 px-4 text-sm font-semibold text-red-600 hover:bg-red-50">
                  <LogOut size={15} /> Leave Group
                </button>
              </div>
            </div>

            {group.regular_schedule.length > 0 && (
              <div className="mt-5 border-t border-slate-100 pt-5">
                <p className="text-sm font-semibold text-slate-800">Regular Group Schedule</p>
                <p className="mt-1 text-xs text-slate-400">
                  The mentor&apos;s preferred recurring days and times.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {group.regular_schedule.map((entry) => (
                    <span
                      key={entry.id}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600"
                    >
                      {WEEKDAY_LABELS[entry.weekday] ?? `Day ${entry.weekday}`} ·{" "}
                      {formatClock(entry.start_time)} – {formatClock(entry.end_time)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-5 border-t border-slate-100 pt-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Upcoming Group Sessions</p>
                  <p className="mt-1 text-xs text-slate-400">These sessions are shared by all active group members.</p>
                </div>
                <span className="rounded-full bg-primary-50 px-3 py-1.5 text-xs font-semibold text-primary-700">
                  {group.upcoming_sessions.length} upcoming
                </span>
              </div>

              {group.upcoming_sessions.length === 0 ? (
                <div className="mt-4 rounded-lg border border-dashed border-slate-200 px-4 py-5 text-sm text-slate-500">
                  No upcoming group session has been scheduled yet.
                </div>
              ) : (
                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  {group.upcoming_sessions.slice(0, 4).map((session) => (
                    <div key={session.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <p className="flex items-center gap-2 text-sm font-semibold text-slate-700"><CalendarDays size={15} className="text-slate-400" /> {formatDate(session.start_time)}</p>
                      <p className="mt-2 flex items-center gap-2 text-sm text-slate-500"><Clock3 size={15} className="text-slate-400" /> {formatTime(session.start_time)} - {formatTime(session.end_time)}</p>
                      {session.meeting_link && (
                        <a href={session.meeting_link} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-primary-700 hover:text-primary-800">
                          <Video size={15} /> Join meeting
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </article>
        ))}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4" role="dialog" aria-modal="true" aria-labelledby="leave-study-group-title">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-red-600">Study group</p>
            <h2 id="leave-study-group-title" className="mt-2 text-xl font-bold text-slate-900">Leave {selected.name}?</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">You will stop seeing the group&apos;s private scheduled sessions. You can rejoin later if the group is still open and has space.</p>
            {error && <div className="mt-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setSelected(null)} disabled={pending} className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">Stay in group</button>
              <button type="button" onClick={leave} disabled={pending} className="h-10 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">{pending ? "Leaving..." : "Leave group"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
