"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, Save, UserX, Video } from "lucide-react";
import type { MentorProfileRecord, MentorResourceRecord } from "@/types/mentor";
import { saveMentorProfileAction, toggleMentorProfileActiveAction } from "@/lib/mentor/actions";

export default function MentorProfileForm({
  profile,
  resource,
}: {
  profile: MentorProfileRecord;
  resource: MentorResourceRecord | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDeactivate, setShowDeactivate] = useState(false);

  const [fullName, setFullName] = useState(resource?.name || profile.full_name || "");
  const [headline, setHeadline] = useState(resource?.headline || "");
  const [description, setDescription] = useState(resource?.description || "");
  const [skills, setSkills] = useState((resource?.skills ?? []).join(", "));
  const [duration, setDuration] = useState(resource?.duration_minutes ?? 60);
  const [meetingLink, setMeetingLink] = useState(resource?.meeting_link || "");
  const [timezone, setTimezone] = useState(resource?.timezone || "Africa/Lagos");


  const toggleProfile = (active: boolean) => {
    if (!resource) return;
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await toggleMentorProfileActiveAction(resource.id, active);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setShowDeactivate(false);
      setMessage(result.message ?? (active ? "Mentor profile reactivated." : "Mentor profile deactivated."));
      router.refresh();
    });
  };

  const save = () => {
    setMessage(null);
    setError(null);
    const skillList = skills.split(",").map((skill) => skill.trim()).filter(Boolean);

    startTransition(async () => {
      const result = await saveMentorProfileAction({
        resourceId: resource?.id ?? null,
        fullName,
        headline,
        description,
        skills: skillList,
        durationMinutes: duration,
        meetingLink,
        timezone,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      setMessage(result.message ?? "Mentor profile saved.");
      router.refresh();
      if (!resource && result.resourceId) router.replace("/mentor/profile");
    });
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-7">
      {(message || error) && <div className={`mb-5 rounded-lg border px-4 py-3 text-sm ${error ? "border-red-100 bg-red-50 text-red-700" : "border-green-100 bg-green-50 text-green-700"}`}>{error ?? message}</div>}

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-2 block text-sm font-semibold text-slate-700">Mentor name</label>
          <input value={fullName} onChange={(event) => setFullName(event.target.value)} className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm" placeholder="Adewuyi Awwal" />
        </div>

        <div className="sm:col-span-2">
          <label className="mb-2 block text-sm font-semibold text-slate-700">Professional headline</label>
          <input value={headline} onChange={(event) => setHeadline(event.target.value)} className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm" placeholder="Backend Mentor · APIs · Databases" />
          <p className="mt-1.5 text-xs text-slate-400">This appears on your public mentor profile.</p>
        </div>

        <div className="sm:col-span-2">
          <label className="mb-2 block text-sm font-semibold text-slate-700">About you</label>
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={5} className="w-full rounded-lg border border-slate-200 px-3 py-3 text-sm" placeholder="Tell mentees what you can help them with..." />
        </div>

        <div className="sm:col-span-2">
          <label className="mb-2 block text-sm font-semibold text-slate-700">Skills</label>
          <input value={skills} onChange={(event) => setSkills(event.target.value)} className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm" placeholder="Backend Development, APIs, PostgreSQL, Authentication" />
          <p className="mt-1.5 text-xs text-slate-400">Separate skills with commas.</p>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">Default session duration</label>
          <select value={duration} onChange={(event) => setDuration(Number(event.target.value))} className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm">
            {[30, 45, 60, 90, 120].map((minutes) => <option key={minutes} value={minutes}>{minutes} minutes</option>)}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">Timezone</label>
          <select value={timezone} onChange={(event) => setTimezone(event.target.value)} className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm">
            <option value="Africa/Lagos">West Africa Time (Lagos)</option>
            <option value="UTC">UTC</option>
            <option value="Europe/London">London</option>
            <option value="America/New_York">New York</option>
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className="mb-2 block text-sm font-semibold text-slate-700">Meeting link</label>
          <div className="relative">
            <Video size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="url" value={meetingLink} onChange={(event) => setMeetingLink(event.target.value)} className="h-11 w-full rounded-lg border border-slate-200 pl-10 pr-3 text-sm" placeholder="https://meet.google.com/..." />
          </div>
          <p className="mt-1.5 text-xs text-slate-400">This is shown only to users with a confirmed booking and on your mentor session list.</p>
        </div>
      </div>

      <button type="button" onClick={save} disabled={pending} className="mt-6 inline-flex h-11 items-center gap-2 rounded-lg bg-primary-600 px-5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"><Save size={17} /> {pending ? "Saving..." : "Save mentor profile"}</button>

      {resource && (
        <div className="mt-8 border-t border-slate-100 pt-6">
          <h3 className="text-sm font-semibold text-slate-800">Mentor profile status</h3>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
            Deactivating hides your mentor profile from mentees and stops new bookings. Your account, completed sessions, study groups and booking history are kept.
          </p>

          {resource.archived_at ? (
            <button
              type="button"
              onClick={() => toggleProfile(true)}
              disabled={pending}
              className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg border border-primary-200 bg-primary-50 px-4 text-sm font-semibold text-primary-700 hover:bg-primary-100 disabled:opacity-60"
            >
              <RotateCcw size={16} />
              {pending ? "Updating..." : "Reactivate Mentor Profile"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowDeactivate(true)}
              disabled={pending}
              className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg border border-red-200 px-4 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
            >
              <UserX size={16} />
              Deactivate Mentor Profile
            </button>
          )}
        </div>
      )}

      {showDeactivate && resource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4" role="dialog" aria-modal="true" aria-labelledby="deactivate-mentor-title">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-red-600">Mentor profile</p>
            <h2 id="deactivate-mentor-title" className="mt-2 text-xl font-bold text-slate-900">Deactivate your mentor profile?</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Mentees will no longer find or book your mentor profile. Your BookIt account and all historical records will remain.
            </p>
            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setShowDeactivate(false)} disabled={pending} className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">Keep active</button>
              <button type="button" onClick={() => toggleProfile(false)} disabled={pending} className="h-10 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">{pending ? "Deactivating..." : "Deactivate profile"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
