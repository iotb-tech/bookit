"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  mentorCancellationSchema,
  mentorProfileSchema,
  mentorSingleAvailabilitySchema,
  mentorWeeklyAvailabilitySchema,
} from "@/schemas/mentorSchema";

export type MentorActionResult =
  | { success: true; message?: string; count?: number; resourceId?: string }
  | { success: false; error: string };

async function requireMentor() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return { error: "Please log in as a mentor." as const, supabase, user: null };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "mentor") return { error: "Mentor access is required." as const, supabase, user: null };

  return { error: null, supabase, user };
}

async function ownsResource(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, resourceId: string) {
  const { data } = await supabase.from("resources").select("id").eq("id", resourceId).eq("owner_id", userId).maybeSingle();
  return Boolean(data);
}

export async function createMentorAvailabilitySlotAction(input: unknown): Promise<MentorActionResult> {
  const parsed = mentorSingleAvailabilitySchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Check the availability details." };

  const auth = await requireMentor();
  if (auth.error || !auth.user) return { success: false, error: auth.error ?? "Mentor access is required." };
  if (!(await ownsResource(auth.supabase, auth.user.id, parsed.data.resourceId))) return { success: false, error: "You can only manage your own mentor resource." };

  const start = new Date(parsed.data.startIso);
  if (start.getTime() <= new Date().getTime()) return { success: false, error: "Availability must start in the future." };

  const { data: conflicts, error: conflictError } = await auth.supabase
    .from("resource_availability")
    .select("id")
    .eq("resource_id", parsed.data.resourceId)
    .lt("start_time", parsed.data.endIso)
    .gt("end_time", parsed.data.startIso)
    .limit(1);

  if (conflictError) return { success: false, error: conflictError.message };
  if ((conflicts ?? []).length > 0) return { success: false, error: "That time overlaps an existing availability slot." };

  const { error } = await auth.supabase.from("resource_availability").insert({
    resource_id: parsed.data.resourceId,
    start_time: parsed.data.startIso,
    end_time: parsed.data.endIso,
    status: "available",
  });

  if (error) return { success: false, error: error.message };

  revalidatePath("/mentor/availability");
  revalidatePath("/mentor/dashboard");
  revalidatePath(`/resources/${parsed.data.resourceId}`);
  return { success: true, message: "Availability added." };
}

export async function generateMentorAvailabilityAction(input: unknown): Promise<MentorActionResult> {
  const parsed = mentorWeeklyAvailabilitySchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Check your weekly availability." };

  const auth = await requireMentor();
  if (auth.error || !auth.user) return { success: false, error: auth.error ?? "Mentor access is required." };
  if (!(await ownsResource(auth.supabase, auth.user.id, parsed.data.resourceId))) return { success: false, error: "You can only manage your own mentor resource." };

  const { data, error } = await auth.supabase.rpc("mentor_generate_availability", {
    p_resource_id: parsed.data.resourceId,
    p_days_of_week: parsed.data.daysOfWeek,
    p_start_time: parsed.data.startTime,
    p_end_time: parsed.data.endTime,
    p_session_duration_minutes: parsed.data.sessionDurationMinutes,
    p_break_minutes: parsed.data.breakMinutes,
    p_weeks_ahead: parsed.data.weeksAhead,
    p_timezone: parsed.data.timezone,
    p_replace_existing: parsed.data.replaceExisting,
  });

  if (error) return { success: false, error: error.message.replace(/_/g, " ") };

  revalidatePath("/mentor/availability");
  revalidatePath("/mentor/dashboard");
  revalidatePath(`/resources/${parsed.data.resourceId}`);
  return { success: true, count: Number(data ?? 0), message: `${Number(data ?? 0)} availability slots created.` };
}

export async function deleteMentorAvailabilitySlotAction(slotId: string): Promise<MentorActionResult> {
  if (!slotId) return { success: false, error: "Slot id is required." };
  const auth = await requireMentor();
  if (auth.error || !auth.user) return { success: false, error: auth.error ?? "Mentor access is required." };

  const { data: slot, error: slotError } = await auth.supabase
    .from("resource_availability")
    .select("id, resource_id, status, start_time")
    .eq("id", slotId)
    .maybeSingle();

  if (slotError || !slot) return { success: false, error: "Availability slot could not be found." };
  if (!(await ownsResource(auth.supabase, auth.user.id, String(slot.resource_id)))) return { success: false, error: "You can only manage your own availability." };
  if (slot.status === "booked") return { success: false, error: "A booked slot cannot be deleted. Cancel the session from Mentor Sessions if needed." };

  const { error } = await auth.supabase.from("resource_availability").delete().eq("id", slotId);
  if (error) return { success: false, error: error.message };

  revalidatePath("/mentor/availability");
  revalidatePath("/mentor/dashboard");
  revalidatePath(`/resources/${slot.resource_id}`);
  return { success: true, message: "Availability removed." };
}

