export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          email: string | null;
          role: "mentee" | "mentor";
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          email?: string | null;
          role?: "mentee" | "mentor";
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          full_name?: string | null;
          email?: string | null;
          avatar_url?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      resources: {
        Row: {
          id: string;
          name: string;
          headline: string | null;
          description: string | null;
          owner_id: string;
          created_at: string;
          type: string | null;
          skills: string[];
          duration_minutes: number | null;
          status: "available" | "unavailable" | "maintenance";
          meeting_link: string | null;
          timezone: string;
          next_available_at: string | null;
          capacity: number;
          archived_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          headline?: string | null;
          description?: string | null;
          owner_id: string;
          created_at?: string;
          type?: string | null;
          skills?: string[];
          duration_minutes?: number | null;
          status?: "available" | "unavailable" | "maintenance";
          meeting_link?: string | null;
          timezone?: string;
          next_available_at?: string | null;
          capacity?: number;
          archived_at?: string | null;
        };
        Update: {
          name?: string;
          headline?: string | null;
          description?: string | null;
          skills?: string[];
          duration_minutes?: number | null;
          status?: "available" | "unavailable" | "maintenance";
          meeting_link?: string | null;
          timezone?: string;
          next_available_at?: string | null;
          capacity?: number;
          archived_at?: string | null;
        };
        Relationships: [];
      };
      resource_availability: {
        Row: {
          id: string;
          resource_id: string;
          start_time: string;
          end_time: string;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          resource_id: string;
          start_time: string;
          end_time: string;
          status?: string;
          created_at?: string;
        };
        Update: {
          start_time?: string;
          end_time?: string;
          status?: string;
        };
        Relationships: [];
      };
      bookings: {
        Row: {
          id: string;
          resource_id: string;
          user_id: string;
          availability_id: string | null;
          start_time: string;
          end_time: string;
          status: "pending" | "confirmed" | "cancelled";
          cancelled_by: "mentee" | "mentor" | null;
          cancellation_reason: string | null;
          cancelled_at: string | null;
          confirmed_at: string | null;
          confirmed_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          resource_id: string;
          user_id: string;
          availability_id?: string | null;
          start_time: string;
          end_time: string;
          status?: "pending" | "confirmed" | "cancelled";
          cancelled_by?: "mentee" | "mentor" | null;
          cancellation_reason?: string | null;
          cancelled_at?: string | null;
          confirmed_at?: string | null;
          confirmed_by?: string | null;
          created_at?: string;
        };
        Update: {
          status?: "pending" | "confirmed" | "cancelled";
          start_time?: string;
          end_time?: string;
          cancelled_by?: "mentee" | "mentor" | null;
          cancellation_reason?: string | null;
          cancelled_at?: string | null;
          confirmed_at?: string | null;
          confirmed_by?: string | null;
        };
        Relationships: [];
      };
      mentor_availability_preferences: {
        Row: {
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
        };
        Insert: {
          id?: string;
          mentor_id: string;
          resource_id: string;
          days_of_week: number[];
          start_time: string;
          end_time: string;
          session_duration_minutes: number;
          break_minutes: number;
          weeks_ahead: number;
          timezone: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          days_of_week?: number[];
          start_time?: string;
          end_time?: string;
          session_duration_minutes?: number;
          break_minutes?: number;
          weeks_ahead?: number;
          timezone?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      study_group_members: {
        Row: {
          id: string;
          resource_id: string;
          user_id: string;
          role: "member" | "leader";
          status: "active" | "left" | "removed";
          joined_at: string;
          left_at: string | null;
          removed_at: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          resource_id: string;
          user_id: string;
          role?: "member" | "leader";
          status?: "active" | "left" | "removed";
          joined_at?: string;
          left_at?: string | null;
          removed_at?: string | null;
          updated_at?: string;
        };
        Update: {
          role?: "member" | "leader";
          status?: "active" | "left" | "removed";
          joined_at?: string;
          left_at?: string | null;
          removed_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      study_group_sessions: {
        Row: {
          id: string;
          resource_id: string;
          start_time: string;
          end_time: string;
          meeting_link: string | null;
          status: "scheduled" | "cancelled";
          created_by: string;
          cancellation_reason: string | null;
          cancelled_by: string | null;
          cancelled_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          resource_id: string;
          start_time: string;
          end_time: string;
          meeting_link?: string | null;
          status?: "scheduled" | "cancelled";
          created_by: string;
          cancellation_reason?: string | null;
          cancelled_by?: string | null;
          cancelled_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          start_time?: string;
          end_time?: string;
          meeting_link?: string | null;
          status?: "scheduled" | "cancelled";
          cancellation_reason?: string | null;
          cancelled_by?: string | null;
          cancelled_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_preferences: {
        Row: {
          user_id: string;
          theme: "light" | "dark" | "system";
          booking_updates: boolean;
          study_group_updates: boolean;
          reminder_enabled: boolean;
          reminder_hours: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          theme?: "light" | "dark" | "system";
          booking_updates?: boolean;
          study_group_updates?: boolean;
          reminder_enabled?: boolean;
          reminder_hours?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          theme?: "light" | "dark" | "system";
          booking_updates?: boolean;
          study_group_updates?: boolean;
          reminder_enabled?: boolean;
          reminder_hours?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          title: string;
          body: string;
          href: string | null;
          metadata: Record<string, unknown>;
          scheduled_for: string;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          title: string;
          body: string;
          href?: string | null;
          metadata?: Record<string, unknown>;
          scheduled_for?: string;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          read_at?: string | null;
          scheduled_for?: string;
        };
        Relationships: [];
      };
      booking_reschedule_requests: {
        Row: {
          id: string;
          booking_id: string;
          requested_by: string;
          proposed_slot_id: string;
          reason: string | null;
          status: "pending" | "approved" | "rejected" | "cancelled";
          response_reason: string | null;
          created_at: string;
          responded_at: string | null;
        };
        Insert: {
          id?: string;
          booking_id: string;
          requested_by: string;
          proposed_slot_id: string;
          reason?: string | null;
          status?: "pending" | "approved" | "rejected" | "cancelled";
          response_reason?: string | null;
          created_at?: string;
          responded_at?: string | null;
        };
        Update: {
          status?: "pending" | "approved" | "rejected" | "cancelled";
          response_reason?: string | null;
          responded_at?: string | null;
        };
        Relationships: [];
      };
      study_group_schedule_preferences: {
        Row: {
          id: string;
          resource_id: string;
          weekday: number;
          start_time: string;
          end_time: string;
          timezone: string;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          resource_id: string;
          weekday: number;
          start_time: string;
          end_time: string;
          timezone?: string;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          weekday?: number;
          start_time?: string;
          end_time?: string;
          timezone?: string;
          active?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      study_group_attendance: {
        Row: {
          session_id: string;
          user_id: string;
          status: "present" | "absent" | "excused";
          marked_by: string;
          marked_at: string;
        };
        Insert: {
          session_id: string;
          user_id: string;
          status: "present" | "absent" | "excused";
          marked_by: string;
          marked_at?: string;
        };
        Update: {
          status?: "present" | "absent" | "excused";
          marked_by?: string;
          marked_at?: string;
        };
        Relationships: [];
      };
      study_group_waitlist: {
        Row: {
          id: string;
          resource_id: string;
          user_id: string;
          status: "waiting" | "promoted" | "left" | "removed";
          joined_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          resource_id: string;
          user_id: string;
          status?: "waiting" | "promoted" | "left" | "removed";
          joined_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: "waiting" | "promoted" | "left" | "removed";
          joined_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_booking_from_slot: {
        Args: { p_resource_id: string; p_slot_id: string };
        Returns: string;
      };
      cancel_booking_and_release_slot: {
        Args: { p_booking_id: string };
        Returns: boolean;
      };
      mentor_generate_availability: {
        Args: {
          p_resource_id: string;
          p_days_of_week: number[];
          p_start_time: string;
          p_end_time: string;
          p_session_duration_minutes?: number;
          p_break_minutes?: number;
          p_weeks_ahead?: number;
          p_timezone?: string;
          p_replace_existing?: boolean;
        };
        Returns: number;
      };
      mentor_cancel_booking: {
        Args: { p_booking_id: string; p_reason: string | null };
        Returns: boolean;
      };
      mentor_confirm_booking: {
        Args: { p_booking_id: string };
        Returns: boolean;
      };
      mentor_clear_open_availability: {
        Args: { p_resource_id: string };
        Returns: number;
      };
      request_booking_reschedule: {
        Args: {
          p_booking_id: string;
          p_proposed_slot_id: string;
          p_reason?: string | null;
        };
        Returns: string;
      };
      mentor_respond_reschedule: {
        Args: {
          p_request_id: string;
          p_approve: boolean;
          p_response_reason?: string | null;
        };
        Returns: boolean;
      };
      get_study_group_summary: {
        Args: { p_resource_id: string };
        Returns: Array<{
          capacity: number;
          member_count: number;
          membership_status: string | null;
          can_join: boolean;
          is_owner: boolean;
          waitlist_count: number;
          waitlist_status: string | null;
        }>;
      };
      join_study_group: {
        Args: { p_resource_id: string };
        Returns: boolean;
      };
      leave_study_group: {
        Args: { p_resource_id: string };
        Returns: boolean;
      };
      join_study_group_waitlist: {
        Args: { p_resource_id: string };
        Returns: boolean;
      };
      leave_study_group_waitlist: {
        Args: { p_resource_id: string };
        Returns: boolean;
      };
      mentor_remove_study_group_member: {
        Args: { p_resource_id: string; p_user_id: string };
        Returns: boolean;
      };
      mentor_get_study_group_members: {
        Args: { p_resource_id: string };
        Returns: Array<{
          user_id: string;
          full_name: string;
          email: string | null;
          role: string;
          status: string;
          joined_at: string;
        }>;
      };
      mentor_get_sessions: {
        Args: { p_resource_id: string };
        Returns: Array<Record<string, unknown>>;
      };
      mentor_create_study_group_session: {
        Args: {
          p_resource_id: string;
          p_start: string;
          p_end: string;
          p_meeting_link?: string | null;
        };
        Returns: string;
      };
      mentor_generate_study_group_sessions: {
        Args: { p_resource_id: string; p_weeks_ahead?: number };
        Returns: number;
      };
      mentor_cancel_study_group_session: {
        Args: {
          p_session_id: string;
          p_resource_id: string;
          p_reason: string;
        };
        Returns: boolean;
      };
      mentor_mark_study_group_attendance: {
        Args: {
          p_resource_id: string;
          p_session_id: string;
          p_user_id: string;
          p_status: "present" | "absent" | "excused";
        };
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type DataBase = Database;
