"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  CalendarX2,
  CheckCircle2,
  Clock3,
  Mail,
  RefreshCw,
  UsersRound,
  Video,
  XCircle,
} from "lucide-react";
import type { MentorSession } from "@/types/mentor";
import {
  mentorCancelBookingAction,
  mentorConfirmBookingAction,
  mentorRespondRescheduleAction,
} from "@/lib/mentor/actions";
import AutoDismissAlert from "@/components/ui/AutoDismissAlert";

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

function formatLongDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
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

type Tab = "requests" | "upcoming" | "past" | "cancelled";

export default function MentorSessionsList({
  requests,
  upcoming,
  past,
  cancelled,
  meetingLink,
}: {
  requests: MentorSession[];
  upcoming: MentorSession[];
  past: MentorSession[];
  cancelled: MentorSession[];
  meetingLink: string | null;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(requests.length ? "requests" : "upcoming");
  const [selected, setSelected] = useState<MentorSession | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const lists = { requests, upcoming, past, cancelled };
  const visible = lists[tab];

  const finish = (result: { success: boolean; error?: string; message?: string }) => {
    if (!result.success) {
      setError(result.error ?? "Something went wrong.");
      return;
    }
    setError(null);
    setMessage(result.message ?? "Saved successfully.");
    setSelected(null);
    setReason("");
    router.refresh();
  };

  const run = (
    task: () => Promise<{ success: boolean; error?: string; message?: string }>
  ) => {
    setError(null);
    startTransition(async () => finish(await task()));
  };

  const closeModal = () => {
    if (pending) return;
    setSelected(null);
    setReason("");
    setError(null);
  };

  const confirmCancellation = () => {
    if (!selected) return;
    if (reason.trim().length < 3) {
      setError("Tell the mentee why the session is being cancelled.");
      return;
    }
    run(() =>
      mentorCancelBookingAction({
        bookingId: selected.id,
        reason: reason.trim(),
      })
    );
  };

  const statusLabel = (session: MentorSession) => {
    if (session.status === "cancelled") return "Cancelled";
    if (tab === "past") return "Completed";
    if (session.status === "pending") return "Pending";
    return "Confirmed";
  };

  return (
    <div>
      {message && (
        <div className="mb-5">
          <AutoDismissAlert
            message={message}
            onDismiss={() => setMessage(null)}
          />
        </div>
      )}

      {error && !selected && (
        <div className="mb-5 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="border-b border-slate-200">
        <div className="flex flex-wrap gap-7">
          {(["requests", "upcoming", "past", "cancelled"] as const).map(
            (value) => (
              <button
                key={value}
                type="button"
                onClick={() => setTab(value)}
                className={`border-b-2 pb-3 text-sm font-semibold capitalize transition ${
                  tab === value
                    ? "border-primary-600 text-primary-700"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                {value === "requests" ? "Requests" : value} ({lists[value].length})
              </button>
            )
          )}
        </div>
      </div>

      <div className="mt-5">
        {visible.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
            <UsersRound className="mx-auto text-slate-300" size={34} />
            <p className="mt-4 font-semibold text-slate-700">
              No {tab === "requests" ? "pending requests" : `${tab} sessions`}
            </p>
            <p className="mt-1 text-sm text-slate-400">
              Sessions in this category will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {visible.map((session) => (
              <article
                key={session.id}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_2px_10px_rgba(15,23,42,0.025)]"
              >
                <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr_auto] lg:items-center">
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-50 text-sm font-bold text-primary-700">
                        {session.mentee.full_name
                          .split(/\s+/)
                          .filter(Boolean)
                          .map((part) => part[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase() || "BM"}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">
                          {session.mentee.full_name}
                        </p>
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                          <Mail size={13} />
                          {session.mentee.email ?? "Email unavailable"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-2 text-sm text-slate-500 sm:grid-cols-2 lg:grid-cols-1">
                    <p className="flex items-center gap-2">
                      <CalendarDays size={15} className="text-slate-400" />
                      {formatDate(session.start_time)}
                    </p>
                    <p className="flex items-center gap-2">
                      <Clock3 size={15} className="text-slate-400" />
                      {formatTime(session.start_time)} - {formatTime(session.end_time)}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                    <span
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                        session.status === "cancelled"
                          ? "bg-rose-50 text-rose-700"
                          : session.status === "pending"
                            ? "bg-amber-50 text-amber-700"
                            : tab === "past"
                              ? "bg-blue-50 text-blue-700"
                              : "bg-green-50 text-green-700"
                      }`}
                    >
                      {statusLabel(session)}
                    </span>

                    {session.status === "pending" && tab === "requests" && (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() =>
                          run(() => mentorConfirmBookingAction(session.id))
                        }
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary-600 px-3 text-xs font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
                      >
                        <CheckCircle2 size={14} /> Confirm
                      </button>
                    )}

                    {session.status === "confirmed" &&
                      tab === "upcoming" &&
                      meetingLink && (
                        <a
                          href={meetingLink}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-primary-200 bg-primary-50 px-3 text-xs font-semibold text-primary-700 hover:bg-primary-100"
                        >
                          <Video size={14} /> Meeting link
                        </a>
                      )}

                    {(tab === "upcoming" || tab === "requests") && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelected(session);
                          setReason("");
                          setError(null);
                        }}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-200 px-3 text-xs font-semibold text-red-600 hover:bg-red-50"
                      >
                        <XCircle size={14} /> Cancel session
                      </button>
                    )}
                  </div>
                </div>

                {session.reschedule_request_id &&
                  session.proposed_start_time &&
                  session.proposed_end_time && (
                    <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <p className="flex items-center gap-2 text-sm font-semibold text-amber-900">
                            <RefreshCw size={14} />
                            Reschedule requested
                          </p>
                          <p className="mt-1 text-sm text-amber-800">
                            {formatDate(session.proposed_start_time)} ·{" "}
                            {formatTime(session.proposed_start_time)} -{" "}
                            {formatTime(session.proposed_end_time)}
                          </p>
                          {session.reschedule_reason && (
                            <p className="mt-1 text-xs text-amber-700">
                              Reason: {session.reschedule_reason}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() =>
                              run(() =>
                                mentorRespondRescheduleAction(
                                  session.reschedule_request_id!,
                                  false
                                )
                              )
                            }
                            className="h-9 rounded-lg border border-amber-200 bg-white px-3 text-xs font-semibold text-amber-800 hover:bg-amber-100"
                          >
                            Decline
                          </button>
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() =>
                              run(() =>
                                mentorRespondRescheduleAction(
                                  session.reschedule_request_id!,
                                  true
                                )
                              )
                            }
                            className="h-9 rounded-lg bg-primary-600 px-3 text-xs font-semibold text-white hover:bg-primary-700"
                          >
                            Approve new time
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                {session.status === "cancelled" && (
                  <div className="mt-4 rounded-lg bg-slate-50 px-4 py-3 text-xs text-slate-500">
                    <span className="font-semibold text-slate-700">Cancelled by:</span>{" "}
                    {session.cancelled_by ?? "BookIt user"}
                    {session.cancellation_reason ? (
                      <>
                        {" "}
                        · <span className="font-semibold text-slate-700">Reason:</span>{" "}
                        {session.cancellation_reason}
                      </>
                    ) : null}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mentor-cancel-title"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
                <CalendarX2 size={20} />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-600 dark:text-rose-400">
                  Mentor cancellation
                </p>

                <h2
                  id="mentor-cancel-title"
                  className="mt-1 text-xl font-bold text-slate-900 dark:text-white"
                >
                  Cancel this session?
                </h2>
              </div>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Tell the mentee why you are cancelling. BookIt will send the reason
              to their Notifications page. This time will become unavailable.
            </p>

            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-800">
                {selected.mentee.full_name}
              </p>
              <p className="mt-2 text-sm text-slate-600">
                {formatLongDate(selected.start_time)}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {formatTime(selected.start_time)} - {formatTime(selected.end_time)}
              </p>
            </div>

            <div className="mt-4">
              <label
                htmlFor="mentor-cancel-reason"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                id="mentor-cancel-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={3}
                maxLength={300}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
                placeholder="Example: I will be unavailable at this time."
              />
            </div>

            {error && (
              <div className="mt-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeModal}
                disabled={pending}
                className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Keep session
              </button>
              <button
                type="button"
                onClick={confirmCancellation}
                disabled={pending || reason.trim().length < 3}
                className="h-10 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {pending ? "Cancelling..." : "Confirm cancellation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
