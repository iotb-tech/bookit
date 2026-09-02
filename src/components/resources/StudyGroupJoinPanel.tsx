"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { CheckCircle2, UsersRound } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { joinStudyGroupAction } from "@/lib/study-groups/actions";
import { useStudyGroupSummary } from "@/hooks/useStudyGroupSummary";

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

  const join = () => {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await joinStudyGroupAction(resourceId);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setMessage(result.message ?? "You joined the study group.");
      await queryClient.invalidateQueries({ queryKey: ["study-group-summary", resourceId] });
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
        <p className="text-sm font-medium text-red-700">Study-group membership could not be loaded.</p>
        <button type="button" onClick={() => refetch()} className="mt-2 text-sm font-semibold text-primary-700 hover:text-primary-800">
          Try again
        </button>
      </div>
    );
  }

  const joined = data.membership_status === "active";
  const full = data.member_count >= data.capacity;
  const closed = resourceStatus !== "available";

  return (
    <div className="mt-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Members</p>
          <div className="mt-2 flex items-end gap-2">
            <span className="text-3xl font-bold text-slate-800">{data.member_count}</span>
            <span className="pb-1 text-sm text-slate-500">/ {data.capacity}</span>
          </div>
          <p className="mt-2 flex items-center gap-2 text-sm text-slate-500">
            <UsersRound size={15} className="text-slate-400" />
            {full ? "This group is full." : `${data.capacity - data.member_count} space${data.capacity - data.member_count === 1 ? "" : "s"} remaining.`}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Membership</p>

          {data.is_owner ? (
            <>
              <p className="mt-2 font-semibold text-slate-800">You host this study group.</p>
              <p className="mt-1 text-sm text-slate-500">Manage members and group sessions from the mentor area.</p>
              <Link href={`/mentor/study-groups/${resourceId}`} className="mt-4 inline-flex h-10 items-center justify-center rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700">
                Manage Group
              </Link>
            </>
          ) : joined ? (
            <>
              <p className="mt-2 flex items-center gap-2 font-semibold text-green-700"><CheckCircle2 size={17} /> You are a member</p>
              <p className="mt-1 text-sm text-slate-500">Scheduled sessions for this group are available in My Study Groups.</p>
              <Link href="/my-study-groups" className="mt-4 inline-flex h-10 items-center justify-center rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700">
                My Study Groups
              </Link>
            </>
          ) : (
            <>
              <p className="mt-2 font-semibold text-slate-800">
                {closed ? "Membership is currently closed." : full ? "This study group is full." : "Join this study group"}
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-500">Joining makes you a group member. Shared sessions are then available to every active member.</p>
              <button
                type="button"
                onClick={join}
                disabled={pending || !data.can_join}
                className="mt-4 inline-flex h-10 items-center justify-center rounded-lg bg-primary-600 px-5 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {pending ? "Joining..." : "Join Group"}
              </button>
            </>
          )}
        </div>
      </div>

      {(message || error) && (
        <div className={`mt-4 rounded-lg border px-4 py-3 text-sm ${error ? "border-red-100 bg-red-50 text-red-700" : "border-green-100 bg-green-50 text-green-700"}`}>
          {error ?? message}
        </div>
      )}

      <p className="mt-4 text-xs text-slate-400">Study-group sessions are shared. One member joining does not block the session for other members.</p>
    </div>
  );
}
