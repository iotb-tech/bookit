import Link from "next/link";

import {
  ArrowRight,
  Clock3,
} from "lucide-react";

import type {
  Resource,
} from "@/types/resource";

const avatarStyles = [
  "from-amber-200 to-orange-400",
  "from-indigo-200 to-primary-500",
  "from-emerald-200 to-teal-500",
  "from-rose-200 to-pink-500",
];

function getInitials(
  resource: Resource
) {
  if (
    resource.type ===
    "Study Group"
  ) {
    const team =
      resource.name.match(
        /Team\s+(\d+)/i
      );

    if (team) {
      return `T${team[1]}`;
    }
  }

  return resource.name
    .split(" ")
    .filter(Boolean)
    .map(
      (word) =>
        word[0]
    )
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatAvailability(
  value?:
    | string
    | null
) {
  if (!value) {
    return "View available slots";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    ) ||
    date.getTime() <
      Date.now()
  ) {
    return "View available slots";
  }

  return new Intl.DateTimeFormat(
    "en-US",
    {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }
  ).format(date);
}

export function ResourceCard({
  resource,
  index = 0,
}: {
  resource:
    Resource;

  index?: number;
}) {
  const type =
    resource.type ??
    (
      resource.name
        .toLowerCase()
        .includes(
          "group"
        )
        ? "Study Group"
        : "Mentor"
    );

  const initials =
    getInitials(
      resource
    );

  const isAvailable =
    resource.status ===
    "available";

  const availabilityText =
    type === "Study Group"
      ? isAvailable
        ? "Open for members"
        : "Membership closed"
      : !isAvailable
        ? resource.status === "maintenance"
          ? "Temporarily unavailable"
          : "No open slots"
        : formatAvailability(resource.next_available_at);

  return (
    <article className="group flex min-h-[270px] flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-[0_2px_10px_rgba(15,23,42,0.03)] transition hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-md">

      <div className="flex items-start gap-3">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${
            avatarStyles[
              index %
                avatarStyles.length
            ]
          } text-xs font-semibold text-white`}
        >
          {initials}
        </div>

        <div>
          <h2 className="text-base font-semibold text-slate-800">
            {
              resource.name
            }
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            {type}
          </p>
        </div>
      </div>

      <p className="mt-4 line-clamp-2 text-sm leading-6 text-slate-600">
        {resource.description ||
          "Practical learning support through BookIt."}
      </p>

      <div className="mt-auto pt-5">
        <p className="text-xs font-medium text-slate-400">
          {type === "Study Group" ? "Membership" : "Next available"}
        </p>

        <div className="mt-2 flex items-center gap-2 text-sm font-medium text-slate-600">
          <Clock3
            size={15}
            className="text-slate-400"
          />

          {
            availabilityText
          }
        </div>

        <Link
          href={`/resources/${resource.id}`}
          className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-primary-200 bg-primary-50/40 text-sm font-semibold text-primary-700 transition hover:border-primary-300 hover:bg-primary-50"
        >
          {type === "Study Group" ? "Join Group" : "View Availability"}

          <ArrowRight
            size={15}
          />
        </Link>
      </div>
    </article>
  );
}