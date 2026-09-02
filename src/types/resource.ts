export type ResourceStatus =
  | "available"
  | "unavailable"
  | "maintenance";

export type ResourceType =
  | "Mentor"
  | "Study Group";

export interface Resource {
  id: string;
  name: string;
  headline?: string | null;
  description: string | null;
  owner_id: string;
  owner_name?: string | null;
  created_at: string;

  type?: ResourceType | null;
  skills?: string[];
  duration_minutes?: number | null;
  status: ResourceStatus;
  timezone?: string | null;
  next_available_at?: string | null;
  capacity?: number | null;
  archived_at?: string | null;
}
