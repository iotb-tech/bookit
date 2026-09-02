"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  studyGroupAttendanceSchema,
  studyGroupMemberActionSchema,
  studyGroupScheduleGenerateSchema,
  studyGroupScheduleSchema,
  studyGroupSchema,
  studyGroupSessionCancellationSchema,
  studyGroupSessionSchema,
} from "@/schemas/studyGroupSchema";

export type StudyGroupActionResult =
  | { success: true; message?: string; resourceId?: string }
  | { success: false; error: string };

function friendlyError(message: string) {
  const normalized = message.replace(/_/g, " ");
  const lookup: Record<string, string> = {
    "STUDY GROUP FULL": "This study group is already full.",
    "STUDY GROUP CLOSED": "This study group is not accepting new members right now.",
    "STUDY GROUP ARCHIVED": "This study group has been archived.",
    "GROUP OWNER IS HOST": "You host this study group, so you do not need to join it as a member.",
    "ACTIVE MEMBERSHIP NOT FOUND": "An active study-group membership could not be found.",
    "RESOURCE NOT OWNED": "You can only manage study groups that you own.",
    "MENTOR REQUIRED": "Mentor access is required.",
    "MENTOR SCHEDULE CONFLICT": "That time conflicts with another one-to-one or study-group session.",
    "CANCELLATION REASON REQUIRED": "Tell members why the session is being cancelled.",
    "WAITLIST ENTRY NOT FOUND": "You are not currently on this study-group waitlist.",
    "SPACE AVAILABLE JOIN GROUP": "A space is available now, so join the study group directly.",
    "ALREADY GROUP MEMBER": "You are already a member of this study group.",
  };
  return lookup[normalized] ?? normalized.charAt(0) + normalized.slice(1).toLowerCase();
}

async function requireUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return { supabase, user: data.user ?? null };
}

async function requireMentor() {
  const { supabase, user } = await requireUser();
  if (!user) return { supabase, user: null, error: "Please log in as a mentor." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "mentor") {
    return { supabase, user: null, error: "Mentor access is required." };
  }

  return { supabase, user, error: null };
}

function revalidateStudyGroup(resourceId?: string) {
  revalidatePath("/resources");
  revalidatePath("/my-study-groups");
  revalidatePath("/mentor/study-groups");
  revalidatePath("/mentor/dashboard");
  if (resourceId) {
    revalidatePath(`/resources/${resourceId}`);
    revalidatePath(`/mentor/study-groups/${resourceId}`);
  }
}

export async function joinStudyGroupAction(resourceId: string): Promise<StudyGroupActionResult> {
  const auth = await requireUser();
  if (!auth.user) return { success: false, error: "Please log in to join this study group." };

  const { data, error } = await auth.supabase.rpc("join_study_group", {
    p_resource_id: resourceId,
  });

  if (error || data !== true) {
    return { success: false, error: friendlyError(error?.message ?? "Unable to join this study group.") };
  }

  revalidateStudyGroup(resourceId);
  return { success: true, message: "You joined the study group." };
}

export async function leaveStudyGroupAction(resourceId: string): Promise<StudyGroupActionResult> {
  const auth = await requireUser();
  if (!auth.user) return { success: false, error: "Please log in first." };

  const { data, error } = await auth.supabase.rpc("leave_study_group", {
    p_resource_id: resourceId,
  });

  if (error || data !== true) {
    return { success: false, error: friendlyError(error?.message ?? "Unable to leave this study group.") };
  }

  revalidateStudyGroup(resourceId);
  return { success: true, message: "You left the study group." };
}

