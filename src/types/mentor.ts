export type UserRole = "mentee" | "mentor";

export interface MentorProfileRecord {
  id: string;
  full_name: string | null;
  email: string | null;
  role: UserRole;
  avatar_url: string | null;
}

export interface MentorResourceRecord {
  id: string;
  name: string;
  headline: string | null;
  description: string | null;
  owner_id: string;
  type: string | null;
  skills: string[];
  duration_minutes: number | null;
  status: "available" | "unavailable" | "maintenance";
  meeting_link: string | null;
  timezone: string;
  next_available_at: string | null;
  archived_at: string | null;
}

export interface MentorAvailabilityPreference {
  id: string;
  mentor_id: string;
  resource_id: string;
  days_of_week: number[];
  start_time: string;
  end_time: string;
  session_duration_minutes: number;
  break_minutes: number;
  weeks_ahead: number;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface MentorSession {
  id: string;
  resource_id: string;
  user_id: string;
  availability_id: string | null;
  start_time: string;
  end_time: string;
  status: "pending" | "confirmed" | "cancelled";
  cancelled_by: "mentee" | "mentor" | null;
  cancellation_reason: string | null;
  confirmed_at: string | null;
  confirmed_by: string | null;
  reschedule_request_id: string | null;
  proposed_slot_id: string | null;
  proposed_start_time: string | null;
  proposed_end_time: string | null;
  reschedule_reason: string | null;
  created_at: string;
  mentee: {
    full_name: string;
    email: string | null;
  };
}
