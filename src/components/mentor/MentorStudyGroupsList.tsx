"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ArrowRight, Plus, UsersRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { saveMentorStudyGroupAction } from "@/lib/study-groups/actions";
import type { StudyGroupRecord } from "@/types/studyGroup";

export default function MentorStudyGroupsList({ groups }: { groups: StudyGroupRecord[] }) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [headline, setHeadline] = useState("");
  const [description, setDescription] = useState("");
  const [skills, setSkills] = useState("");
  const [capacity, setCapacity] = useState(15);
  const [duration, setDuration] = useState(90);
  const [meetingLink, setMeetingLink] = useState("");

  const createGroup = () => {
    setError(null);
    startTransition(async () => {
      const result = await saveMentorStudyGroupAction({
        resourceId: null,
        name,
        headline,
        description,
        skills: skills.split(",").map((value) => value.trim()).filter(Boolean),
        capacity,
        durationMinutes: duration,
        meetingLink,
        timezone: "Africa/Lagos",
        acceptingMembers: true,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      setShowCreate(false);
      setName("");
      setHeadline("");
      setDescription("");
      setSkills("");
      setCapacity(15);
      setDuration(90);
      setMeetingLink("");
      router.refresh();
      if (result.resourceId) router.push(`/mentor/study-groups/${result.resourceId}`);
    });
  };

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-800">Your Study Groups</p>
          <p className="mt-1 text-xs text-slate-400">Create groups, manage members and schedule shared sessions.</p>
        </div>
        <button type="button" onClick={() => { setShowCreate((current) => !current); setError(null); }} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700">
          <Plus size={16} /> Create Study Group
        </button>
      </div>

      {showCreate && (
        <div className="mt-5 rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="font-semibold text-slate-800">New Study Group</h2>
          <p className="mt-1 text-sm text-slate-500">Create the group first, then add shared sessions and manage membership.</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Group name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm" placeholder="Team 4" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Headline</label>
              <input value={headline} onChange={(e) => setHeadline(e.target.value)} className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm" placeholder="BookIt Full Stack Study Group" />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-slate-700">Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="w-full rounded-lg border border-slate-200 px-3 py-3 text-sm" placeholder="What will members learn or build together?" />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-slate-700">Topics</label>
              <input value={skills} onChange={(e) => setSkills(e.target.value)} className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm" placeholder="Next.js, Supabase, Team Project" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Capacity</label>
              <input type="number" min={2} max={200} value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Session duration</label>
              <select value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm">
                {[45, 60, 90, 120].map((value) => <option key={value} value={value}>{value} minutes</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-slate-700">Default meeting link <span className="font-normal text-slate-400">(optional)</span></label>
              <input type="url" value={meetingLink} onChange={(e) => setMeetingLink(e.target.value)} className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm" placeholder="https://meet.google.com/..." />
            </div>
          </div>
          {error && <div className="mt-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" onClick={createGroup} disabled={pending} className="h-10 rounded-lg bg-primary-600 px-5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60">{pending ? "Creating..." : "Create Group"}</button>
            <button type="button" onClick={() => setShowCreate(false)} disabled={pending} className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
          </div>
        </div>
      )}

      {groups.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
          <UsersRound className="mx-auto text-slate-300" size={36} />
          <p className="mt-4 font-semibold text-slate-700">No study groups yet</p>
          <p className="mt-1 text-sm text-slate-400">Create your first study group and invite mentees to join from Resources.</p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {groups.map((group) => (
            <article key={group.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_2px_10px_rgba(15,23,42,0.03)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-semibold text-slate-900">{group.name}</h2>
                  <p className="mt-1 text-sm text-slate-500">{group.headline || "Study Group"}</p>
                </div>
                <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${group.archived_at ? "bg-slate-100 text-slate-600" : group.status === "available" ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>
                  {group.archived_at ? "Archived" : group.status === "available" ? "Open" : "Closed"}
                </span>
              </div>
              <div className="mt-5 flex items-center gap-2 text-sm text-slate-500">
                <UsersRound size={16} className="text-slate-400" />
                <span><strong className="text-slate-700">{group.member_count}</strong> / {group.capacity} members</span>
              </div>
              <Link href={`/mentor/study-groups/${group.id}`} className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg border border-primary-200 bg-primary-50 px-4 text-sm font-semibold text-primary-700 hover:bg-primary-100">
                Manage Group <ArrowRight size={15} />
              </Link>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
