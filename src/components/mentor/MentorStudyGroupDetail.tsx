"use client";

import { useMemo, useState, useTransition } from "react";
import { CalendarDays, Clock3, Mail, RotateCcw, Save, Trash2, UserMinus, UsersRound, Video, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  archiveMentorStudyGroupAction,
  cancelStudyGroupSessionAction,
  createStudyGroupSessionAction,
  removeStudyGroupMemberAction,
  restoreMentorStudyGroupAction,
  saveMentorStudyGroupAction,
} from "@/lib/study-groups/actions";
import type { StudyGroupMember, StudyGroupRecord, StudyGroupSession } from "@/types/studyGroup";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}
function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

export default function MentorStudyGroupDetail({
  group,
  members,
  sessions,
  nowIso,
}: {
  group: StudyGroupRecord;
  members: StudyGroupMember[];
  sessions: StudyGroupSession[];
  nowIso: string;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"overview" | "members" | "sessions">("overview");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<StudyGroupMember | null>(null);
  const [showArchive, setShowArchive] = useState(false);

  const [name, setName] = useState(group.name);
  const [headline, setHeadline] = useState(group.headline ?? "");
  const [description, setDescription] = useState(group.description ?? "");
  const [skills, setSkills] = useState(group.skills.join(", "));
  const [capacity, setCapacity] = useState(group.capacity);
  const [duration, setDuration] = useState(group.duration_minutes ?? 90);
  const [meetingLink, setMeetingLink] = useState(group.meeting_link ?? "");
  const [acceptingMembers, setAcceptingMembers] = useState(group.status === "available");

  const [sessionDate, setSessionDate] = useState("");
  const [sessionStart, setSessionStart] = useState("");
  const [sessionEnd, setSessionEnd] = useState("");
  const [sessionLink, setSessionLink] = useState("");

  const now = new Date(nowIso).getTime();
  const activeMembers = useMemo(() => members.filter((member) => member.status === "active"), [members]);
  const upcoming = useMemo(() => sessions.filter((session) => session.status === "scheduled" && new Date(session.end_time).getTime() >= now), [sessions, now]);
  const history = useMemo(() => sessions.filter((session) => session.status === "cancelled" || new Date(session.end_time).getTime() < now), [sessions, now]);

  const run = (task: () => Promise<{ success: boolean; error?: string; message?: string }>) => {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await task();
      if (!result.success) {
        setError(result.error ?? "Unable to complete that action.");
        return;
      }
      setMessage(result.message ?? "Updated.");
      router.refresh();
    });
  };

  const save = () => run(() => saveMentorStudyGroupAction({
    resourceId: group.id,
    name,
    headline,
    description,
    skills: skills.split(",").map((value) => value.trim()).filter(Boolean),
    capacity,
    durationMinutes: duration,
    meetingLink,
    timezone: group.timezone,
    acceptingMembers,
  }));

  const schedule = () => {
    if (!sessionDate || !sessionStart || !sessionEnd) {
      setError("Choose a date, start time and end time.");
      return;
    }
    const start = new Date(`${sessionDate}T${sessionStart}:00`).toISOString();
    const end = new Date(`${sessionDate}T${sessionEnd}:00`).toISOString();
    run(async () => {
      const result = await createStudyGroupSessionAction({ resourceId: group.id, startIso: start, endIso: end, meetingLink: sessionLink });
      if (result.success) {
        setSessionDate(""); setSessionStart(""); setSessionEnd(""); setSessionLink("");
      }
      return result;
    });
  };

  return (
    <div>
      {(message || error) && <div className={`mb-5 rounded-lg border px-4 py-3 text-sm ${error ? "border-red-100 bg-red-50 text-red-700" : "border-green-100 bg-green-50 text-green-700"}`}>{error ?? message}</div>}

      <div className="border-b border-slate-200">
        <div className="flex flex-wrap gap-7">
          {(["overview", "members", "sessions"] as const).map((value) => (
            <button key={value} type="button" onClick={() => setTab(value)} className={`border-b-2 pb-3 text-sm font-semibold capitalize transition ${tab === value ? "border-primary-600 text-primary-700" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
              {value}{value === "members" ? ` (${activeMembers.length})` : value === "sessions" ? ` (${upcoming.length})` : ""}
            </button>
          ))}
        </div>
      </div>

      {tab === "overview" && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 sm:p-7">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2"><label className="mb-2 block text-sm font-semibold text-slate-700">Group name</label><input value={name} onChange={(e) => setName(e.target.value)} className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm" /></div>
            <div className="sm:col-span-2"><label className="mb-2 block text-sm font-semibold text-slate-700">Headline</label><input value={headline} onChange={(e) => setHeadline(e.target.value)} className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm" /></div>
            <div className="sm:col-span-2"><label className="mb-2 block text-sm font-semibold text-slate-700">Description</label><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="w-full rounded-lg border border-slate-200 px-3 py-3 text-sm" /></div>
            <div className="sm:col-span-2"><label className="mb-2 block text-sm font-semibold text-slate-700">Topics</label><input value={skills} onChange={(e) => setSkills(e.target.value)} className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm" /><p className="mt-1.5 text-xs text-slate-400">Separate topics with commas.</p></div>
            <div><label className="mb-2 block text-sm font-semibold text-slate-700">Capacity</label><input type="number" min={Math.max(2, activeMembers.length)} max={200} value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm" /><p className="mt-1.5 text-xs text-slate-400">Cannot be lower than {activeMembers.length} active members.</p></div>
            <div><label className="mb-2 block text-sm font-semibold text-slate-700">Session duration</label><select value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm">{[45,60,90,120].map((value) => <option key={value} value={value}>{value} minutes</option>)}</select></div>
            <div className="sm:col-span-2"><label className="mb-2 block text-sm font-semibold text-slate-700">Default meeting link</label><input type="url" value={meetingLink} onChange={(e) => setMeetingLink(e.target.value)} className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm" placeholder="https://meet.google.com/..." /></div>
            <label className="sm:col-span-2 flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700"><input type="checkbox" checked={acceptingMembers} onChange={(e) => setAcceptingMembers(e.target.checked)} className="h-4 w-4 accent-primary-600" /> Accepting new members</label>
          </div>
          <button type="button" onClick={save} disabled={pending || Boolean(group.archived_at)} className="mt-6 inline-flex h-11 items-center gap-2 rounded-lg bg-primary-600 px-5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"><Save size={17} /> {pending ? "Saving..." : "Save Group"}</button>

          <div className="mt-8 border-t border-slate-100 pt-6">
            <p className="text-sm font-semibold text-slate-800">Group status</p>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">Archive instead of deleting. Membership and session history stay in the database.</p>
            {group.archived_at ? (
              <button type="button" onClick={() => run(() => restoreMentorStudyGroupAction(group.id))} disabled={pending} className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg border border-primary-200 bg-primary-50 px-4 text-sm font-semibold text-primary-700 hover:bg-primary-100"><RotateCcw size={16} /> Restore Group</button>
            ) : (
              <button type="button" onClick={() => setShowArchive(true)} disabled={pending} className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg border border-red-200 px-4 text-sm font-semibold text-red-600 hover:bg-red-50"><Trash2 size={16} /> Archive Group</button>
            )}
          </div>
        </div>
      )}

      {tab === "members" && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold text-slate-800">Members</h2><p className="mt-1 text-xs text-slate-400">Real names and emails are visible only because you own this group.</p></div><span className="rounded-full bg-primary-50 px-3 py-1.5 text-xs font-semibold text-primary-700">{activeMembers.length} / {group.capacity}</span></div>
          {activeMembers.length === 0 ? <div className="mt-5 rounded-lg border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500"><UsersRound className="mx-auto mb-3 text-slate-300" size={30} />No active members yet.</div> : (
            <div className="mt-5 divide-y divide-slate-100">
              {activeMembers.map((member) => (
                <div key={member.user_id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div><p className="font-semibold text-slate-800">{member.full_name}</p><p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400"><Mail size={13} /> {member.email ?? "Email unavailable"}</p></div>
                  <button type="button" onClick={() => setSelectedMember(member)} className="inline-flex h-9 items-center gap-2 self-start rounded-lg border border-red-200 px-3 text-xs font-semibold text-red-600 hover:bg-red-50"><UserMinus size={14} /> Remove</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "sessions" && (
        <div className="mt-6 space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
            <h2 className="font-semibold text-slate-800">Schedule a Group Session</h2>
            <p className="mt-1 text-sm text-slate-500">One scheduled session is shared by every active member. It does not become “booked” after the first member.</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <div><label className="mb-2 block text-sm font-semibold text-slate-700">Date</label><input type="date" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm" /></div>
              <div><label className="mb-2 block text-sm font-semibold text-slate-700">Start</label><input type="time" value={sessionStart} onChange={(e) => setSessionStart(e.target.value)} className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm" /></div>
              <div><label className="mb-2 block text-sm font-semibold text-slate-700">End</label><input type="time" value={sessionEnd} onChange={(e) => setSessionEnd(e.target.value)} className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm" /></div>
              <div className="sm:col-span-3"><label className="mb-2 block text-sm font-semibold text-slate-700">Meeting link <span className="font-normal text-slate-400">(optional override)</span></label><input type="url" value={sessionLink} onChange={(e) => setSessionLink(e.target.value)} className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm" placeholder={group.meeting_link || "https://meet.google.com/..."} /></div>
            </div>
            <button type="button" onClick={schedule} disabled={pending || Boolean(group.archived_at)} className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"><CalendarDays size={16} /> {pending ? "Saving..." : "Schedule Session"}</button>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
            <h2 className="font-semibold text-slate-800">Upcoming Sessions</h2>
            {upcoming.length === 0 ? <div className="mt-4 rounded-lg border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">No upcoming group sessions.</div> : <div className="mt-4 space-y-3">{upcoming.map((session) => <div key={session.id} className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="flex items-center gap-2 text-sm font-semibold text-slate-700"><CalendarDays size={15} className="text-slate-400" /> {formatDate(session.start_time)}</p><p className="mt-2 flex items-center gap-2 text-sm text-slate-500"><Clock3 size={15} className="text-slate-400" /> {formatTime(session.start_time)} - {formatTime(session.end_time)}</p>{session.meeting_link && <p className="mt-2 flex items-center gap-2 text-xs text-primary-700"><Video size={14} /> Meeting link set</p>}</div><button type="button" onClick={() => run(() => cancelStudyGroupSessionAction(session.id, group.id))} disabled={pending} className="inline-flex h-9 items-center gap-2 self-start rounded-lg border border-red-200 px-3 text-xs font-semibold text-red-600 hover:bg-red-50"><XCircle size={14} /> Cancel session</button></div>)}</div>}
            {history.length > 0 && <div className="mt-6 border-t border-slate-100 pt-5"><p className="text-sm font-semibold text-slate-700">Past / Cancelled</p><div className="mt-3 space-y-2">{history.slice().reverse().slice(0,8).map((session) => <div key={session.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-500"><span>{formatDate(session.start_time)} · {formatTime(session.start_time)}</span><span className="text-xs font-semibold">{session.status === "cancelled" ? "Cancelled" : "Completed"}</span></div>)}</div></div>}
          </div>
        </div>
      )}

      {selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4" role="dialog" aria-modal="true" aria-labelledby="remove-group-member-title"><div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><p className="text-xs font-bold uppercase tracking-[0.16em] text-red-600">Study group member</p><h2 id="remove-group-member-title" className="mt-2 text-xl font-bold text-slate-900">Remove {selectedMember.full_name}?</h2><p className="mt-2 text-sm leading-6 text-slate-500">They will lose access to this group&apos;s private sessions. Their historical membership record will be kept.</p><div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" onClick={() => setSelectedMember(null)} disabled={pending} className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">Keep member</button><button type="button" onClick={() => run(async () => { const result = await removeStudyGroupMemberAction({ resourceId: group.id, userId: selectedMember.user_id }); if (result.success) setSelectedMember(null); return result; })} disabled={pending} className="h-10 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">{pending ? "Removing..." : "Remove member"}</button></div></div></div>
      )}

      {showArchive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4" role="dialog" aria-modal="true" aria-labelledby="archive-study-group-title"><div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><p className="text-xs font-bold uppercase tracking-[0.16em] text-red-600">Archive study group</p><h2 id="archive-study-group-title" className="mt-2 text-xl font-bold text-slate-900">Archive {group.name}?</h2><p className="mt-2 text-sm leading-6 text-slate-500">It will disappear from public Resources and stop accepting members. Members and session history are not deleted.</p><div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" onClick={() => setShowArchive(false)} disabled={pending} className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">Keep group</button><button type="button" onClick={() => run(async () => { const result = await archiveMentorStudyGroupAction(group.id); if (result.success) setShowArchive(false); return result; })} disabled={pending} className="h-10 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">{pending ? "Archiving..." : "Archive group"}</button></div></div></div>
      )}
    </div>
  );
}
