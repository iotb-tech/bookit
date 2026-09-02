"use client";

import { useMemo, useState, useTransition } from "react";
import {
  CalendarDays,
  Clock3,
  Mail,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  UserMinus,
  UsersRound,
  Video,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";

import {
  archiveMentorStudyGroupAction,
  cancelStudyGroupSessionAction,
  createStudyGroupSessionAction,
  generateStudyGroupSessionsAction,
  markStudyGroupAttendanceAction,
  removeStudyGroupMemberAction,
  restoreMentorStudyGroupAction,
  saveMentorStudyGroupAction,
  saveStudyGroupScheduleAction,
} from "@/lib/study-groups/actions";
import type {
  AttendanceStatus,
  StudyGroupAttendance,
  StudyGroupMember,
  StudyGroupRecord,
  StudyGroupSchedulePreference,
  StudyGroupSession,
} from "@/types/studyGroup";
import AutoDismissAlert from "@/components/ui/AutoDismissAlert";

const DAYS = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 7, label: "Sunday" },
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function shortTime(value: string) {
  return value.slice(0, 5);
}

type ScheduleDraft = {
  key: string;
  weekday: number;
  startTime: string;
  endTime: string;
};

export default function MentorStudyGroupDetail({
  group,
  members,
  sessions,
  schedules,
  attendance,
  nowIso,
}: {
  group: StudyGroupRecord;
  members: StudyGroupMember[];
  sessions: StudyGroupSession[];
  schedules: StudyGroupSchedulePreference[];
  attendance: StudyGroupAttendance[];
  nowIso: string;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<
    "overview" | "members" | "sessions" | "attendance"
  >("overview");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] =
    useState<StudyGroupMember | null>(null);
  const [showArchive, setShowArchive] = useState(false);
  const [cancelSession, setCancelSession] =
    useState<StudyGroupSession | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  const [name, setName] = useState(group.name);
  const [headline, setHeadline] = useState(group.headline ?? "");
  const [description, setDescription] = useState(group.description ?? "");
  const [skills, setSkills] = useState(group.skills.join(", "));
  const [capacity, setCapacity] = useState(group.capacity);
  const [duration, setDuration] = useState(group.duration_minutes ?? 90);
  const [meetingLink, setMeetingLink] = useState(group.meeting_link ?? "");
  const [acceptingMembers, setAcceptingMembers] = useState(
    group.status === "available"
  );

  const [sessionDate, setSessionDate] = useState("");
  const [sessionStart, setSessionStart] = useState("");
  const [sessionEnd, setSessionEnd] = useState("");
  const [sessionLink, setSessionLink] = useState("");

  const [scheduleDrafts, setScheduleDrafts] = useState<ScheduleDraft[]>(
    schedules.map((entry) => ({
      key: entry.id,
      weekday: entry.weekday,
      startTime: shortTime(entry.start_time),
      endTime: shortTime(entry.end_time),
    }))
  );
  const [newDay, setNewDay] = useState(1);
  const [newStart, setNewStart] = useState("18:00");
  const [newEnd, setNewEnd] = useState("19:30");
  const [weeksAhead, setWeeksAhead] = useState(4);

  const now = new Date(nowIso).getTime();
  const activeMembers = useMemo(
    () => members.filter((member) => member.status === "active"),
    [members]
  );
  const upcoming = useMemo(
    () =>
      sessions.filter(
        (session) =>
          session.status === "scheduled" &&
          new Date(session.end_time).getTime() >= now
      ),
    [sessions, now]
  );
  const history = useMemo(
    () =>
      sessions.filter(
        (session) =>
          session.status === "cancelled" ||
          new Date(session.end_time).getTime() < now
      ),
    [sessions, now]
  );
  const completedSessions = useMemo(
    () =>
      sessions.filter(
        (session) =>
          session.status === "scheduled" &&
          new Date(session.end_time).getTime() < now
      ),
    [sessions, now]
  );

  const attendanceMap = useMemo(() => {
    const map = new Map<string, AttendanceStatus>();
    attendance.forEach((item) =>
      map.set(`${item.session_id}:${item.user_id}`, item.status)
    );
    return map;
  }, [attendance]);

  const run = (
    task: () => Promise<{ success: boolean; error?: string; message?: string }>
  ) => {
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

  const save = () =>
    run(() =>
      saveMentorStudyGroupAction({
        resourceId: group.id,
        name,
        headline,
        description,
        skills: skills
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
        capacity,
        durationMinutes: duration,
        meetingLink,
        timezone: group.timezone,
        acceptingMembers,
      })
    );

  const schedule = () => {
    if (!sessionDate || !sessionStart || !sessionEnd) {
      setError("Choose a date, start time and end time.");
      return;
    }

    const start = new Date(`${sessionDate}T${sessionStart}:00`).toISOString();
    const end = new Date(`${sessionDate}T${sessionEnd}:00`).toISOString();

    run(async () => {
      const result = await createStudyGroupSessionAction({
        resourceId: group.id,
        startIso: start,
        endIso: end,
        meetingLink: sessionLink,
      });
      if (result.success) {
        setSessionDate("");
        setSessionStart("");
        setSessionEnd("");
        setSessionLink("");
      }
      return result;
    });
  };

  const addRegularSchedule = () => {
    if (newEnd <= newStart) {
      setError("Regular schedule end time must be after the start time.");
      return;
    }

    const duplicate = scheduleDrafts.some(
      (item) =>
        item.weekday === newDay &&
        item.startTime === newStart &&
        item.endTime === newEnd
    );
    if (duplicate) {
      setError("That regular day and time is already listed.");
      return;
    }

    setError(null);
    setScheduleDrafts((current) => [
      ...current,
      {
        key: `${newDay}-${newStart}-${newEnd}-${Date.now()}`,
        weekday: newDay,
        startTime: newStart,
        endTime: newEnd,
      },
    ]);
  };

  const saveRegularSchedule = () =>
    run(() =>
      saveStudyGroupScheduleAction({
        resourceId: group.id,
        timezone: group.timezone || "Africa/Lagos",
        entries: scheduleDrafts.map(({ weekday, startTime, endTime }) => ({
          weekday,
          startTime,
          endTime,
        })),
      })
    );


  const generateRegularSessions = () =>
    run(async () => {
      const saved = await saveStudyGroupScheduleAction({
        resourceId: group.id,
        timezone: group.timezone || "Africa/Lagos",
        entries: scheduleDrafts.map(({ weekday, startTime, endTime }) => ({
          weekday,
          startTime,
          endTime,
        })),
      });

      if (!saved.success) return saved;

      return generateStudyGroupSessionsAction({
        resourceId: group.id,
        weeksAhead,
      });
    });

  const cancelSelectedSession = () => {
    if (!cancelSession) return;
    if (cancelReason.trim().length < 3) {
      setError("Tell members why the session is being cancelled.");
      return;
    }

    run(async () => {
      const result = await cancelStudyGroupSessionAction({
        sessionId: cancelSession.id,
        resourceId: group.id,
        reason: cancelReason.trim(),
      });
      if (result.success) {
        setCancelSession(null);
        setCancelReason("");
      }
      return result;
    });
  };

  return (
    <div>
      {message && (
        <div className="mb-5">
          <AutoDismissAlert
            message={message}
            onDismiss={() => setMessage(null)}
          />
        </div>
      )}
      {error && !cancelSession && (
        <div className="mb-5 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="border-b border-slate-200">
        <div className="flex flex-wrap gap-7">
          {(["overview", "members", "sessions", "attendance"] as const).map(
            (value) => (
              <button
                key={value}
                type="button"
                onClick={() => setTab(value)}
                className={`border-b-2 pb-3 text-sm font-semibold capitalize transition ${
                  tab === value
                    ? "border-primary-600 text-primary-700"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                {value}
                {value === "members"
                  ? ` (${activeMembers.length})`
                  : value === "sessions"
                    ? ` (${upcoming.length})`
                    : ""}
              </button>
            )
          )}
        </div>
      </div>

      {tab === "overview" && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 sm:p-7">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Group name
              </label>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Headline
              </label>
              <input
                value={headline}
                onChange={(event) => setHeadline(event.target.value)}
                className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Description
              </label>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={4}
                className="w-full rounded-lg border border-slate-200 px-3 py-3 text-sm"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Topics
              </label>
              <input
                value={skills}
                onChange={(event) => setSkills(event.target.value)}
                className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm"
              />
              <p className="mt-1.5 text-xs text-slate-400">
                Separate topics with commas.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Capacity
              </label>
              <input
                type="number"
                min={Math.max(2, activeMembers.length)}
                max={200}
                value={capacity}
                onChange={(event) => setCapacity(Number(event.target.value))}
                className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm"
              />
              <p className="mt-1.5 text-xs text-slate-400">
                Cannot be lower than {activeMembers.length} active members.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Default session duration
              </label>
              <select
                value={duration}
                onChange={(event) => setDuration(Number(event.target.value))}
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
              >
                {[45, 60, 90, 120].map((value) => (
                  <option key={value} value={value}>
                    {value} minutes
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Default meeting link
              </label>
              <input
                type="url"
                value={meetingLink}
                onChange={(event) => setMeetingLink(event.target.value)}
                className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm"
                placeholder="https://meet.google.com/..."
              />
            </div>

            <label className="sm:col-span-2 flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={acceptingMembers}
                onChange={(event) => setAcceptingMembers(event.target.checked)}
                className="h-4 w-4 accent-primary-600"
              />
              Accepting new members
            </label>
          </div>

          <button
            type="button"
            onClick={save}
            disabled={pending || Boolean(group.archived_at)}
            className="mt-6 inline-flex h-11 items-center gap-2 rounded-lg bg-primary-600 px-5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
          >
            <Save size={17} /> {pending ? "Saving..." : "Save Group"}
          </button>

          <div className="mt-8 border-t border-slate-100 pt-6">
            <p className="text-sm font-semibold text-slate-800">Group status</p>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
              Archive instead of deleting. Membership and session history stay in
              the database.
            </p>
            {group.archived_at ? (
              <button
                type="button"
                onClick={() => run(() => restoreMentorStudyGroupAction(group.id))}
                disabled={pending}
                className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg border border-primary-200 bg-primary-50 px-4 text-sm font-semibold text-primary-700 hover:bg-primary-100"
              >
                <RotateCcw size={16} /> Restore Group
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowArchive(true)}
                disabled={pending}
                className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg border border-red-200 px-4 text-sm font-semibold text-red-600 hover:bg-red-50"
              >
                <Trash2 size={16} /> Archive Group
              </button>
            )}
          </div>
        </div>
      )}

      {tab === "members" && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-slate-800">Members</h2>
              <p className="mt-1 text-xs text-slate-400">
                Real names and emails are visible only because you own this group.
              </p>
            </div>
            <span className="rounded-full bg-primary-50 px-3 py-1.5 text-xs font-semibold text-primary-700">
              {activeMembers.length} / {group.capacity}
            </span>
          </div>

          {activeMembers.length === 0 ? (
            <div className="mt-5 rounded-lg border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
              <UsersRound className="mx-auto mb-3 text-slate-300" size={30} />
              No active members yet.
            </div>
          ) : (
            <div className="mt-5 divide-y divide-slate-100">
              {activeMembers.map((member) => (
                <div
                  key={member.user_id}
                  className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-semibold text-slate-800">
                      {member.full_name}
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                      <Mail size={13} /> {member.email ?? "Email unavailable"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedMember(member)}
                    className="inline-flex h-9 items-center gap-2 self-start rounded-lg border border-red-200 px-3 text-xs font-semibold text-red-600 hover:bg-red-50"
                  >
                    <UserMinus size={14} /> Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "sessions" && (
        <div className="mt-6 space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
            <h2 className="font-semibold text-slate-800">
              Regular Study Group Days & Times
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Save when this group normally meets, then generate shared sessions
              for the next few weeks.
            </p>

            {scheduleDrafts.length > 0 && (
              <div className="mt-5 divide-y divide-slate-100 rounded-lg border border-slate-200">
                {scheduleDrafts.map((entry) => (
                  <div
                    key={entry.key}
                    className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <p className="text-sm font-medium text-slate-700">
                      {DAYS.find((day) => day.value === entry.weekday)?.label} ·{" "}
                      {entry.startTime} – {entry.endTime}
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        setScheduleDrafts((current) =>
                          current.filter((item) => item.key !== entry.key)
                        )
                      }
                      className="inline-flex h-8 items-center gap-1.5 self-start text-xs font-semibold text-red-600"
                    >
                      <Trash2 size={13} /> Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Day
                </label>
                <select
                  value={newDay}
                  onChange={(event) => setNewDay(Number(event.target.value))}
                  className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                >
                  {DAYS.map((day) => (
                    <option key={day.value} value={day.value}>
                      {day.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Start
                </label>
                <input
                  type="time"
                  value={newStart}
                  onChange={(event) => setNewStart(event.target.value)}
                  className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  End
                </label>
                <input
                  type="time"
                  value={newEnd}
                  onChange={(event) => setNewEnd(event.target.value)}
                  className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm"
                />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={addRegularSchedule}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-primary-200 bg-primary-50 px-4 text-sm font-semibold text-primary-700 hover:bg-primary-100"
              >
                <Plus size={15} /> Add Day & Time
              </button>
              <button
                type="button"
                disabled={pending || Boolean(group.archived_at)}
                onClick={saveRegularSchedule}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
              >
                <Save size={15} /> Save Regular Schedule
              </button>
            </div>

            <div className="mt-5 flex flex-wrap items-end gap-3 border-t border-slate-100 pt-5">
              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-600">
                  Generate sessions for
                </label>
                <select
                  value={weeksAhead}
                  onChange={(event) => setWeeksAhead(Number(event.target.value))}
                  className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"
                >
                  {[1, 2, 3, 4, 6, 8, 12].map((weeks) => (
                    <option key={weeks} value={weeks}>
                      {weeks} week{weeks === 1 ? "" : "s"}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                disabled={pending || scheduleDrafts.length === 0}
                onClick={generateRegularSessions}
                className="h-10 rounded-lg border border-primary-200 px-4 text-sm font-semibold text-primary-700 hover:bg-primary-50 disabled:opacity-60"
              >
                Generate Sessions
              </button>
            </div>

            <p className="mt-3 text-xs leading-5 text-slate-400">
              BookIt checks the mentor&apos;s one-to-one and other group sessions.
              Conflicting times are not created.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
            <h2 className="font-semibold text-slate-800">
              Schedule One Group Session
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Use this for a one-off session outside the regular group schedule.
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Date
                </label>
                <input
                  type="date"
                  value={sessionDate}
                  onChange={(event) => setSessionDate(event.target.value)}
                  className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Start
                </label>
                <input
                  type="time"
                  value={sessionStart}
                  onChange={(event) => setSessionStart(event.target.value)}
                  className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  End
                </label>
                <input
                  type="time"
                  value={sessionEnd}
                  onChange={(event) => setSessionEnd(event.target.value)}
                  className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm"
                />
              </div>
              <div className="sm:col-span-3">
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Meeting link{" "}
                  <span className="font-normal text-slate-400">
                    (optional override)
                  </span>
                </label>
                <input
                  type="url"
                  value={sessionLink}
                  onChange={(event) => setSessionLink(event.target.value)}
                  className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm"
                  placeholder={group.meeting_link || "https://meet.google.com/..."}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={schedule}
              disabled={pending || Boolean(group.archived_at)}
              className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
            >
              <CalendarDays size={16} />
              {pending ? "Saving..." : "Schedule Session"}
            </button>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
            <h2 className="font-semibold text-slate-800">Upcoming Sessions</h2>

            {upcoming.length === 0 ? (
              <div className="mt-4 rounded-lg border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                No upcoming group sessions.
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {upcoming.map((session) => (
                  <div
                    key={session.id}
                    className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <CalendarDays size={15} className="text-slate-400" />
                        {formatDate(session.start_time)}
                      </p>
                      <p className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                        <Clock3 size={15} className="text-slate-400" />
                        {formatTime(session.start_time)} -{" "}
                        {formatTime(session.end_time)}
                      </p>
                      {session.meeting_link && (
                        <p className="mt-2 flex items-center gap-2 text-xs text-primary-700">
                          <Video size={14} /> Meeting link set
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setCancelReason("");
                        setCancelSession(session);
                      }}
                      disabled={pending}
                      className="inline-flex h-9 items-center gap-2 self-start rounded-lg border border-red-200 px-3 text-xs font-semibold text-red-600 hover:bg-red-50"
                    >
                      <XCircle size={14} /> Cancel session
                    </button>
                  </div>
                ))}
              </div>
            )}

            {history.length > 0 && (
              <div className="mt-6 border-t border-slate-100 pt-5">
                <p className="text-sm font-semibold text-slate-700">
                  Past / Cancelled
                </p>
                <div className="mt-3 space-y-2">
                  {history
                    .slice()
                    .reverse()
                    .slice(0, 8)
                    .map((session) => (
                      <div
                        key={session.id}
                        className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-500"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span>
                            {formatDate(session.start_time)} ·{" "}
                            {formatTime(session.start_time)}
                          </span>
                          <span className="text-xs font-semibold">
                            {session.status === "cancelled"
                              ? "Cancelled"
                              : "Completed"}
                          </span>
                        </div>
                        {session.cancellation_reason && (
                          <p className="mt-2 text-xs text-rose-600">
                            Reason: {session.cancellation_reason}
                          </p>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "attendance" && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="font-semibold text-slate-800">Session Attendance</h2>
          <p className="mt-1 text-sm text-slate-500">
            Mark attendance after a shared study-group session has ended.
          </p>

          {completedSessions.length === 0 ? (
            <div className="mt-5 rounded-lg border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
              Completed group sessions will appear here for attendance.
            </div>
          ) : (
            <div className="mt-5 space-y-5">
              {completedSessions
                .slice()
                .reverse()
                .map((session) => (
                  <div
                    key={session.id}
                    className="rounded-xl border border-slate-200 p-4"
                  >
                    <p className="font-semibold text-slate-800">
                      {formatDate(session.start_time)}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {formatTime(session.start_time)} - {formatTime(session.end_time)}
                    </p>

                    <div className="mt-4 divide-y divide-slate-100">
                      {activeMembers.map((member) => {
                        const current =
                          attendanceMap.get(`${session.id}:${member.user_id}`) ??
                          null;

                        return (
                          <div
                            key={member.user_id}
                            className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div>
                              <p className="text-sm font-semibold text-slate-700">
                                {member.full_name}
                              </p>
                              <p className="mt-1 text-xs text-slate-400">
                                {member.email ?? "Email unavailable"}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {(
                                [
                                  ["present", "Present"],
                                  ["absent", "Absent"],
                                  ["excused", "Excused"],
                                ] as const
                              ).map(([status, label]) => (
                                <button
                                  key={status}
                                  type="button"
                                  disabled={pending}
                                  onClick={() =>
                                    run(() =>
                                      markStudyGroupAttendanceAction({
                                        resourceId: group.id,
                                        sessionId: session.id,
                                        userId: member.user_id,
                                        status,
                                      })
                                    )
                                  }
                                  className={`h-8 rounded-lg border px-3 text-xs font-semibold ${
                                    current === status
                                      ? "border-primary-200 bg-primary-50 text-primary-700"
                                      : "border-slate-200 text-slate-500 hover:bg-slate-50"
                                  }`}
                                >
                                  {label}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {selectedMember && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="remove-group-member-title"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-red-600">
              Study group member
            </p>
            <h2
              id="remove-group-member-title"
              className="mt-2 text-xl font-bold text-slate-900"
            >
              Remove {selectedMember.full_name}?
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              They will lose access to this group&apos;s private sessions. If the
              group is full, the first waiting user can be promoted automatically.
            </p>
            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setSelectedMember(null)}
                disabled={pending}
                className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Keep member
              </button>
              <button
                type="button"
                onClick={() =>
                  run(async () => {
                    const result = await removeStudyGroupMemberAction({
                      resourceId: group.id,
                      userId: selectedMember.user_id,
                    });
                    if (result.success) setSelectedMember(null);
                    return result;
                  })
                }
                disabled={pending}
                className="h-10 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {pending ? "Removing..." : "Remove member"}
              </button>
            </div>
          </div>
        </div>
      )}

      {cancelSession && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-group-session-title"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-red-600">
              Group session
            </p>
            <h2
              id="cancel-group-session-title"
              className="mt-2 text-xl font-bold text-slate-900"
            >
              Cancel this group session?
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Every active member will receive the cancellation reason in
              Notifications.
            </p>

            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-800">
                {formatDate(cancelSession.start_time)}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {formatTime(cancelSession.start_time)} -{" "}
                {formatTime(cancelSession.end_time)}
              </p>
            </div>

            <div className="mt-4">
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={cancelReason}
                onChange={(event) => setCancelReason(event.target.value)}
                rows={3}
                maxLength={300}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
                placeholder="Example: I will be unavailable at this time."
              />
            </div>

            {error && (
              <div className="mt-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  setCancelSession(null);
                  setCancelReason("");
                  setError(null);
                }}
                className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Keep session
              </button>
              <button
                type="button"
                disabled={pending || cancelReason.trim().length < 3}
                onClick={cancelSelectedSession}
                className="h-10 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {pending ? "Cancelling..." : "Cancel session"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showArchive && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="archive-study-group-title"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-red-600">
              Archive study group
            </p>
            <h2
              id="archive-study-group-title"
              className="mt-2 text-xl font-bold text-slate-900"
            >
              Archive {group.name}?
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              It will disappear from public Resources and stop accepting members.
              Members and session history are not deleted.
            </p>
            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowArchive(false)}
                disabled={pending}
                className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Keep group
              </button>
              <button
                type="button"
                onClick={() =>
                  run(async () => {
                    const result = await archiveMentorStudyGroupAction(group.id);
                    if (result.success) setShowArchive(false);
                    return result;
                  })
                }
                disabled={pending}
                className="h-10 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {pending ? "Archiving..." : "Archive group"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