export async function saveMentorStudyGroupAction(input: unknown): Promise<StudyGroupActionResult> {
  const parsed = studyGroupSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Check the study-group details." };
  }

  const auth = await requireMentor();
  if (auth.error || !auth.user) return { success: false, error: auth.error ?? "Mentor access is required." };

  const values = parsed.data;
  const payload = {
    name: values.name,
    headline: values.headline || null,
    description: values.description || null,
    skills: values.skills,
    capacity: values.capacity,
    duration_minutes: values.durationMinutes,
    meeting_link: values.meetingLink || null,
    timezone: values.timezone,
    status: values.acceptingMembers ? "available" : "unavailable",
  };

  let resourceId = values.resourceId ?? null;

  if (resourceId) {
    const { data: resource } = await auth.supabase
      .from("resources")
      .select("id, owner_id, type")
      .eq("id", resourceId)
      .eq("owner_id", auth.user.id)
      .maybeSingle();

    const normalizedType = String(resource?.type ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
    if (!resource || normalizedType !== "study_group") {
      return { success: false, error: "You can only edit your own study groups." };
    }

    const { count } = await auth.supabase
      .from("study_group_members")
      .select("id", { count: "exact", head: true })
      .eq("resource_id", resourceId)
      .eq("status", "active");

    if ((count ?? 0) > values.capacity) {
      return { success: false, error: `Capacity cannot be lower than the current ${count ?? 0} active members.` };
    }

    const { error } = await auth.supabase
      .from("resources")
      .update(payload)
      .eq("id", resourceId)
      .eq("owner_id", auth.user.id);

    if (error) return { success: false, error: error.message };
  } else {
    const basePayload = {
      ...payload,
      owner_id: auth.user.id,
      type: "study_group",
      archived_at: null,
    };

    let insertion = await auth.supabase
      .from("resources")
      .insert(basePayload)
      .select("id")
      .single();

    if (insertion.error && /type|study/i.test(insertion.error.message)) {
      insertion = await auth.supabase
        .from("resources")
        .insert({ ...basePayload, type: "Study Group" })
        .select("id")
        .single();
    }

    if (insertion.error || !insertion.data) {
      return { success: false, error: insertion.error?.message ?? "Unable to create the study group." };
    }

    resourceId = String(insertion.data.id);
  }

  revalidateStudyGroup(resourceId ?? undefined);
  return {
    success: true,
    resourceId: resourceId ?? undefined,
    message: values.resourceId ? "Study group updated." : "Study group created.",
  };
}

export async function archiveMentorStudyGroupAction(resourceId: string): Promise<StudyGroupActionResult> {
  const auth = await requireMentor();
  if (auth.error || !auth.user) return { success: false, error: auth.error ?? "Mentor access is required." };

  const { error } = await auth.supabase
    .from("resources")
    .update({ status: "unavailable", archived_at: new Date().toISOString() })
    .eq("id", resourceId)
    .eq("owner_id", auth.user.id);

  if (error) return { success: false, error: error.message };

  await auth.supabase
    .from("study_group_sessions")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("resource_id", resourceId)
    .eq("status", "scheduled")
    .gte("end_time", new Date().toISOString());

  revalidateStudyGroup(resourceId);
  return { success: true, message: "Study group archived. Future sessions were cancelled, while history and members were kept." };
}

export async function restoreMentorStudyGroupAction(resourceId: string): Promise<StudyGroupActionResult> {
  const auth = await requireMentor();
  if (auth.error || !auth.user) return { success: false, error: auth.error ?? "Mentor access is required." };

  const { error } = await auth.supabase
    .from("resources")
    .update({ archived_at: null, status: "available" })
    .eq("id", resourceId)
    .eq("owner_id", auth.user.id);

  if (error) return { success: false, error: error.message };

  revalidateStudyGroup(resourceId);
  return { success: true, message: "Study group restored and open to members." };
}

export async function createStudyGroupSessionAction(input: unknown): Promise<StudyGroupActionResult> {
  const parsed = studyGroupSessionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Check the session details." };
  }

  const auth = await requireMentor();
  if (auth.error || !auth.user) {
    return { success: false, error: auth.error ?? "Mentor access is required." };
  }

  const { data, error } = await auth.supabase.rpc(
    "mentor_create_study_group_session",
    {
      p_resource_id: parsed.data.resourceId,
      p_start: parsed.data.startIso,
      p_end: parsed.data.endIso,
      p_meeting_link: parsed.data.meetingLink || null,
    }
  );

  if (error || !data) {
    return {
      success: false,
      error: friendlyError(error?.message ?? "Unable to schedule this group session."),
    };
  }

  revalidateStudyGroup(parsed.data.resourceId);
  return { success: true, message: "Group session scheduled for all active members." };
}

export async function cancelStudyGroupSessionAction(input: unknown): Promise<StudyGroupActionResult> {
  const parsed = studyGroupSessionCancellationSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Check the cancellation details." };
  }

  const auth = await requireMentor();
  if (auth.error || !auth.user) {
    return { success: false, error: auth.error ?? "Mentor access is required." };
  }

  const { data, error } = await auth.supabase.rpc(
    "mentor_cancel_study_group_session",
    {
      p_session_id: parsed.data.sessionId,
      p_resource_id: parsed.data.resourceId,
      p_reason: parsed.data.reason,
    }
  );

  if (error || data !== true) {
    return {
      success: false,
      error: friendlyError(error?.message ?? "Unable to cancel this group session."),
    };
  }

  revalidateStudyGroup(parsed.data.resourceId);
  return {
    success: true,
    message: "Group session cancelled. Active members were notified with your reason.",
  };
}

export async function joinStudyGroupWaitlistAction(resourceId: string): Promise<StudyGroupActionResult> {
  const auth = await requireUser();
  if (!auth.user) return { success: false, error: "Please log in first." };

  const { data, error } = await auth.supabase.rpc("join_study_group_waitlist", {
    p_resource_id: resourceId,
  });

  if (error || data !== true) {
    return { success: false, error: friendlyError(error?.message ?? "Unable to join the waitlist.") };
  }

  revalidateStudyGroup(resourceId);
  return { success: true, message: "You joined the study-group waitlist." };
}

