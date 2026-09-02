export type StudyGroupMemberStatus = "active" | "left" | "removed";
export type StudyGroupMemberRole = "member" | "leader";
export type StudyGroupSessionStatus = "scheduled" | "cancelled";
export type StudyGroupWaitlistStatus = "waiting" | "promoted" | "left" | "removed";
export type AttendanceStatus = "present" | "absent" | "excused";

export interface StudyGroupSummary {
  capacity: number;
  member_count: number;
  membership_status: StudyGroupMemberStatus | null;
  can_join: boolean;
  is_owner: boolean;
  waitlist_count: number;
  waitlist_status: StudyGroupWaitlistStatus | null;
}

export interface StudyGroupMember {
  user_id: string;
  full_name: string;
  email: string | null;
  role: StudyGroupMemberRole;
  status: StudyGroupMemberStatus;
  joined_at: string;
}

export interface StudyGroupSession {
  id: string;
  resource_id: string;
  start_time: string;
  end_time: string;
  meeting_link: string | null;
  status: StudyGroupSessionStatus;
  created_by: string;
  cancellation_reason: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudyGroupSchedulePreference {
  id: string;
  resource_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  timezone: string;
  active: boolean;
}

export interface StudyGroupAttendance {
  session_id: string;
  user_id: string;
  status: AttendanceStatus;
  marked_at: string;
}

export interface StudyGroupRecord {
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
  capacity: number;
  archived_at: string | null;
  created_at: string;
  member_count: number;
}

export interface MyStudyGroup extends StudyGroupRecord {
  membership_id: string;
  membership_status: StudyGroupMemberStatus;
  joined_at: string;
  upcoming_sessions: StudyGroupSession[];
  regular_schedule: StudyGroupSchedulePreference[];
}
