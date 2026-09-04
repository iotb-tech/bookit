"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Clock3,
  RefreshCw,
  Video,
} from "lucide-react";

import type { Booking } from "@/types/booking";
import {
  useCancelBooking,
  useRequestBookingReschedule,
} from "@/hooks/useBookings";
import { useResourceAvailability } from "@/hooks/useResourceAvailability";
import AutoDismissAlert from "@/components/ui/AutoDismissAlert";

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
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
    hour12: true,
  }).format(new Date(iso));
}

function isStudyGroup(name?: string | null, type?: string | null) {
  const normalizedType = (type ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  return (
    normalizedType === "study_group" ||
    normalizedType === "studygroup" ||
    (name ?? "").toLowerCase().includes("study group")
  );
}

function getResourceInitials(name?: string | null, type?: string | null) {
  const resourceName = name?.trim() || "Booked Session";

  if (isStudyGroup(resourceName, type)) {
    const teamMatch = resourceName.match(/Team\s+(\d+)/i);
    if (teamMatch) return `T${teamMatch[1]}`;
  }

  return resourceName
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

type BookingCardProps = {
  booking: Booking;
  index?: number;
  cancellable?: boolean;
};

export default function BookingCard({
  booking,
  index = 0,
  cancellable = true,
}: BookingCardProps) {
  const router = useRouter();
  const cancel = useCancelBooking();
  const reschedule = useRequestBookingReschedule();
  const { data: availableSlots = [] } = useResourceAvailability(
    cancellable ? booking.resource_id : undefined
  );

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);
  const [rescheduleMessage, setRescheduleMessage] = useState<string | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [rescheduleReason, setRescheduleReason] = useState("");

  const resourceName = booking.resource?.name ?? "Booked Session";
  const resourceType = booking.resource?.type;
  const studyGroup = isStudyGroup(resourceName, resourceType);
  const initials = getResourceInitials(resourceName, resourceType);

  const isPending = booking.status === "pending";
  const isConfirmed = booking.status === "confirmed";
  const isCancelled = booking.status === "cancelled";
  const isCompleted = !isCancelled && !cancellable;
  const canManage = cancellable && (isPending || isConfirmed);
  const canReschedule = canManage && !studyGroup;

  const selectableSlots = useMemo(
    () =>
      availableSlots.filter(
        (slot) => slot.id !== booking.availability_id
      ),
    [availableSlots, booking.availability_id]
  );

  const avatarStyle = studyGroup
    ? index % 2
      ? "bg-primary-100 text-primary-700"
      : "bg-emerald-100 text-emerald-700"
    : index % 2
      ? "bg-blue-100 text-blue-700"
      : "bg-amber-100 text-amber-700";

  const statusLabel = isCancelled
    ? "Cancelled"
    : isCompleted
      ? "Completed"
      : isPending
        ? "Pending mentor confirmation"
        : "Confirmed";

  const statusClasses = isCancelled
    ? "bg-rose-50 text-rose-700"
    : isCompleted
      ? "bg-blue-50 text-blue-700"
      : isPending
        ? "bg-amber-50 text-amber-700"
        : "bg-green-50 text-green-700";

  const handleConfirmCancel = async () => {
    setCancelError(null);
    const result = await cancel.mutateAsync(booking.id);

    if (!result.success) {
      setCancelError(result.error || "Unable to cancel this booking.");
      return;
    }

    setShowCancelModal(false);
    router.replace("/my-bookings?cancelled=1");
    router.refresh();
  };

  const handleReschedule = async () => {
    if (!selectedSlotId) {
      setRescheduleError("Choose a new available day and time.");
      return;
    }

    setRescheduleError(null);
    const result = await reschedule.mutateAsync({
      bookingId: booking.id,
      proposedSlotId: selectedSlotId,
      reason: rescheduleReason,
    });

    if (!result.success) {
      setRescheduleError(result.error || "Unable to send the reschedule request.");
      return;
    }

    setShowRescheduleModal(false);
    setSelectedSlotId("");
    setRescheduleReason("");
    setRescheduleMessage(
      "Reschedule request sent. The new time is reserved while the mentor reviews it."
    );
    router.refresh();
  };

  return (
    <>
      {rescheduleMessage && (
        <div className="mb-3">
          <AutoDismissAlert
            message={rescheduleMessage}
            onDismiss={() => setRescheduleMessage(null)}
          />
        </div>
      )}

      <article className="grid items-center gap-5 border-b border-slate-100 py-5 last:border-b-0 sm:grid-cols-[1.4fr_1fr_auto_auto]">
        <div className="flex min-w-0 items-center gap-4">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${avatarStyle}`}
          >
            {initials}
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-800">
              {resourceName}
            </p>
            <p className="mt-1 truncate text-sm text-slate-500">
              {studyGroup ? "Study group session" : "Mentorship session"}
            </p>
          </div>
        </div>

        <div className="space-y-2 text-sm text-slate-500">
          <p className="flex items-center gap-2">
            <CalendarDays size={15} className="text-slate-400" />
            {formatDate(booking.start_time)}
          </p>
          <p className="flex items-center gap-2">
            <Clock3 size={15} className="text-slate-400" />
            {formatTime(booking.start_time)} – {formatTime(booking.end_time)}
          </p>
        </div>

        <span
          className={`w-fit rounded-full px-3 py-1.5 text-xs font-semibold ${statusClasses}`}
        >
          {statusLabel}
        </span>

        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {isConfirmed && cancellable && booking.resource?.meeting_link && (
            <a
              href={booking.resource.meeting_link}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-primary-200 bg-primary-50 px-3 text-xs font-semibold text-primary-700 hover:bg-primary-100"
            >
              <Video size={14} /> Join
            </a>
          )}

          {canReschedule && (
            <button
              type="button"
              onClick={() => {
                setRescheduleError(null);
                setShowRescheduleModal(true);
              }}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-primary-200 px-3 text-xs font-semibold text-primary-700 hover:bg-primary-50"
            >
              <RefreshCw size={14} /> Reschedule
            </button>
          )}

          {canManage && (
            <button
              type="button"
              onClick={() => {
                setCancelError(null);
                setShowCancelModal(true);
              }}
              className="inline-flex h-9 items-center rounded-lg border border-red-200 px-3 text-xs font-semibold text-red-600 hover:bg-red-50"
            >
              Cancel
            </button>
          )}
        </div>

        {isCancelled && booking.cancelled_by === "mentor" && booking.cancellation_reason && (
          <div className="sm:col-span-4 rounded-lg border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <span className="font-semibold">Mentor cancellation reason:</span>{" "}
            {booking.cancellation_reason}
          </div>
        )}
      </article>

      {showCancelModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-booking-title"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-red-600">
              Booking
            </p>
            <h2 id="cancel-booking-title" className="mt-2 text-xl font-bold text-slate-900">
              Cancel this booking?
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Your current time will be released so another mentee can use it.
            </p>

            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-800">{resourceName}</p>
              <p className="mt-2 text-sm text-slate-600">
                {formatLongDate(booking.start_time)}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {formatTime(booking.start_time)} – {formatTime(booking.end_time)}
              </p>
            </div>

            {cancelError && (
              <div className="mt-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                {cancelError}
              </div>
            )}

            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => !cancel.isPending && setShowCancelModal(false)}
                disabled={cancel.isPending}
                className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Keep booking
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={cancel.isPending}
                className="h-10 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {cancel.isPending ? "Cancelling..." : "Confirm cancel"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showRescheduleModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reschedule-booking-title"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary-700">
              Reschedule
            </p>
            <h2
              id="reschedule-booking-title"
              className="mt-2 text-xl font-bold text-slate-900"
            >
              Request a new time
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              The new slot will be reserved while the mentor reviews your request.
              Your current booking remains in place until the mentor approves.
            </p>

            <div className="mt-5">
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                New day and time
              </label>
              <select
                value={selectedSlotId}
                onChange={(event) => setSelectedSlotId(event.target.value)}
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
              >
                <option value="">Choose an available slot</option>
                {selectableSlots.map((slot) => (
                  <option key={slot.id} value={slot.id}>
                    {formatLongDate(slot.start_time)} · {formatTime(slot.start_time)} –{" "}
                    {formatTime(slot.end_time)}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-4">
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Reason <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <textarea
                rows={3}
                maxLength={300}
                value={rescheduleReason}
                onChange={(event) => setRescheduleReason(event.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
                placeholder="Example: I have a class at the original time."
              />
            </div>

            {rescheduleError && (
              <div className="mt-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                {rescheduleError}
              </div>
            )}

            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={reschedule.isPending}
                onClick={() => {
                  if (!reschedule.isPending) setShowRescheduleModal(false);
                }}
                className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Keep current time
              </button>
              <button
                type="button"
                disabled={reschedule.isPending || !selectedSlotId}
                onClick={handleReschedule}
                className="h-10 rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
              >
                {reschedule.isPending ? "Sending..." : "Send request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
