"use client";

import {
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import {
  ArrowLeft,
  CalendarDays,
  Clock3,
} from "lucide-react";

import {
  useResource,
} from "@/lib/resources/hooks";

import {
  useResourceAvailability,
} from "@/hooks/useResourceAvailability";

import {
  ResourceDetailSkeleton,
} from "./ResourceDetailSkeleton";

import {
  ResourceError,
} from "./ResourceError";

import StudyGroupJoinPanel from "./StudyGroupJoinPanel";

/* =========================================================
   HELPERS
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

function getInitials(
  name: string,
  type?: string | null
) {
  if (
    isStudyGroup(
      name,
      type
    )
  ) {
    const teamMatch =
      name.match(
        /Team\s+(\d+)/i
      );

    if (teamMatch) {
      return `T${teamMatch[1]}`;
    }
  }

  return name
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

function getDateKey(
  iso: string
) {
  const date =
    new Date(iso);

  const parts =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone:
          "Africa/Lagos",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }
    ).formatToParts(
      date
    );

  const year =
    parts.find(
      (part) =>
        part.type ===
        "year"
    )?.value;

  const month =
    parts.find(
      (part) =>
        part.type ===
        "month"
    )?.value;

  const day =
    parts.find(
      (part) =>
        part.type ===
        "day"
    )?.value;

  return `${year}-${month}-${day}`;
}

function formatFullDate(
  iso: string
) {
  return new Intl.DateTimeFormat(
    "en-US",
    {
      timeZone:
        "Africa/Lagos",
      weekday: "long",
      month: "long",
      day: "numeric",
    }
  ).format(
    new Date(iso)
  );
}

function formatShortDate(
  iso: string
) {
  return new Intl.DateTimeFormat(
    "en-US",
    {
      timeZone:
        "Africa/Lagos",
      weekday: "short",
      month: "short",
      day: "numeric",
    }
  ).format(
    new Date(iso)
  );
}

function formatSlotTime(
  iso: string
) {
  return new Intl.DateTimeFormat(
    "en-US",
    {
      timeZone:
        "Africa/Lagos",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }
  ).format(
    new Date(iso)
  );
}

/* =========================================================
   COMPONENT
========================================================= */

export function ResourceDetails({
  id,
}: {
  id: string;
}) {
  const [
    selectedDate,
    setSelectedDate,
  ] = useState("");

  const [
    selectedSlotId,
    setSelectedSlotId,
  ] = useState("");

  /* -------------------------------------------------------
     RESOURCE
  ------------------------------------------------------- */

  const {
    data: resource,
    isLoading,
    isError,
    refetch,
  } = useResource(id);

  /* -------------------------------------------------------
     AVAILABILITY
  ------------------------------------------------------- */

  const {
    data: availability = [],
    isLoading:
      availabilityLoading,
    isError:
      availabilityError,
    refetch:
      refetchAvailability,
  } =
    useResourceAvailability(
      id
    );

  /* -------------------------------------------------------
     GROUP AVAILABLE SLOTS BY DATE
  ------------------------------------------------------- */

  const availableDates =
    useMemo(() => {
      const dates =
        new Map<
          string,
          {
            value: string;
            label: string;
          }
        >();

      availability.forEach(
        (slot) => {
          const key =
            getDateKey(
              slot.start_time
            );

          if (
            !dates.has(key)
          ) {
            dates.set(
              key,
              {
                value:
                  key,

                label:
                  formatShortDate(
                    slot.start_time
                  ),
              }
            );
          }
        }
      );

      return Array.from(
        dates.values()
      );
    }, [availability]);

  /* -------------------------------------------------------
     DEFAULT TO FIRST AVAILABLE DAY
  ------------------------------------------------------- */

  const selectedDateStillExists =
    availableDates.some(
      (date) =>
        date.value ===
        selectedDate
    );

  const activeDate =
    selectedDateStillExists
      ? selectedDate
      : availableDates[0]
          ?.value ?? "";

  /* -------------------------------------------------------
     TIMES FOR SELECTED DAY
  ------------------------------------------------------- */

  const slotsForSelectedDate =
    useMemo(() => {
      if (!activeDate) {
        return [];
      }

      return availability.filter(
        (slot) =>
          getDateKey(
            slot.start_time
          ) === activeDate
      );
    }, [
      availability,
      activeDate,
    ]);

  /* -------------------------------------------------------
     SELECTED SLOT
  ------------------------------------------------------- */

  const selectedSlot =
    availability.find(
      (slot) =>
        slot.id ===
        selectedSlotId
    );

  /* =======================================================
     LOADING
  ======================================================= */

  if (isLoading) {
    return (
      <ResourceDetailSkeleton />
    );
  }

  /* =======================================================
     RESOURCE ERROR
  ======================================================= */

  if (
    isError ||
    !resource
  ) {
    return (
      <ResourceError
        onRetry={() =>
          refetch()
        }
        message="This resource could not be loaded."
      />
    );
  }

  /* =======================================================
     RESOURCE VALUES
  ======================================================= */

  const studyGroup =
    isStudyGroup(
      resource.name,
      resource.type
    );

  const type =
    studyGroup
      ? "Study Group"
      : "Mentor";

  const initials =
    getInitials(
      resource.name,
      resource.type
    );

  const canBook =
    resource.status ===
    "available";

  const sessionDuration =
    resource.duration_minutes ??
    (
      studyGroup
        ? 90
        : 60
    );

  const skills =
    resource.skills
      ?.length
      ? resource.skills
      : studyGroup
        ? [
            "Peer Learning",
            "Projects",
            "Collaboration",
          ]
        : [
            "Mentorship",
            "Projects",
            "Technical Guidance",
          ];

  const statusText =
    resource.status === "available"
      ? studyGroup
        ? "Open for members"
        : "Available for booking"
      : resource.status === "maintenance"
        ? "Temporarily unavailable"
        : studyGroup
          ? "Membership closed"
          : "Currently unavailable";

  /* =======================================================
     PAGE
  ======================================================= */

  return (
    <div>
      {/* BACK BUTTON */}

      <Link
        href="/resources"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-primary-700"
      >
        <ArrowLeft
          size={16}
        />

        Back to Resources
      </Link>

      {/* MAIN RESOURCE CARD */}

      <section className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_2px_12px_rgba(15,23,42,0.03)]">

        {/* =================================================
            RESOURCE INFORMATION
        ================================================= */}

        <div className="grid md:grid-cols-[1.45fr_1fr]">

          {/* LEFT SIDE */}

          <div className="p-6 md:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">

              {/* AVATAR */}

              <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-200 to-orange-400 text-xl font-semibold text-white sm:h-28 sm:w-28">
                {
                  initials
                }
              </div>

              {/* DETAILS */}

              <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-800">
                  {
                    resource.name
                  }
                </h1>

                <p className="mt-1 text-sm font-medium text-primary-700">
                  {type}
                </p>

                {/* STATUS */}

                <span
                  className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                    resource.status ===
                    "available"
                      ? "bg-green-50 text-green-700"
                      : resource.status ===
                          "maintenance"
                        ? "bg-amber-50 text-amber-700"
                        : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {
                    statusText
                  }
                </span>

                {/* DESCRIPTION */}

                <p className="mt-4 max-w-md text-sm leading-6 text-slate-600">
                  {resource.description ||
                    "Practical guidance focused on learning, collaboration and real-world projects."}
                </p>
              </div>
            </div>

            {/* DURATION */}

            <div className="mt-7 text-sm text-slate-600">
              <p className="flex items-center gap-2">

                <Clock3
                  size={16}
                  className="text-slate-400"
                />

                {studyGroup
                  ? `Study sessions usually run for ${sessionDuration} minutes`
                  : `Mentorship sessions are usually ${sessionDuration} minutes`}
              </p>
            </div>
          </div>

          {/* =================================================
              RIGHT SIDE
          ================================================= */}

          <div className="border-t border-slate-200 p-6 md:border-l md:border-t-0 md:p-8">

            <h2 className="text-base font-semibold text-slate-800">
              About
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              {resource.description ||
                "Learn, collaborate and build practical skills through BookIt."}
            </p>

            <h3 className="mt-7 text-sm font-semibold text-slate-800">
              Skills
            </h3>

            <div className="mt-3 flex flex-wrap gap-2">
              {skills.map(
                (skill) => (
                  <span
                    key={
                      skill
                    }
                    className="rounded-md border border-primary-100 bg-primary-50 px-3 py-1.5 text-xs font-semibold text-primary-700"
                  >
                    {
                      skill
                    }
                  </span>
                )
              )}
            </div>
          </div>
        </div>

        {/* =================================================
            BOOKING / STUDY GROUP MEMBERSHIP
        ================================================= */}

        <div className="border-t border-slate-200 p-5 sm:p-6 md:p-8">
          <div className="max-w-3xl">
            {studyGroup ? (
              <>
                <div>
                  <h2 className="text-lg font-semibold text-slate-800">
                    Join this Study Group
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Become a member once, then attend the shared sessions scheduled for the whole group.
                  </p>
                </div>

                <StudyGroupJoinPanel
                  resourceId={resource.id}
                  resourceStatus={resource.status}
                />
              </>
            ) : (
              <>
                <div>
                  <h2 className="text-lg font-semibold text-slate-800">
                    Choose an Available Session
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Select a day and choose a convenient one-hour mentorship session.
                  </p>
                </div>

                {!canBook ? (
                  <div className="mt-5 rounded-lg border border-dashed border-slate-200 px-5 py-6">
                    <p className="text-sm font-medium text-slate-700">
                      Booking is currently unavailable for this resource.
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Check back when the resource status changes to available.
                    </p>
                  </div>
                ) : availabilityLoading ? (
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <div className="h-20 animate-pulse rounded-lg bg-slate-100" />
                    <div className="h-20 animate-pulse rounded-lg bg-slate-100" />
                  </div>
                ) : availabilityError ? (
                  <div className="mt-5 rounded-lg border border-red-100 bg-red-50 px-5 py-5">
                    <p className="text-sm font-medium text-red-700">
                      Availability could not be loaded.
                    </p>
                    <button
                      type="button"
                      onClick={() => refetchAvailability()}
                      className="mt-2 text-sm font-semibold text-primary-700 hover:text-primary-800"
                    >
                      Try again
                    </button>
                  </div>
                ) : availability.length === 0 ? (
                  <div className="mt-5 rounded-lg border border-dashed border-slate-200 px-5 py-6">
                    <p className="text-sm font-medium text-slate-700">
                      No upcoming availability.
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Check back later for new sessions.
                    </p>
                  </div>
                ) : (
                  <div className="mt-6">
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div>
                        <label
                          htmlFor="booking-date"
                          className="mb-2 block text-sm font-semibold text-slate-700"
                        >
                          Choose a day
                        </label>

                        <div className="relative">
                          <CalendarDays
                            size={18}
                            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                          />
                          <select
                            id="booking-date"
                            value={activeDate}
                            onChange={(event) => {
                              setSelectedDate(event.target.value);
                              setSelectedSlotId("");
                            }}
                            className="h-12 w-full appearance-none rounded-lg border border-slate-200 bg-white pl-11 pr-10 text-sm font-medium text-slate-700 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                          >
                            {availableDates.map((date) => (
                              <option key={date.value} value={date.value}>
                                {date.label}
                              </option>
                            ))}
                          </select>
                          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                            ▼
                          </span>
                        </div>
                      </div>

                      <div>
                        <label
                          htmlFor="booking-time"
                          className="mb-2 block text-sm font-semibold text-slate-700"
                        >
                          Choose a time
                        </label>

                        <div className="relative">
                          <Clock3
                            size={18}
                            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                          />
                          <select
                            id="booking-time"
                            value={selectedSlotId}
                            onChange={(event) => setSelectedSlotId(event.target.value)}
                            className="h-12 w-full appearance-none rounded-lg border border-slate-200 bg-white pl-11 pr-10 text-sm font-medium text-slate-700 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                          >
                            <option value="">Select a time</option>
                            {slotsForSelectedDate.map((slot) => (
                              <option key={slot.id} value={slot.id}>
                                {formatSlotTime(slot.start_time)} - {formatSlotTime(slot.end_time)}
                              </option>
                            ))}
                          </select>
                          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                            ▼
                          </span>
                        </div>

                        <p className="mt-2 text-xs text-slate-400">
                          {slotsForSelectedDate.length} {slotsForSelectedDate.length === 1 ? "session" : "sessions"} available on this day.
                        </p>
                      </div>
                    </div>

                    {selectedSlot && (
                      <div className="mt-6 rounded-xl border border-primary-100 bg-primary-50 p-5">
                        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary-600">
                              Selected session
                            </p>
                            <p className="mt-2 font-semibold text-slate-800">
                              {formatFullDate(selectedSlot.start_time)}
                            </p>
                            <p className="mt-1 flex items-center gap-2 text-sm text-slate-600">
                              <Clock3 size={15} className="text-slate-400" />
                              {formatSlotTime(selectedSlot.start_time)}
                              <span>-</span>
                              {formatSlotTime(selectedSlot.end_time)}
                            </p>
                          </div>

                          <Link
                            href={`/book/${resource.id}?slot=${selectedSlot.id}`}
                            className="flex h-11 shrink-0 items-center justify-center rounded-lg bg-primary-600 px-6 text-sm font-semibold text-white transition hover:bg-primary-700"
                          >
                            Continue to Booking
                          </Link>
                        </div>
                      </div>
                    )}

                    {!selectedSlot && (
                      <div className="mt-5 rounded-lg border border-dashed border-slate-200 px-4 py-3">
                        <p className="text-sm text-slate-500">
                          Select an available time to continue.
                        </p>
                      </div>
                    )}

                    <p className="mt-4 text-xs text-slate-400">
                      Times shown in West Africa Time.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