export async function leaveStudyGroupWaitlistAction(resourceId: string): Promise<StudyGroupActionResult> {
  const auth = await requireUser();
  if (!auth.user) return { success: false, error: "Please log in first." };

  const { data, error } = await auth.supabase.rpc("leave_study_group_waitlist", {
    p_resource_id: resourceId,
  });

  if (error || data !== true) {
    return { success: false, error: friendlyError(error?.message ?? "Unable to leave the waitlist.") };
  }

  revalidateStudyGroup(resourceId);
  return { success: true, message: "You left the study-group waitlist." };
}

export async function saveStudyGroupScheduleAction(input: unknown): Promise<StudyGroupActionResult> {
  const parsed = studyGroupScheduleSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Check the regular schedule." };
  }

  const auth = await requireMentor();
  if (auth.error || !auth.user) {
    return { success: false, error: auth.error ?? "Mentor access is required." };
  }

  const { data: resource } = await auth.supabase
    .from("resources")
    .select("id")
    .eq("id", parsed.data.resourceId)
    .eq("owner_id", auth.user.id)
    .maybeSingle();

  if (!resource) return { success: false, error: "You can only manage your own study group." };

  const { error: deleteError } = await auth.supabase
    .from("study_group_schedule_preferences")
    .delete()
    .eq("resource_id", parsed.data.resourceId);

  if (deleteError) return { success: false, error: deleteError.message };

  if (parsed.data.entries.length) {
    const { error: insertError } = await auth.supabase
      .from("study_group_schedule_preferences")
      .insert(
        parsed.data.entries.map((entry) => ({
          resource_id: parsed.data.resourceId,
          weekday: entry.weekday,
          start_time: entry.startTime,
          end_time: entry.endTime,
          timezone: parsed.data.timezone,
          active: true,
        }))
      );

    if (insertError) return { success: false, error: insertError.message };
  }

  revalidateStudyGroup(parsed.data.resourceId);
  return { success: true, message: "Regular study-group days and times saved." };
}

export async function generateStudyGroupSessionsAction(input: unknown): Promise<StudyGroupActionResult> {
  const parsed = studyGroupScheduleGenerateSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Choose how many weeks to generate." };
  }

  const auth = await requireMentor();
  if (auth.error || !auth.user) {
    return { success: false, error: auth.error ?? "Mentor access is required." };
  }

  const { data, error } = await auth.supabase.rpc(
    "mentor_generate_study_group_sessions",
    {
      p_resource_id: parsed.data.resourceId,
      p_weeks_ahead: parsed.data.weeksAhead,
    }
  );

  if (error) {
    return { success: false, error: friendlyError(error.message) };
  }

  revalidateStudyGroup(parsed.data.resourceId);
  return {
    success: true,
    message: `${Number(data ?? 0)} group session${Number(data ?? 0) === 1 ? "" : "s"} created. Conflicting times were skipped.`,
  };
}

export async function markStudyGroupAttendanceAction(input: unknown): Promise<StudyGroupActionResult> {
  const parsed = studyGroupAttendanceSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Check the attendance entry." };
  }

  const auth = await requireMentor();
  if (auth.error || !auth.user) {
    return { success: false, error: auth.error ?? "Mentor access is required." };
  }

  const { data, error } = await auth.supabase.rpc(
    "mentor_mark_study_group_attendance",
    {
      p_resource_id: parsed.data.resourceId,
      p_session_id: parsed.data.sessionId,
      p_user_id: parsed.data.userId,
      p_status: parsed.data.status,
    }
  );

  if (error || data !== true) {
    return { success: false, error: friendlyError(error?.message ?? "Unable to save attendance.") };
  }

  revalidateStudyGroup(parsed.data.resourceId);
  return { success: true, message: "Attendance updated." };
}

export async function removeStudyGroupMemberAction(input: unknown): Promise<StudyGroupActionResult> {
  const parsed = studyGroupMemberActionSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "A valid member and study group are required." };

  const auth = await requireMentor();
  if (auth.error || !auth.user) return { success: false, error: auth.error ?? "Mentor access is required." };

  const { data, error } = await auth.supabase.rpc("mentor_remove_study_group_member", {
    p_resource_id: parsed.data.resourceId,
    p_user_id: parsed.data.userId,
  });

  if (error || data !== true) {
    return { success: false, error: friendlyError(error?.message ?? "Unable to remove this member.") };
  }

  revalidateStudyGroup(parsed.data.resourceId);
  return { success: true, message: "Member removed from the study group." };
}
