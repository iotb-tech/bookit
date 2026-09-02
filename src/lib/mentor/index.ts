import { createClient } from "@/lib/supabase/server";
import type {
  MentorAvailabilityPreference,
  MentorProfileRecord,
  MentorResourceRecord,
  MentorSession,
} from "@/types/mentor";
import type { ResourceAvailability } from "@/types/availability";

function normalizeMentorType(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function asMentorResource(row: Record<string, unknown>): MentorResourceRecord {
  return {
    id: String(row.id),
    name: String(row.name ?? "Mentor"),
    headline: typeof row.headline === "string" ? row.headline : null,
    description: typeof row.description === "string" ? row.description : null,
    owner_id: String(row.owner_id ?? ""),
    type: typeof row.type === "string" ? row.type : null,
    skills: Array.isArray(row.skills)
      ? row.skills.filter((item): item is string => typeof item === "string")
      : [],
    duration_minutes: typeof row.duration_minutes === "number" ? row.duration_minutes : 60,
    status:
      row.status === "unavailable" ||
      row.status === "maintenance" ||
      row.status === "available"
        ? row.status
        : "available",
    meeting_link: typeof row.meeting_link === "string" ? row.meeting_link : null,
    timezone: typeof row.timezone === "string" ? row.timezone : "Africa/Lagos",
    next_available_at: typeof row.next_available_at === "string" ? row.next_available_at : null,
    archived_at: typeof row.archived_at === "string" ? row.archived_at : null,
  };
}

function normalizeSessionStatus(value: unknown): MentorSession["status"] {
  if (value === "pending" || value === "cancelled") return value;
  return "confirmed";
}

function toMentorSession(row: Record<string, unknown>): MentorSession {
  return {
    id: String(row.id),
    resource_id: String(row.resource_id),
    user_id: String(row.user_id),
    availability_id: row.availability_id ? String(row.availability_id) : null,
    start_time: String(row.start_time),
    end_time: String(row.end_time),
    status: normalizeSessionStatus(row.status),
    cancelled_by:
      row.cancelled_by === "mentor" || row.cancelled_by === "mentee"
        ? row.cancelled_by
        : null,
    cancellation_reason:
      typeof row.cancellation_reason === "string" ? row.cancellation_reason : null,
    confirmed_at: typeof row.confirmed_at === "string" ? row.confirmed_at : null,
    confirmed_by: typeof row.confirmed_by === "string" ? row.confirmed_by : null,
    reschedule_request_id:
      typeof row.reschedule_request_id === "string" ? row.reschedule_request_id : null,
    proposed_slot_id:
      typeof row.proposed_slot_id === "string" ? row.proposed_slot_id : null,
    proposed_start_time:
      typeof row.proposed_start_time === "string" ? row.proposed_start_time : null,
    proposed_end_time:
      typeof row.proposed_end_time === "string" ? row.proposed_end_time : null,
    reschedule_reason:
      typeof row.reschedule_reason === "string" ? row.reschedule_reason : null,
    created_at: String(row.created_at),
    mentee: {
      full_name:
        typeof row.mentee_full_name === "string" && row.mentee_full_name.trim()
          ? row.mentee_full_name
          : "BookIt Mentee",
      email: typeof row.mentee_email === "string" ? row.mentee_email : null,
    },
  };
}

export async function getMentorContext() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) return null;

  const { data: profileData } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  if (!profileData || profileData.role !== "mentor") return null;

  const profile: MentorProfileRecord = {
    id: String(profileData.id),
    full_name: typeof profileData.full_name === "string" ? profileData.full_name : null,
    email: typeof profileData.email === "string" ? profileData.email : user.email ?? null,
    role: "mentor",
    avatar_url: typeof profileData.avatar_url === "string" ? profileData.avatar_url : null,
  };

  const { data: resourcesData } = await supabase
    .from("resources")
    .select(
      "id, name, headline, description, owner_id, type, skills, duration_minutes, status, meeting_link, timezone, next_available_at, archived_at, created_at"
    )
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true });

  const mentorRow =
    (resourcesData ?? []).find(
      (row) => normalizeMentorType(row.type) === "mentor"
    ) ?? null;

  return {
    user,
    profile,
    resource: mentorRow
      ? asMentorResource(mentorRow as Record<string, unknown>)
      : null,
  };
}

