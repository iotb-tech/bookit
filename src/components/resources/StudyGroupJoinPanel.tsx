"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { CheckCircle2, ListOrdered, UsersRound } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import {
  joinStudyGroupAction,
  joinStudyGroupWaitlistAction,
  leaveStudyGroupWaitlistAction,
} from "@/lib/study-groups/actions";
import { useStudyGroupSummary } from "@/hooks/useStudyGroupSummary";
import AutoDismissAlert from "@/components/ui/AutoDismissAlert";

export default function StudyGroupJoinPanel({
  resourceId,
  resourceStatus,
}: {
  resourceId: string;
  resourceStatus: string;
}) {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, refetch } = useStudyGroupSummary(resourceId);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refreshSummary = async () => {
    await queryClient.invalidateQueries({
      queryKey: ["study-group-summary", resourceId],
    });
  };

  const run = (
    task: () => Promise<{ success: boolean; error?: string; message?: string }>
  ) => {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await task();
      if (!result.success) {
        setError(result.error ?? "Something went wrong.");
        return;
      }
      setMessage(result.message ?? "Saved successfully.");
      await refreshSummary();
    });
  };

  if (isLoading) {
    return (
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="h-20 animate-pulse rounded-lg bg-slate-100" />
        <div className="h-20 animate-pulse rounded-lg bg-slate-100" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="mt-5 rounded-lg border border-red-100 bg-red-50 px-5 py-5">
        <p className="text-sm font-medium text-red-700">
          Study-group membership could not be loaded.
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-2 text-sm font-semibold text-primary-700 hover:text-primary-800"
        >
          Try again
        </button>
      </div>
    );
  }

  const joined = data.membership_status === "active";
  const waiting = data.waitlist_status === "waiting";
  const full = data.member_count >= data.capacity;
  const closed = resourceStatus !== "available";

  return (
    <div className="mt-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
            Members
          </p>
          <div className="mt-2 flex items-end gap-2">
            <span className="text-3xl font-bold text-slate-800">
              {data.member_count}
            </span>
            <span className="pb-1 text-sm text-slate-500">/ {data.capacity}</span>
          </div>
          <p className="mt-2 flex items-center gap-2 text-sm text-slate-500">
            <UsersRound size={15} className="text-slate-400" />
            {full
              ? "This group is full."
              : `${data.capacity - data.member_count} space${
                  data.capacity - data.member_count === 1 ? "" : "s"
                } remaining.`}
          </p>
          {data.waitlist_count > 0 && (
            <p className="mt-2 flex items-center gap-2 text-xs text-slate-400">
              <ListOrdered size={14} />
              {data.waitlist_count} waiting for a space
            </p>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
            Membership
          </p>

          {data.is_owner ? (
            <>
              <p className="mt-2 font-semibold text-slate-800">
                You host this study group.
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Manage members and group sessions from the mentor area.
              </p>
              <Link
                href={`/mentor/study-groups/${resourceId}`}
                className="mt-4 inline-flex h-10 items-center justify-center rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700"
              >
                Manage Group
              </Link>
            </>
          ) : joined ? (
            <>
              <p className="mt-2 flex items-center gap-2 font-semibold text-green-700">
                <CheckCircle2 size={17} /> You are a member
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Scheduled sessions for this group are available in My Study Groups.
              </p>
              <Link
                href="/my-study-groups"
                className="mt-4 inline-flex h-10 items-center justify-center rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700"
              >
                My Study Groups
              </Link>
            </>
          ) : waiting ? (
            <>
              <p className="mt-2 font-semibold text-amber-800">
                You are on the waitlist
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                BookIt will automatically add you when a member leaves and a space
                becomes available.
              </p>
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => leaveStudyGroupWaitlistAction(resourceId))}
                className="mt-4 inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 px-5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
              >
                {pending ? "Updating..." : "Leave Waitlist"}
              </button>
            </>
          ) : (
            <>
              <p className="mt-2 font-semibold text-slate-800">
                {closed
                  ? "Membership is currently closed."
                  : full
                    ? "This study group is full."
                    : "Join this study group"}
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Joining makes you a group member. Shared sessions are then
                available to every active member.
              </p>

              {!closed && full ? (
                <button
                  type="button"
                  onClick={() => run(() => joinStudyGroupWaitlistAction(resourceId))}
                  disabled={pending}
                  className="mt-4 inline-flex h-10 items-center justify-center rounded-lg bg-primary-600 px-5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
                >
                  {pending ? "Joining..." : "Join Waitlist"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => run(() => joinStudyGroupAction(resourceId))}
                  disabled={pending || !data.can_join}
                  className="mt-4 inline-flex h-10 items-center justify-center rounded-lg bg-primary-600 px-5 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {pending ? "Joining..." : "Join Group"}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {message && (
        <div className="mt-4">
          <AutoDismissAlert
            message={message}
            onDismiss={() => setMessage(null)}
          />
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <p className="mt-4 text-xs text-slate-400">
        Study-group sessions are shared. One member joining does not block the
        session for other members.
      </p>
    </div>
  );
}
