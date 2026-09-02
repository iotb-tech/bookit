"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Clock3, Plus, RefreshCw, Trash2, Power } from "lucide-react";
import AutoDismissAlert from "@/components/ui/AutoDismissAlert";
import type { ResourceAvailability } from "@/types/availability";
import type { MentorAvailabilityPreference, MentorResourceRecord } from "@/types/mentor";
import {
  createMentorAvailabilitySlotAction,
  deleteMentorAvailabilitySlotAction,
  clearMentorOpenAvailabilityAction,
  generateMentorAvailabilityAction,
  toggleMentorAvailabilityAction,
} from "@/lib/mentor/actions";

const DAYS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 7, label: "Sun" },
];

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }).format(new Date(iso));
}

function formatTime(iso: string) {
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(iso));
}

function shortTime(value: string | undefined, fallback: string) {
  if (!value) return fallback;
  return value.slice(0, 5);
}

export default function MentorAvailabilityManager({
  resource,
  slots,
  preference,
}: {
  resource: MentorResourceRecord;
  slots: ResourceAvailability[];
  preference: MentorAvailabilityPreference | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showClearModal, setShowClearModal] = useState(false);

  const [date, setDate] = useState("");
  const [singleStart, setSingleStart] = useState("09:00");
  const [singleEnd, setSingleEnd] = useState("10:00");

  const [selectedDays, setSelectedDays] = useState<number[]>(preference?.days_of_week ?? [1, 2, 3, 4, 5]);
  const [windowStart, setWindowStart] = useState(shortTime(preference?.start_time, "09:00"));
  const [windowEnd, setWindowEnd] = useState(shortTime(preference?.end_time, "16:00"));
  const [duration, setDuration] = useState(preference?.session_duration_minutes ?? resource.duration_minutes ?? 60);
  const [breakMinutes, setBreakMinutes] = useState(preference?.break_minutes ?? 30);
  const [weeksAhead, setWeeksAhead] = useState(preference?.weeks_ahead ?? 4);

  const visibleSlots = useMemo(() => slots.slice(0, 80), [slots]);
  const openCount = slots.filter((slot) => slot.status === "available").length;
  const bookedCount = slots.filter((slot) => slot.status === "booked").length;

  const run = (task: () => Promise<{ success: boolean; error?: string; message?: string }>) => {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await task();
      if (!result.success) {
        setError(result.error ?? "Something went wrong.");
        return;
      }
      setMessage(result.message ?? "Saved successfully.");
      router.refresh();
    });
  };

  const addSingleSlot = () => {
    if (!date) {
      setError("Choose a date first.");
      return;
    }
    const start = new Date(`${date}T${singleStart}:00`);
    const end = new Date(`${date}T${singleEnd}:00`);
    run(() => createMentorAvailabilitySlotAction({ resourceId: resource.id, startIso: start.toISOString(), endIso: end.toISOString() }));
  };

  const generateSchedule = () => {
    run(() => generateMentorAvailabilityAction({
      resourceId: resource.id,
      daysOfWeek: selectedDays,
      startTime: windowStart,
      endTime: windowEnd,
      sessionDurationMinutes: duration,
      breakMinutes,
      weeksAhead,
      timezone: resource.timezone || "Africa/Lagos",
      replaceExisting: true,
    }));
  };

  const toggleDay = (day: number) => {
    setSelectedDays((current) => current.includes(day) ? current.filter((value) => value !== day) : [...current, day].sort());
  };

  return (
    <div className="space-y-6">
      {message && (
        <AutoDismissAlert message={message} onDismiss={() => setMessage(null)} />
      )}
      {error && (
        <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-slate-900">Accepting new bookings</h2>
            <p className="mt-1 text-sm text-slate-500">Pause your public booking status without deleting existing bookings.</p>
          </div>
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => toggleMentorAvailabilityAction(resource.id, resource.status !== "available"))}
            className={`inline-flex h-11 items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold transition ${resource.status === "available" ? "border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100" : "bg-primary-600 text-white hover:bg-primary-700"}`}
          >
            <Power size={17} /> {resource.status === "available" ? "Pause bookings" : "Resume bookings"}
          </button>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-primary-700"><Plus size={18} /></span>
            <div>
              <h2 className="font-semibold text-slate-900">Add one availability slot</h2>
              <p className="mt-1 text-xs text-slate-400">Useful for a special or one-off session.</p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="slot-date" className="mb-2 block text-sm font-semibold text-slate-700">Date</label>
              <input id="slot-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm" />
            </div>
            <div>
              <label htmlFor="slot-start" className="mb-2 block text-sm font-semibold text-slate-700">Start</label>
              <input id="slot-start" type="time" value={singleStart} onChange={(event) => setSingleStart(event.target.value)} className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm" />
            </div>
            <div>
              <label htmlFor="slot-end" className="mb-2 block text-sm font-semibold text-slate-700">End</label>
              <input id="slot-end" type="time" value={singleEnd} onChange={(event) => setSingleEnd(event.target.value)} className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm" />
            </div>
          </div>

          <button type="button" disabled={pending} onClick={addSingleSlot} className="mt-5 inline-flex h-11 items-center gap-2 rounded-lg bg-primary-600 px-5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60">
            <Plus size={17} /> Add availability
          </button>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-primary-700"><RefreshCw size={18} /></span>
            <div>
              <h2 className="font-semibold text-slate-900">Preferred weekly availability</h2>
              <p className="mt-1 text-xs text-slate-400">Generate a repeating schedule for the next few weeks.</p>
            </div>
          </div>

          <div className="mt-5">
            <p className="mb-2 text-sm font-semibold text-slate-700">Days available</p>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((day) => (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => toggleDay(day.value)}
                  className={`h-9 rounded-lg border px-3 text-sm font-semibold transition ${selectedDays.includes(day.value) ? "border-primary-200 bg-primary-50 text-primary-700" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-2 block text-xs font-semibold text-slate-600">Window starts</label>
              <input type="time" value={windowStart} onChange={(event) => setWindowStart(event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" />
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold text-slate-600">Window ends</label>
              <input type="time" value={windowEnd} onChange={(event) => setWindowEnd(event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" />
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold text-slate-600">Session mins</label>
              <input type="number" min={15} max={240} value={duration} onChange={(event) => setDuration(Number(event.target.value))} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" />
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold text-slate-600">Break mins</label>
              <input type="number" min={0} max={240} value={breakMinutes} onChange={(event) => setBreakMinutes(Number(event.target.value))} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" />
            </div>
          </div>

          <div className="mt-4 max-w-[180px]">
            <label className="mb-2 block text-xs font-semibold text-slate-600">Generate for</label>
            <select value={weeksAhead} onChange={(event) => setWeeksAhead(Number(event.target.value))} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm">
              {[1, 2, 3, 4, 6, 8, 12].map((weeks) => <option key={weeks} value={weeks}>{weeks} week{weeks === 1 ? "" : "s"}</option>)}
            </select>
          </div>

          <p className="mt-4 text-xs leading-5 text-slate-400">Generating a new preferred schedule replaces future unbooked availability. Booked sessions are preserved.</p>
          <button type="button" disabled={pending} onClick={generateSchedule} className="mt-4 inline-flex h-11 items-center gap-2 rounded-lg bg-primary-600 px-5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60">
            <RefreshCw size={17} /> Generate schedule
          </button>
        </section>
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-slate-900">Your availability</h2>
            <p className="mt-1 text-xs text-slate-400">{openCount} open slots · {bookedCount} booked slots</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs text-slate-400">Timezone: {resource.timezone || "Africa/Lagos"}</span>
            {openCount > 0 && (
              <button
                type="button"
                disabled={pending}
                onClick={() => setShowClearModal(true)}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-200 px-3 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
              >
                <Trash2 size={14} /> Clear Open Availability
              </button>
            )}
          </div>
        </div>

        {visibleSlots.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <CalendarDays className="mx-auto text-slate-300" size={30} />
            <p className="mt-3 text-sm font-semibold text-slate-700">No availability created yet</p>
            <p className="mt-1 text-xs text-slate-400">Add one slot or generate your preferred weekly schedule.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {visibleSlots.map((slot) => (
              <div key={slot.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-center">
                <p className="text-sm font-semibold text-slate-700">{formatDate(slot.start_time)}</p>
                <p className="flex items-center gap-2 text-sm text-slate-500"><Clock3 size={14} /> {formatTime(slot.start_time)} - {formatTime(slot.end_time)}</p>
                <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${slot.status === "available" ? "bg-green-50 text-green-700" : slot.status === "booked" ? "bg-primary-50 text-primary-700" : "bg-slate-100 text-slate-500"}`}>
                  {slot.status === "available" ? "Available" : slot.status === "booked" ? "Booked" : "Unavailable"}
                </span>
                {slot.status !== "booked" ? (
                  <button type="button" disabled={pending} onClick={() => run(() => deleteMentorAvailabilitySlotAction(slot.id))} className="inline-flex h-9 w-fit items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-500 hover:border-red-200 hover:text-red-600">
                    <Trash2 size={14} /> Remove
                  </button>
                ) : <span />}
              </div>
            ))}
          </div>
        )}
      </section>

      {showClearModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="clear-availability-title"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-red-600">
              Availability
            </p>
            <h2 id="clear-availability-title" className="mt-2 text-xl font-bold text-slate-900">
              Clear open availability?
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              This removes your future open slots in one action. Your {bookedCount} booked
              session{bookedCount === 1 ? "" : "s"} will remain unchanged.
            </p>
            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-800">
                {openCount} open slot{openCount === 1 ? "" : "s"} will be removed
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Booked sessions and their history are preserved.
              </p>
            </div>
            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={pending}
                onClick={() => setShowClearModal(false)}
                className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Keep Availability
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  setShowClearModal(false);
                  run(() => clearMentorOpenAvailabilityAction(resource.id));
                }}
                className="h-10 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {pending ? "Clearing..." : `Clear ${openCount} Slots`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