export async function getMentorAvailability(
  resourceId: string
): Promise<ResourceAvailability[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("resource_availability")
    .select("id, resource_id, start_time, end_time, status, created_at")
    .eq("resource_id", resourceId)
    .gte("end_time", new Date().toISOString())
    .order("start_time", { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: String(row.id),
    resource_id: String(row.resource_id),
    start_time: String(row.start_time),
    end_time: String(row.end_time),
    status: String(row.status),
    created_at: String(row.created_at),
  }));
}

export async function getMentorPreference(
  resourceId: string
): Promise<MentorAvailabilityPreference | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("mentor_availability_preferences")
    .select(
      "id, mentor_id, resource_id, days_of_week, start_time, end_time, session_duration_minutes, break_minutes, weeks_ahead, timezone, created_at, updated_at"
    )
    .eq("resource_id", resourceId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: String(data.id),
    mentor_id: String(data.mentor_id),
    resource_id: String(data.resource_id),
    days_of_week: Array.isArray(data.days_of_week)
      ? data.days_of_week.map(Number)
      : [],
    start_time: String(data.start_time),
    end_time: String(data.end_time),
    session_duration_minutes: Number(data.session_duration_minutes),
    break_minutes: Number(data.break_minutes),
    weeks_ahead: Number(data.weeks_ahead),
    timezone: String(data.timezone ?? "Africa/Lagos"),
    created_at: String(data.created_at),
    updated_at: String(data.updated_at),
  };
}

export async function getMentorSessions(
  resourceId: string
): Promise<MentorSession[]> {
  const supabase = await createClient();

  const rpc = await supabase.rpc("mentor_get_sessions", {
    p_resource_id: resourceId,
  });

  if (!rpc.error && Array.isArray(rpc.data)) {
    return rpc.data.map((row) =>
      toMentorSession(row as Record<string, unknown>)
    );
  }

  // Compatibility fallback if the newest migration has not been applied yet.
  const { data: bookingRows, error } = await supabase
    .from("bookings")
    .select(
      "id, resource_id, user_id, availability_id, start_time, end_time, status, cancelled_by, cancellation_reason, created_at"
    )
    .eq("resource_id", resourceId)
    .order("start_time", { ascending: true });

  if (error) throw new Error(error.message);

  const rows = bookingRows ?? [];
  const userIds = Array.from(new Set(rows.map((row) => String(row.user_id))));
  const profiles = new Map<
    string,
    { full_name: string; email: string | null }
  >();

  if (userIds.length) {
    const { data: menteeRows } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", userIds);

    (menteeRows ?? []).forEach((row) => {
      profiles.set(String(row.id), {
        full_name:
          typeof row.full_name === "string" && row.full_name.trim()
            ? row.full_name
            : "BookIt Mentee",
        email: typeof row.email === "string" ? row.email : null,
      });
    });
  }

  return rows.map((row) => {
    const userId = String(row.user_id);
    return {
      ...toMentorSession({
        ...row,
        mentee_full_name: profiles.get(userId)?.full_name ?? "BookIt Mentee",
        mentee_email: profiles.get(userId)?.email ?? null,
      }),
      user_id: userId,
    };
  });
}

export async function getMentorDashboardData() {
  const context = await getMentorContext();

  if (!context || !context.resource) {
    return {
      context,
      sessions: [] as MentorSession[],
      availability: [] as ResourceAvailability[],
      generatedAt: new Date().toISOString(),
    };
  }

  const [sessions, availability] = await Promise.all([
    getMentorSessions(context.resource.id),
    getMentorAvailability(context.resource.id),
  ]);

  return {
    context,
    sessions,
    availability,
    generatedAt: new Date().toISOString(),
  };
}

export async function getMentorSessionBuckets(resourceId: string) {
  const sessions = await getMentorSessions(resourceId);
  const now = Date.now();

  const requests = sessions.filter(
    (session) =>
      session.status === "pending" &&
      new Date(session.end_time).getTime() >= now
  );
  const upcoming = sessions.filter(
    (session) =>
      session.status === "confirmed" &&
      new Date(session.end_time).getTime() >= now
  );
  const past = sessions.filter(
    (session) =>
      (session.status === "confirmed" || session.status === "pending") &&
      new Date(session.end_time).getTime() < now
  );
  const cancelled = sessions.filter((session) => session.status === "cancelled");

  return { requests, upcoming, past, cancelled };
}