export async function toggleMentorAvailabilityAction(resourceId: string, acceptingBookings: boolean): Promise<MentorActionResult> {
  const auth = await requireMentor();
  if (auth.error || !auth.user) return { success: false, error: auth.error ?? "Mentor access is required." };
  if (!(await ownsResource(auth.supabase, auth.user.id, resourceId))) return { success: false, error: "You can only manage your own mentor resource." };

  const { error } = await auth.supabase
    .from("resources")
    .update({ status: acceptingBookings ? "available" : "unavailable" })
    .eq("id", resourceId)
    .eq("owner_id", auth.user.id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/mentor/dashboard");
  revalidatePath("/mentor/availability");
  revalidatePath("/mentor/profile");
  revalidatePath(`/resources/${resourceId}`);
  revalidatePath("/resources");
  return { success: true, message: acceptingBookings ? "You are accepting new bookings." : "New bookings are paused." };
}

export async function saveMentorProfileAction(input: unknown): Promise<MentorActionResult> {
  const parsed = mentorProfileSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Check your mentor profile." };

  const auth = await requireMentor();
  if (auth.error || !auth.user) return { success: false, error: auth.error ?? "Mentor access is required." };

  const values = parsed.data;

  const { error: profileError } = await auth.supabase
    .from("profiles")
    .update({ full_name: values.fullName, updated_at: new Date().toISOString() })
    .eq("id", auth.user.id);

  if (profileError) return { success: false, error: profileError.message };

  const resourcePayload = {
    name: values.fullName,
    headline: values.headline || null,
    description: values.description || null,
    skills: values.skills,
    duration_minutes: values.durationMinutes,
    meeting_link: values.meetingLink || null,
    timezone: values.timezone,
  };

  let resourceId = values.resourceId ?? null;

  if (resourceId) {
    if (!(await ownsResource(auth.supabase, auth.user.id, resourceId))) return { success: false, error: "You can only edit your own mentor profile." };
    const { error } = await auth.supabase.from("resources").update(resourcePayload).eq("id", resourceId).eq("owner_id", auth.user.id);
    if (error) return { success: false, error: error.message };
  } else {
    const basePayload = {
      ...resourcePayload,
      owner_id: auth.user.id,
      type: "mentor",
      status: "available",
    };

    let insertion = await auth.supabase.from("resources").insert(basePayload).select("id").single();

    // Backward compatibility for older BookIt databases that used display labels in a text column.
    if (insertion.error && /type|mentor/i.test(insertion.error.message)) {
      insertion = await auth.supabase
        .from("resources")
        .insert({ ...basePayload, type: "Mentor" })
        .select("id")
        .single();
    }

    if (insertion.error || !insertion.data) return { success: false, error: insertion.error?.message ?? "Unable to create mentor resource." };
    resourceId = String(insertion.data.id);
  }

  revalidatePath("/mentor/profile");
  revalidatePath("/mentor/dashboard");
  revalidatePath("/resources");
  if (resourceId) revalidatePath(`/resources/${resourceId}`);
  return { success: true, resourceId: resourceId ?? undefined, message: "Mentor profile saved." };
}

export async function mentorCancelBookingAction(input: unknown): Promise<MentorActionResult> {
  const parsed = mentorCancellationSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Check the cancellation details." };

  const auth = await requireMentor();
  if (auth.error || !auth.user) return { success: false, error: auth.error ?? "Mentor access is required." };

  const { data, error } = await auth.supabase.rpc("mentor_cancel_booking", {
    p_booking_id: parsed.data.bookingId,
    p_reason: parsed.data.reason || null,
  });

  if (error || data !== true) return { success: false, error: error?.message.replace(/_/g, " ") ?? "Unable to cancel the session." };

  revalidatePath("/mentor/sessions");
  revalidatePath("/mentor/dashboard");
  revalidatePath("/mentor/availability");
  return { success: true, message: "Session cancelled. The time is now unavailable until you choose to offer it again." };
}

export async function toggleMentorProfileActiveAction(
  resourceId: string,
  active: boolean
): Promise<MentorActionResult> {
  const auth = await requireMentor();
  if (auth.error || !auth.user) {
    return { success: false, error: auth.error ?? "Mentor access is required." };
  }

  if (!(await ownsResource(auth.supabase, auth.user.id, resourceId))) {
    return { success: false, error: "You can only manage your own mentor profile." };
  }

  const { data: resource } = await auth.supabase
    .from("resources")
    .select("id, type")
    .eq("id", resourceId)
    .eq("owner_id", auth.user.id)
    .maybeSingle();

  const normalizedType = String(resource?.type ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  if (!resource || normalizedType !== "mentor") {
    return { success: false, error: "Mentor profile could not be found." };
  }

  const { error } = await auth.supabase
    .from("resources")
    .update({
      archived_at: active ? null : new Date().toISOString(),
      status: active ? "available" : "unavailable",
    })
    .eq("id", resourceId)
    .eq("owner_id", auth.user.id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/mentor/profile");
  revalidatePath("/mentor/dashboard");
  revalidatePath("/resources");
  revalidatePath(`/resources/${resourceId}`);

  return {
    success: true,
    message: active
      ? "Mentor profile reactivated. Mentees can find you again."
      : "Mentor profile deactivated. Your booking history was kept.",
  };
}
