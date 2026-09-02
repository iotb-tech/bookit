import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Resource,
  ResourceType,
} from "@/types/resource";

const RESOURCE_FIELDS =
  "id, name, headline, description, owner_id, created_at, type, skills, duration_minutes, status, timezone, next_available_at, capacity, archived_at";

const BASE_RESOURCE_FIELDS =
  "id, name, description, owner_id, created_at";

function normalizeResourceType(
  value: unknown
): ResourceType | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  if (normalized === "mentor") {
    return "Mentor";
  }

  if (
    normalized === "study_group" ||
    normalized === "studygroup"
  ) {
    return "Study Group";
  }

  return null;
}

function normalizeResource(
  row: Record<string, unknown>
): Resource {
  return {
    id: String(row.id),
    name: String(row.name ?? "Untitled resource"),
    headline:
      typeof row.headline === "string"
        ? row.headline
        : null,
    description:
      typeof row.description === "string"
        ? row.description
        : null,
    owner_id: String(row.owner_id ?? ""),
    created_at: String(
      row.created_at ?? new Date(0).toISOString()
    ),
    type: normalizeResourceType(row.type),
    skills: Array.isArray(row.skills)
      ? row.skills.filter(
          (item): item is string => typeof item === "string"
        )
      : [],
    duration_minutes:
      typeof row.duration_minutes === "number"
        ? row.duration_minutes
        : 60,
    status:
      row.status === "unavailable" ||
      row.status === "maintenance" ||
      row.status === "available"
        ? row.status
        : "available",
    timezone:
      typeof row.timezone === "string"
        ? row.timezone
        : "Africa/Lagos",
    next_available_at:
      typeof row.next_available_at === "string"
        ? row.next_available_at
        : null,
    capacity:
      typeof row.capacity === "number"
        ? row.capacity
        : null,
    archived_at:
      typeof row.archived_at === "string"
        ? row.archived_at
        : null,
  };
}

export async function getResources(
  supabase: SupabaseClient
): Promise<Resource[]> {
  const enhanced = await supabase
    .from("resources")
    .select(RESOURCE_FIELDS)
    .is("archived_at", null)
    .order("name", { ascending: true });

  if (!enhanced.error) {
    return (enhanced.data ?? []).map((row) =>
      normalizeResource(row as Record<string, unknown>)
    );
  }

  const base = await supabase
    .from("resources")
    .select(BASE_RESOURCE_FIELDS)
    .order("name", { ascending: true });

  if (base.error) {
    throw new Error(
      `Failed to fetch resources: ${base.error.message}`
    );
  }

  return (base.data ?? []).map((row) =>
    normalizeResource(row as Record<string, unknown>)
  );
}

export async function getResourceById(
  supabase: SupabaseClient,
  id: string
): Promise<Resource | null> {
  const enhanced = await supabase
    .from("resources")
    .select(RESOURCE_FIELDS)
    .eq("id", id)
    .is("archived_at", null)
    .maybeSingle();

  if (!enhanced.error) {
    return enhanced.data
      ? normalizeResource(
          enhanced.data as Record<string, unknown>
        )
      : null;
  }

  const base = await supabase
    .from("resources")
    .select(BASE_RESOURCE_FIELDS)
    .eq("id", id)
    .maybeSingle();

  if (base.error) {
    throw new Error(
      `Failed to fetch resource: ${base.error.message}`
    );
  }

  return base.data
    ? normalizeResource(
        base.data as Record<string, unknown>
      )
    : null;
}
