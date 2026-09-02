"use client";

import {
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  CalendarDays,
  Clock3,
  Video,
} from "lucide-react";

import type {
  Booking,
} from "@/types/booking";

import {
  useCancelBooking,
} from "@/hooks/useBookings";

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
  ).format(
    new Date(iso)
  );
}

function formatLongDate(
  iso: string
) {
  return new Intl.DateTimeFormat(
    "en-US",
    {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }
  ).format(
    new Date(iso)
  );
}

function formatTime(
  iso: string
) {
  return new Intl.DateTimeFormat(
    "en-US",
    {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }
  ).format(
    new Date(iso)
  );
}

/* =========================================================
   RESOURCE HELPERS
========================================================= */

function isStudyGroup(
  name?: string | null,
  type?: string | null
) {
  const normalizedType = (
    type ?? ""
  )
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
    (
      name ?? ""
    )
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
      (part) =>
        part[0]
    )
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/* =========================================================
   PROPS
========================================================= */

type BookingCardProps = {
  booking: Booking;
  index?: number;
  cancellable?: boolean;
};

/* =========================================================
   COMPONENT
========================================================= */

export default function BookingCard({
  booking,
  index = 0,
  cancellable = true,
}: BookingCardProps) {
  const router =
    useRouter();

  const cancel =
    useCancelBooking();

  const [
    showCancelModal,
    setShowCancelModal,
  ] =
    useState(false);

  const [
    cancelError,
    setCancelError,
  ] =
    useState<string | null>(
      null
    );

  const resourceName =
    booking.resource?.name ??
    "Booked Session";

  const resourceType =
    booking.resource?.type;

  const studyGroup =
    isStudyGroup(
      resourceName,
      resourceType
    );

  const initials =
    getResourceInitials(
      resourceName,
      resourceType
    );

  const isConfirmed =
    booking.status ===
    "confirmed";

  const isCancelled =
    booking.status ===
    "cancelled";

  /*
    My Bookings already decides whether
    this card is in Upcoming or Past.

    This avoids Date.now() inside render.
  */

  const isCompleted =
    !isCancelled &&
    !cancellable;

  const canCancel =
    cancellable &&
    isConfirmed;

  /* =======================================================
     STYLES
  ======================================================= */

  const avatarStyle =
    studyGroup
      ? index % 2
        ? "bg-primary-100 text-primary-700"
        : "bg-emerald-100 text-emerald-700"
      : index % 2
        ? "bg-blue-100 text-blue-700"
        : "bg-amber-100 text-amber-700";

  const statusLabel =
    isCancelled
      ? "Cancelled"
      : isCompleted
        ? "Completed"
        : "Confirmed";

  const statusClasses =
    isCancelled
      ? "bg-rose-50 text-rose-700"
      : isCompleted
        ? "bg-blue-50 text-blue-700"
        : "bg-green-50 text-green-700";

  /* =======================================================
     OPEN MODAL
  ======================================================= */

  const openCancelModal =
    () => {
      setCancelError(
        null
      );

      setShowCancelModal(
        true
      );
    };

  /* =======================================================
     CLOSE MODAL
  ======================================================= */

  const closeCancelModal =
    () => {
      if (
        cancel.isPending
      ) {
        return;
      }

      setCancelError(
        null
      );

      setShowCancelModal(
        false
      );
    };

  /* =======================================================
     CONFIRM CANCELLATION
  ======================================================= */

  const handleConfirmCancel =
    async () => {
      setCancelError(
        null
      );

      const result =
        await cancel.mutateAsync(
          booking.id
        );

      if (!result.success) {
        setCancelError(
          result.error ||
            "Unable to cancel this booking."
        );

        return;
      }

      setShowCancelModal(
        false
      );

      /*
        Removes ?created=1 and shows
        a proper cancellation message.
      */

      router.replace(
        "/my-bookings?cancelled=1"
      );

      router.refresh();
    };

  /* =======================================================
     CARD
  ======================================================= */

  return (
    <>
      <article className="grid items-center gap-5 border-b border-slate-100 py-5 last:border-b-0 sm:grid-cols-[1.4fr_1fr_auto_auto]">

        {/* RESOURCE */}

        <div className="flex min-w-0 items-center gap-4">

          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${avatarStyle}`}
          >
            {
              initials
            }
          </div>

          <div className="min-w-0">

            <p className="truncate text-sm font-semibold text-slate-800">
              {
                resourceName
              }
            </p>

            <p className="mt-1 truncate text-sm text-slate-500">
              {studyGroup
                ? "Study group session"
                : "Mentorship session"}
            </p>
          </div>
        </div>

        {/* DATE / TIME */}

        <div className="space-y-2 text-sm text-slate-500">

          <p className="flex items-center gap-2">

            <CalendarDays
              size={15}
              className="text-slate-400"
            />

            {formatDate(
              booking.start_time
            )}
          </p>

          <p className="flex items-center gap-2">

            <Clock3
              size={15}
              className="text-slate-400"
            />

            {formatTime(
              booking.start_time
            )}

            {" - "}

            {formatTime(
              booking.end_time
            )}
          </p>
        </div>

        {/* STATUS */}

        <span
          className={`w-fit rounded-full px-3 py-1.5 text-xs font-semibold ${statusClasses}`}
        >
          {
            statusLabel
          }
        </span>

        {/* ACTIONS */}

        <div className="flex items-center gap-2">
          {canCancel && booking.resource?.meeting_link && (
            <a
              href={booking.resource.meeting_link}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-primary-200 bg-primary-50 px-3 text-xs font-semibold text-primary-700 transition hover:bg-primary-100"
            >
              <Video size={14} />
              Join
            </a>
          )}

          {canCancel ? (
            <button
              type="button"
              onClick={openCancelModal}
              className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
            >
              Cancel
            </button>
          ) : (
            <span className="hidden sm:block" />
          )}
        </div>
      </article>

      {/* ===================================================
          CANCEL MODAL
      =================================================== */}

      {showCancelModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-booking-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6">

            {/* LABEL */}

            <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary-700">
              Confirm cancellation
            </p>

            {/* HEADING — REDUCED */}

            <h2
              id="cancel-booking-title"
              className="mt-2 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl"
            >
              Cancel this booking?
            </h2>

            {/* DESCRIPTION */}

            <p className="mt-2 text-sm leading-6 text-slate-500">
              You are about to
              cancel your session
              with{" "}

              <span className="font-semibold text-slate-700">
                {
                  resourceName
                }
              </span>

              . The session slot
              will become available
              again after
              cancellation.
            </p>

            {/* =============================================
                SESSION DETAILS — SMALLER
            ============================================= */}

            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">

              <p className="text-xs font-semibold text-slate-700">
                Selected session
              </p>

              <div className="mt-3 grid gap-4 sm:grid-cols-2">

                {/* DATE */}

                <div className="flex items-start gap-2.5">

                  <CalendarDays
                    size={15}
                    className="mt-0.5 shrink-0 text-primary-600"
                  />

                  <div>

                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      Date
                    </p>

                    <p className="mt-1 text-sm font-semibold leading-5 text-slate-700">
                      {formatLongDate(
                        booking.start_time
                      )}
                    </p>
                  </div>
                </div>

                {/* TIME */}

                <div className="flex items-start gap-2.5">

                  <Clock3
                    size={15}
                    className="mt-0.5 shrink-0 text-primary-600"
                  />

                  <div>

                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      Time
                    </p>

                    <p className="mt-1 text-sm font-semibold text-slate-700">

                      {formatTime(
                        booking.start_time
                      )}

                      {" - "}

                      {formatTime(
                        booking.end_time
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ERROR */}

            {cancelError && (
              <div className="mt-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3">

                <p className="text-sm text-red-700">
                  {
                    cancelError
                  }
                </p>
              </div>
            )}

            {/* ACTIONS */}

            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">

              <button
                type="button"
                onClick={
                  closeCancelModal
                }
                disabled={
                  cancel.isPending
                }
                className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Keep booking
              </button>

              <button
                type="button"
                onClick={
                  handleConfirmCancel
                }
                disabled={
                  cancel.isPending
                }
                className="h-10 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-wait disabled:opacity-60"
              >
                {cancel.isPending
                  ? "Cancelling..."
                  : "Confirm cancel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}