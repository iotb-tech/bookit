"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  studyGroupMemberActionSchema,
  studyGroupSchema,
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
  if (auth.error || !auth.user) return { success: false, error: auth.error ?? "Mentor access is required." };

  const start = new Date(parsed.data.startIso);
  const end = new Date(parsed.data.endIso);
  if (start.getTime() <= Date.now()) return { success: false, error: "Group sessions must start in the future." };
  if (end.getTime() <= start.getTime()) return { success: false, error: "End time must be after start time." };

  const { data: resource } = await auth.supabase
    .from("resources")
    .select("id, owner_id, type, meeting_link, archived_at")
    .eq("id", parsed.data.resourceId)
    .eq("owner_id", auth.user.id)
    .maybeSingle();

  const normalizedType = String(resource?.type ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (!resource || normalizedType !== "study_group") return { success: false, error: "You can only schedule sessions for your own study groups." };
  if (resource.archived_at) return { success: false, error: "Restore the study group before scheduling a new session." };

  const { data: conflicts, error: conflictError } = await auth.supabase
    .from("study_group_sessions")
    .select("id")
    .eq("resource_id", parsed.data.resourceId)
    .eq("status", "scheduled")
    .lt("start_time", parsed.data.endIso)
    .gt("end_time", parsed.data.startIso)
    .limit(1);

  if (conflictError) return { success: false, error: conflictError.message };
  if ((conflicts ?? []).length) return { success: false, error: "That time overlaps another scheduled group session." };

  const { error } = await auth.supabase.from("study_group_sessions").insert({
    resource_id: parsed.data.resourceId,
    start_time: parsed.data.startIso,
    end_time: parsed.data.endIso,
    meeting_link: parsed.data.meetingLink || resource.meeting_link || null,
    status: "scheduled",
    created_by: auth.user.id,
  });

  if (error) return { success: false, error: error.message };

  revalidateStudyGroup(parsed.data.resourceId);
  return { success: true, message: "Group session scheduled for all active members." };
}

export async function cancelStudyGroupSessionAction(sessionId: string, resourceId: string): Promise<StudyGroupActionResult> {
  const auth = await requireMentor();
  if (auth.error || !auth.user) return { success: false, error: auth.error ?? "Mentor access is required." };

  const { error } = await auth.supabase
    .from("study_group_sessions")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", sessionId)
    .eq("resource_id", resourceId);

  if (error) return { success: false, error: error.message };

  revalidateStudyGroup(resourceId);
  return { success: true, message: "Group session cancelled." };
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
