"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  ArrowLeft,
  CalendarDays,
  Clock3,
} from "lucide-react";

import { useCreateBooking } from "@/hooks/useBookings";
import { useAvailabilitySlot } from "@/hooks/useAvailabilitySlot";
import { useResource } from "@/lib/resources/hooks";

/* =========================================================
   FORMAT DATE
========================================================= */

function formatDate(iso: string) {
  return new Intl.DateTimeFormat(
    "en-US",
    {
      timeZone: "Africa/Lagos",
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }
  ).format(new Date(iso));
}

/* =========================================================
   FORMAT TIME
========================================================= */

function formatTime(iso: string) {
  return new Intl.DateTimeFormat(
    "en-US",
    {
      timeZone: "Africa/Lagos",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }
  ).format(new Date(iso));
}

/* =========================================================
   BOOKING FORM
========================================================= */

export default function BookingForm({
  resourceId,
  slotId,
}: {
  resourceId: string;
  slotId?: string;
}) {
  const router = useRouter();

  const createBooking =
    useCreateBooking();

  /* =======================================================
     RESOURCE
  ======================================================= */

  const {
    data: resource,
    isLoading: resourceLoading,
    isError: resourceError,
    refetch: refetchResource,
  } = useResource(resourceId);

  /* =======================================================
     EXACT SELECTED SLOT
  ======================================================= */

  const {
    data: selectedSlot,
    isLoading: slotLoading,
    isError: slotError,
    refetch: refetchSlot,
  } = useAvailabilitySlot(slotId);

  /* =======================================================
     LOADING
  ======================================================= */

  const isLoading =
    resourceLoading ||
    (Boolean(slotId) &&
      slotLoading);

  /* =======================================================
     RESOURCE STATUS
  ======================================================= */

  const resourceUnavailable =
    resource?.status !==
    "available";

  /* =======================================================
     CHECK SLOT BELONGS TO RESOURCE
  ======================================================= */

  const slotBelongsToResource =
    selectedSlot
      ? selectedSlot.resource_id ===
        resourceId
      : false;

  /* =======================================================
     CHECK SLOT STATUS
  ======================================================= */

  const slotIsAvailable =
    selectedSlot
      ? selectedSlot.status ===
        "available"
      : false;

  /* =======================================================
     CAN CONFIRM

     We intentionally do not use Date.now() here.

     The Supabase booking RPC performs the final
     server-side check that the session has not passed.
  ======================================================= */

  const canConfirm = Boolean(
    slotId &&
      selectedSlot &&
      resource &&
      !resourceUnavailable &&
      slotBelongsToResource &&
      slotIsAvailable
  );

  /* =======================================================
     BOOKING ERROR
  ======================================================= */

  const bookingError =
    createBooking.data &&
    !createBooking.data.success
      ? createBooking.data.error
      : null;

  /* =======================================================
     REQUEST BOOKING
  ======================================================= */

  const handleBooking = () => {
    if (
      !canConfirm ||
      !slotId
    ) {
      return;
    }

    createBooking.mutate(
      {
        resourceId,
        slotId,
      },
      {
        onSuccess: (
          result
        ) => {
          if (!result.success) {
            return;
          }

          router.replace(
            "/my-bookings?created=1"
          );

          router.refresh();
        },
      }
    );
  };

  /* =======================================================
     PAGE
  ======================================================= */

  return (
    <div className="mx-auto max-w-2xl">
      {/* ===================================================
          BACK TO AVAILABILITY
      =================================================== */}

      <Link
        href={`/resources/${resourceId}`}
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-primary-700"
      >
        <ArrowLeft size={16} />

        Back to availability
      </Link>

      {/* ===================================================
          BOOKING CARD
      =================================================== */}

      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_8px_30px_rgba(15,23,42,0.05)] sm:p-8">
        <p className="text-sm font-semibold text-primary-700">
          Request booking
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-800">
          {resource?.name ??
            "Book a session"}
        </h1>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          Review the date and
          time you selected
          before confirming
          your booking.
        </p>

        {/* =================================================
            LOADING
        ================================================= */}

        {isLoading && (
          <div className="mt-7 space-y-3">
            <div className="h-24 animate-pulse rounded-xl bg-slate-100" />

            <div className="h-12 animate-pulse rounded-lg bg-slate-100" />
          </div>
        )}

        {/* =================================================
            LOAD ERROR
        ================================================= */}

        {!isLoading &&
          (resourceError ||
            slotError) && (
            <div className="mt-7 rounded-xl border border-red-100 bg-red-50 p-5">
              <p className="text-sm font-semibold text-red-700">
                We could not load
                this booking
                information.
              </p>

              <p className="mt-1 text-sm text-red-600">
                Please try again.
              </p>

              <button
                type="button"
                onClick={() => {
                  refetchResource();

                  if (slotId) {
                    refetchSlot();
                  }
                }}
                className="mt-3 text-sm font-semibold text-primary-700 hover:text-primary-800"
              >
                Try again
              </button>
            </div>
          )}

        {/* =================================================
            NO SLOT SELECTED
        ================================================= */}

        {!isLoading &&
          !resourceError &&
          !slotError &&
          !slotId && (
            <div className="mt-7 rounded-xl border border-amber-200 bg-amber-50 p-5">
              <p className="text-sm font-semibold text-amber-800">
                No session was
                selected.
              </p>

              <p className="mt-1 text-sm text-amber-700">
                Return to the
                resource page and
                choose a day and
                time.
              </p>

              <Link
                href={`/resources/${resourceId}`}
                className="mt-4 inline-flex rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700"
              >
                Choose a session
              </Link>
            </div>
          )}

        {/* =================================================
            SLOT NOT FOUND
        ================================================= */}

        {!isLoading &&
          !resourceError &&
          !slotError &&
          slotId &&
          !selectedSlot && (
            <div className="mt-7 rounded-xl border border-amber-200 bg-amber-50 p-5">
              <p className="text-sm font-semibold text-amber-800">
                This session could
                not be found.
              </p>

              <p className="mt-1 text-sm text-amber-700">
                Return to
                availability and
                choose another
                session.
              </p>

              <Link
                href={`/resources/${resourceId}`}
                className="mt-4 inline-flex rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700"
              >
                View availability
              </Link>
            </div>
          )}

        {/* =================================================
            SLOT BELONGS TO ANOTHER RESOURCE
        ================================================= */}

        {!isLoading &&
          selectedSlot &&
          !slotBelongsToResource && (
            <div className="mt-7 rounded-xl border border-red-200 bg-red-50 p-5">
              <p className="text-sm font-semibold text-red-700">
                This session does
                not belong to this
                resource.
              </p>

              <p className="mt-1 text-sm text-red-600">
                Please choose a
                valid session.
              </p>

              <Link
                href={`/resources/${resourceId}`}
                className="mt-4 inline-flex rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700"
              >
                Choose another
                session
              </Link>
            </div>
          )}

        {/* =================================================
            SLOT ALREADY BOOKED
        ================================================= */}

        {!isLoading &&
          selectedSlot &&
          slotBelongsToResource &&
          !slotIsAvailable && (
            <div className="mt-7 rounded-xl border border-amber-200 bg-amber-50 p-5">
              <p className="text-sm font-semibold text-amber-800">
                This session is no
                longer available.
              </p>

              <p className="mt-1 text-sm text-amber-700">
                Another user may
                have booked this
                session.
              </p>

              <Link
                href={`/resources/${resourceId}`}
                className="mt-4 inline-flex rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700"
              >
                Choose another
                session
              </Link>
            </div>
          )}

        {/* =================================================
            RESOURCE UNAVAILABLE
        ================================================= */}

        {!isLoading &&
          resource &&
          resourceUnavailable && (
            <div className="mt-7 rounded-xl border border-amber-200 bg-amber-50 p-5">
              <p className="text-sm font-semibold text-amber-800">
                This resource is
                currently
                unavailable for
                booking.
              </p>

              <p className="mt-1 text-sm text-amber-700">
                Please check back
                later.
              </p>
            </div>
          )}

        {/* =================================================
            VALID SESSION
        ================================================= */}

        {!isLoading &&
          selectedSlot &&
          resource &&
          canConfirm && (
            <>
              {/* ===========================================
                  SESSION SUMMARY
              =========================================== */}

              <div className="mt-7 rounded-xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm font-semibold text-slate-800">
                  Selected session
                </p>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {/* DATE */}

                  <div className="flex items-start gap-3">
                    <CalendarDays
                      size={18}
                      className="mt-0.5 shrink-0 text-primary-600"
                    />

                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        Date
                      </p>

                      <p className="mt-1 text-sm font-semibold text-slate-700">
                        {formatDate(
                          selectedSlot.start_time
                        )}
                      </p>
                    </div>
                  </div>

                  {/* TIME */}

                  <div className="flex items-start gap-3">
                    <Clock3
                      size={18}
                      className="mt-0.5 shrink-0 text-primary-600"
                    />

                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        Time
                      </p>

                      <p className="mt-1 text-sm font-semibold text-slate-700">
                        {formatTime(
                          selectedSlot.start_time
                        )}

                        {" - "}

                        {formatTime(
                          selectedSlot.end_time
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                <p className="mt-4 text-xs text-slate-400">
                  Times shown in
                  West Africa Time.
                </p>
              </div>

              {/* ===========================================
                  SERVER BOOKING ERROR
              =========================================== */}

              {bookingError && (
                <div className="mt-5 rounded-lg border border-red-100 bg-red-50 px-4 py-3">
                  <p className="text-sm font-medium text-red-700">
                    {bookingError}
                  </p>
                </div>
              )}

              {/* ===========================================
                  REQUEST ERROR
              =========================================== */}

              {createBooking.isError && (
                <div className="mt-5 rounded-lg border border-red-100 bg-red-50 px-4 py-3">
                  <p className="text-sm font-medium text-red-700">
                    Something went
                    wrong while
                    creating the
                    booking. Please
                    try again.
                  </p>
                </div>
              )}

              {/* ===========================================
                  CONFIRM BUTTON
              =========================================== */}

              <button
                type="button"
                onClick={
                  handleBooking
                }
                disabled={
                  createBooking.isPending
                }
                className="mt-6 flex h-12 w-full items-center justify-center rounded-lg bg-primary-600 px-5 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:cursor-wait disabled:opacity-60"
              >
                {createBooking.isPending
                  ? "Sending request..."
                  : "Send Booking Request"}
              </button>

              <p className="mt-3 text-center text-xs text-slate-400">
                Your selected time is reserved after you send the request.
                The mentor will confirm it manually.
              </p>
            </>
          )}
      </section>
    </div>
  );
}