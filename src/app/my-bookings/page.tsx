"use client";

import {
  Suspense,
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import {
  useRouter,
  useSearchParams,
} from "next/navigation";

import {
  ArrowLeft,
  CalendarCheck2,
  Search,
} from "lucide-react";

import {
  useBookings,
} from "@/hooks/useBookings";

import BookingCard from "@/components/booking/BookingCard";

import PageBadge from "@/components/ui/PageBadge";

/* =========================================================
   MAIN CONTENT
========================================================= */

function MyBookingsContent() {
  const router =
    useRouter();

  const searchParams =
    useSearchParams();

  const {
    data: bookings = [],
    isLoading,
    isError,
    refetch,
  } =
    useBookings();

  /* =======================================================
     NOTIFICATION STATES
  ======================================================= */

  const created =
    searchParams.get(
      "created"
    ) === "1";

  const cancelled =
    searchParams.get(
      "cancelled"
    ) === "1";

  /* =======================================================
     REMOVE SUCCESS MESSAGE AFTER 4 SECONDS
  ======================================================= */

  useEffect(() => {
    if (
      !created &&
      !cancelled
    ) {
      return;
    }

    const timer =
      window.setTimeout(
        () => {
          router.replace(
            "/my-bookings",
            {
              scroll: false,
            }
          );
        },
        4000
      );

    return () => {
      window.clearTimeout(
        timer
      );
    };
  }, [
    created,
    cancelled,
    router,
  ]);

  /* =======================================================
     CURRENT TAB
  ======================================================= */

  const [
    tab,
    setTab,
  ] =
    useState<
      "upcoming" |
      "past"
    >(
      "upcoming"
    );

  /* =======================================================
     CURRENT TIME
  ======================================================= */

  const [
    currentTime,
    setCurrentTime,
  ] =
    useState<number | null>(
      null
    );

  /*
    The timer avoids calling setState
    synchronously inside the effect body.
  */

  useEffect(() => {
    const updateCurrentTime =
      () => {
        setCurrentTime(
          new Date().getTime()
        );
      };

    const initialTimer =
      window.setTimeout(
        updateCurrentTime,
        0
      );

    const interval =
      window.setInterval(
        updateCurrentTime,
        60_000
      );

    return () => {
      window.clearTimeout(
        initialTimer
      );

      window.clearInterval(
        interval
      );
    };
  }, []);

  /* =======================================================
     SPLIT BOOKINGS INTO UPCOMING / PAST
  ======================================================= */

  const {
    upcoming,
    past,
  } =
    useMemo(() => {
      /*
        Until currentTime is available,
        pending/confirmed bookings remain in Upcoming.
      */

      const upcomingBookings =
        bookings
          .filter(
            (
              booking
            ) => {
              if (
                booking.status !==
                "confirmed" &&
                booking.status !==
                "pending"
              ) {
                return false;
              }

              if (
                currentTime ===
                null
              ) {
                return true;
              }

              return (
                new Date(
                  booking.end_time
                ).getTime() >=
                currentTime
              );
            }
          )
          .sort(
            (
              a,
              b
            ) =>
              new Date(
                a.start_time
              ).getTime() -
              new Date(
                b.start_time
              ).getTime()
          );

      const pastBookings =
        bookings
          .filter(
            (
              booking
            ) => {
              if (
                booking.status ===
                "cancelled"
              ) {
                return true;
              }

              if (
                currentTime ===
                null
              ) {
                return false;
              }

              return (
                (booking.status ===
                  "confirmed" ||
                  booking.status ===
                  "pending") &&
                new Date(
                  booking.end_time
                ).getTime() <
                  currentTime
              );
            }
          )
          .sort(
            (
              a,
              b
            ) =>
              new Date(
                b.start_time
              ).getTime() -
              new Date(
                a.start_time
              ).getTime()
          );

      return {
        upcoming:
          upcomingBookings,

        past:
          pastBookings,
      };
    }, [
      bookings,
      currentTime,
    ]);

  const visibleBookings =
    tab === "upcoming"
      ? upcoming
      : past;

  /* =======================================================
     PAGE
  ======================================================= */

  return (
    <main className="min-h-screen bg-[#fbfbfd] px-6 py-8 sm:px-8 lg:px-10 lg:py-10">
      <div className="mx-auto max-w-7xl">

        {/* =================================================
            BACK TO DASHBOARD
        ================================================= */}

        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-primary-700"
        >
          <ArrowLeft
            size={17}
          />

          Back to Dashboard
        </Link>

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">

          <div>
            <PageBadge
              label="My Bookings"
            />

            <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-800">
              Manage your sessions
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              View and manage
              your upcoming and
              previous sessions.
            </p>
          </div>

          <Link
            href="/resources"
            className="inline-flex w-fit items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 sm:mt-1"
          >
            <Search
              size={16}
            />

            Find a Session
          </Link>
        </div>

        {/* =================================================
            BOOKING REQUEST SENT MESSAGE
        ================================================= */}

        {created && (
          <div
            role="status"
            className="mt-6 rounded-lg border border-green-100 bg-green-50 px-4 py-3 text-sm font-medium text-green-700"
          >
            Booking request sent.
            The selected time is reserved while
            the mentor reviews your request.
          </div>
        )}

        {/* =================================================
            BOOKING CANCELLED MESSAGE
        ================================================= */}

        {cancelled && (
          <div
            role="status"
            className="mt-6 rounded-lg border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700"
          >
            Booking cancelled.
            The session has been
            moved to Past and the
            slot is available again.
          </div>
        )}

        {/* =================================================
            TABS
        ================================================= */}

        <div className="mt-8 border-b border-slate-200">
          <div className="flex gap-8">

            {/* UPCOMING */}

            <button
              type="button"
              onClick={() =>
                setTab(
                  "upcoming"
                )
              }
              className={`border-b-2 pb-3 text-sm font-semibold transition ${
                tab ===
                "upcoming"
                  ? "border-primary-600 text-primary-700"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              Upcoming (
              {
                upcoming.length
              }
              )
            </button>

            {/* PAST */}

            <button
              type="button"
              onClick={() =>
                setTab(
                  "past"
                )
              }
              className={`border-b-2 pb-3 text-sm font-semibold transition ${
                tab ===
                "past"
                  ? "border-primary-600 text-primary-700"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              Past (
              {
                past.length
              }
              )
            </button>
          </div>
        </div>

        {/* =================================================
            BOOKINGS AREA
        ================================================= */}

        <section className="mt-5">

          {/* ===============================================
              LOADING
          =============================================== */}

          {isLoading && (
            <div className="space-y-3">
              {Array.from({
                length: 3,
              }).map(
                (
                  _,
                  index
                ) => (
                  <div
                    key={
                      index
                    }
                    className="h-24 animate-pulse rounded-xl border border-slate-100 bg-white"
                  />
                )
              )}
            </div>
          )}

          {/* ===============================================
              ERROR
          =============================================== */}

          {isError && (
            <div className="rounded-xl border border-red-100 bg-white px-6 py-14 text-center">

              <p className="text-sm font-medium text-red-600">
                Couldn&apos;t load
                your bookings.
              </p>

              <button
                type="button"
                onClick={() =>
                  refetch()
                }
                className="mt-3 text-sm font-semibold text-primary-700 transition hover:text-primary-800"
              >
                Try again
              </button>
            </div>
          )}

          {/* ===============================================
              EMPTY STATE
          =============================================== */}

          {!isLoading &&
            !isError &&
            visibleBookings.length ===
              0 && (
              <div className="rounded-xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">

                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                  <CalendarCheck2
                    size={26}
                  />
                </div>

                <p className="mt-4 text-base font-semibold text-slate-700">
                  No {tab} bookings
                </p>

                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                  {tab ===
                  "upcoming"
                    ? "Browse resources to book your next mentorship or study-group session."
                    : "Your completed and cancelled sessions will appear here."}
                </p>

                {tab ===
                  "upcoming" && (
                  <Link
                    href="/resources"
                    className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700"
                  >
                    <Search
                      size={16}
                    />

                    Browse Resources
                  </Link>
                )}
              </div>
            )}

          {/* ===============================================
              BOOKING LIST
          =============================================== */}

          {!isLoading &&
            !isError &&
            visibleBookings.length >
              0 && (
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white px-5">

                {visibleBookings.map(
                  (
                    booking,
                    index
                  ) => (
                    <BookingCard
                      key={
                        booking.id
                      }
                      booking={
                        booking
                      }
                      index={
                        index
                      }
                      cancellable={
                        tab ===
                        "upcoming"
                      }
                    />
                  )
                )}
              </div>
            )}
        </section>
      </div>
    </main>
  );
}

/* =========================================================
   PAGE
========================================================= */

export default function MyBookingsPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#fbfbfd] px-6 py-8 sm:px-8 lg:px-10 lg:py-10">
          <div className="mx-auto max-w-7xl">

            <div className="h-5 w-36 animate-pulse rounded-md bg-slate-200" />

            <div className="mt-6 h-7 w-32 animate-pulse rounded-full bg-slate-200" />

            <div className="mt-4 h-9 w-64 animate-pulse rounded-md bg-slate-200" />

            <div className="mt-3 h-5 w-80 max-w-full animate-pulse rounded-md bg-slate-100" />

            <div className="mt-10 space-y-3">

              {Array.from({
                length: 3,
              }).map(
                (
                  _,
                  index
                ) => (
                  <div
                    key={
                      index
                    }
                    className="h-24 animate-pulse rounded-xl border border-slate-100 bg-white"
                  />
                )
              )}
            </div>
          </div>
        </main>
      }
    >
      <MyBookingsContent />
    </Suspense>
  );
}