import { createClient } from "@/lib/supabase/server";
import type {
  MyStudyGroup,
  StudyGroupMember,
  StudyGroupRecord,
  StudyGroupSession,
} from "@/types/studyGroup";

function normalizeType(value: unknown) {
  return String(value ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function toSession(row: Record<string, unknown>): StudyGroupSession {
  return {
    id: String(row.id),
    resource_id: String(row.resource_id),
    start_time: String(row.start_time),
    end_time: String(row.end_time),
    meeting_link: typeof row.meeting_link === "string" ? row.meeting_link : null,
    status: row.status === "cancelled" ? "cancelled" : "scheduled",
    created_by: String(row.created_by ?? ""),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at ?? row.created_at),
  };
}

function toGroup(row: Record<string, unknown>, memberCount = 0): StudyGroupRecord {
  return {
    id: String(row.id),
    name: String(row.name ?? "Study Group"),
    headline: typeof row.headline === "string" ? row.headline : null,
    description: typeof row.description === "string" ? row.description : null,
    owner_id: String(row.owner_id ?? ""),
    type: typeof row.type === "string" ? row.type : null,
    skills: Array.isArray(row.skills) ? row.skills.filter((item): item is string => typeof item === "string") : [],
    duration_minutes: typeof row.duration_minutes === "number" ? row.duration_minutes : 90,
    status: row.status === "unavailable" || row.status === "maintenance" ? row.status : "available",
    meeting_link: typeof row.meeting_link === "string" ? row.meeting_link : null,
    timezone: typeof row.timezone === "string" ? row.timezone : "Africa/Lagos",
    capacity: typeof row.capacity === "number" ? row.capacity : 15,
    archived_at: typeof row.archived_at === "string" ? row.archived_at : null,
    created_at: String(row.created_at),
    member_count: memberCount,
  };
}

async function requireMentor() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "mentor") return null;
  return { supabase, user };
}

export async function getMyStudyGroups(): Promise<MyStudyGroup[]> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return [];

  const { data: memberships, error } = await supabase
    .from("study_group_members")
    .select("id, resource_id, status, joined_at")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("joined_at", { ascending: false });

  if (error) throw new Error(error.message);
  if (!(memberships ?? []).length) return [];

  const ids = (memberships ?? []).map((row) => String(row.resource_id));

  const [{ data: resources, error: resourcesError }, { data: sessions, error: sessionsError }] = await Promise.all([
    supabase
      .from("resources")
      .select("id, name, headline, description, owner_id, type, skills, duration_minutes, status, meeting_link, timezone, capacity, archived_at, created_at")
      .in("id", ids),
    supabase
      .from("study_group_sessions")
      .select("id, resource_id, start_time, end_time, meeting_link, status, created_by, created_at, updated_at")
      .in("resource_id", ids)
      .eq("status", "scheduled")
      .gte("end_time", new Date().toISOString())
      .order("start_time", { ascending: true }),
  ]);

  if (resourcesError) throw new Error(resourcesError.message);
  if (sessionsError) throw new Error(sessionsError.message);

  const resourcesById = new Map((resources ?? []).map((row) => [String(row.id), row as Record<string, unknown>]));
  const sessionsById = new Map<string, StudyGroupSession[]>();
  (sessions ?? []).forEach((row) => {
    const id = String(row.resource_id);
    const list = sessionsById.get(id) ?? [];
    list.push(toSession(row as Record<string, unknown>));
    sessionsById.set(id, list);
  });

  return (memberships ?? []).flatMap((membership) => {
    const resourceId = String(membership.resource_id);
    const resource = resourcesById.get(resourceId);
    if (!resource) return [];
    return [{
      ...toGroup(resource),
      membership_id: String(membership.id),
      membership_status: "active" as const,
      joined_at: String(membership.joined_at),
      upcoming_sessions: sessionsById.get(resourceId) ?? [],
    }];
  });
}

export async function getMentorStudyGroups(): Promise<StudyGroupRecord[]> {
  const auth = await requireMentor();
  if (!auth) return [];

  const { data: resources, error } = await auth.supabase
    .from("resources")
    .select("id, name, headline, description, owner_id, type, skills, duration_minutes, status, meeting_link, timezone, capacity, archived_at, created_at")
    .eq("owner_id", auth.user.id)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  const groups = (resources ?? []).filter((row) => normalizeType(row.type) === "study_group");
  if (!groups.length) return [];

  const ids = groups.map((row) => String(row.id));
  const { data: members, error: memberError } = await auth.supabase
    .from("study_group_members")
    .select("resource_id")
    .in("resource_id", ids)
    .eq("status", "active");

  if (memberError) throw new Error(memberError.message);
  const counts = new Map<string, number>();
  (members ?? []).forEach((row) => {
    const id = String(row.resource_id);
    counts.set(id, (counts.get(id) ?? 0) + 1);
  });

  return groups.map((row) => toGroup(row as Record<string, unknown>, counts.get(String(row.id)) ?? 0));
}

export async function getMentorStudyGroupDetail(resourceId: string) {
  const auth = await requireMentor();
  if (!auth) return null;

  const { data: resource, error } = await auth.supabase
    .from("resources")
    .select("id, name, headline, description, owner_id, type, skills, duration_minutes, status, meeting_link, timezone, capacity, archived_at, created_at")
    .eq("id", resourceId)
    .eq("owner_id", auth.user.id)
    .maybeSingle();

  if (error || !resource || normalizeType(resource.type) !== "study_group") return null;

  const [{ data: memberRows, error: memberError }, { data: sessionRows, error: sessionError }] = await Promise.all([
    auth.supabase.rpc("mentor_get_study_group_members", { p_resource_id: resourceId }),
    auth.supabase
      .from("study_group_sessions")
      .select("id, resource_id, start_time, end_time, meeting_link, status, created_by, created_at, updated_at")
      .eq("resource_id", resourceId)
      .order("start_time", { ascending: true }),
  ]);

  if (memberError) throw new Error(memberError.message);
  if (sessionError) throw new Error(sessionError.message);

  const members: StudyGroupMember[] = (memberRows ?? []).map((row: Record<string, unknown>) => ({
    user_id: String(row.user_id),
    full_name: String(row.full_name ?? "BookIt Mentee"),
    email: typeof row.email === "string" ? row.email : null,
    role: row.role === "leader" ? "leader" : "member",
    status: row.status === "left" || row.status === "removed" ? row.status : "active",
    joined_at: String(row.joined_at),
  }));

  return {
    group: toGroup(resource as Record<string, unknown>, members.filter((member) => member.status === "active").length),
    members,
    sessions: (sessionRows ?? []).map((row) => toSession(row as Record<string, unknown>)),
  };
}
