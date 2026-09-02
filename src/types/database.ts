export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; full_name: string | null; email: string | null; role: "mentee" | "mentor"; avatar_url: string | null; created_at: string; updated_at: string };
        Insert: { id: string; full_name?: string | null; email?: string | null; role?: "mentee" | "mentor"; avatar_url?: string | null; created_at?: string; updated_at?: string };
        Update: { full_name?: string | null; email?: string | null; avatar_url?: string | null; updated_at?: string };
        Relationships: [];
      };
      resources: {
        Row: { id: string; name: string; headline: string | null; description: string | null; owner_id: string; created_at: string; type: string | null; skills: string[]; duration_minutes: number | null; status: "available" | "unavailable" | "maintenance"; meeting_link: string | null; timezone: string; next_available_at: string | null; capacity: number; archived_at: string | null };
        Insert: { id?: string; name: string; headline?: string | null; description?: string | null; owner_id: string; created_at?: string; type?: string | null; skills?: string[]; duration_minutes?: number | null; status?: "available" | "unavailable" | "maintenance"; meeting_link?: string | null; timezone?: string; next_available_at?: string | null; capacity?: number; archived_at?: string | null };
        Update: { name?: string; headline?: string | null; description?: string | null; skills?: string[]; duration_minutes?: number | null; status?: "available" | "unavailable" | "maintenance"; meeting_link?: string | null; timezone?: string; next_available_at?: string | null; capacity?: number; archived_at?: string | null };
        Relationships: [];
      };
      resource_availability: {
        Row: { id: string; resource_id: string; start_time: string; end_time: string; status: string; created_at: string };
        Insert: { id?: string; resource_id: string; start_time: string; end_time: string; status?: string; created_at?: string };
        Update: { start_time?: string; end_time?: string; status?: string };
        Relationships: [];
      };
      bookings: {
        Row: { id: string; resource_id: string; user_id: string; availability_id: string | null; start_time: string; end_time: string; status: "confirmed" | "cancelled"; cancelled_by: "mentee" | "mentor" | null; cancellation_reason: string | null; cancelled_at: string | null; created_at: string };
        Insert: { id?: string; resource_id: string; user_id: string; availability_id?: string | null; start_time: string; end_time: string; status?: "confirmed" | "cancelled"; created_at?: string };
        Update: { status?: "confirmed" | "cancelled"; start_time?: string; end_time?: string; cancelled_by?: "mentee" | "mentor" | null; cancellation_reason?: string | null; cancelled_at?: string | null };
        Relationships: [];
      };
      mentor_availability_preferences: {
        Row: { id: string; mentor_id: string; resource_id: string; days_of_week: number[]; start_time: string; end_time: string; session_duration_minutes: number; break_minutes: number; weeks_ahead: number; timezone: string; created_at: string; updated_at: string };
        Insert: { id?: string; mentor_id: string; resource_id: string; days_of_week: number[]; start_time: string; end_time: string; session_duration_minutes: number; break_minutes: number; weeks_ahead: number; timezone: string; created_at?: string; updated_at?: string };
        Update: { days_of_week?: number[]; start_time?: string; end_time?: string; session_duration_minutes?: number; break_minutes?: number; weeks_ahead?: number; timezone?: string; updated_at?: string };
        Relationships: [];
      };
      study_group_members: {
        Row: { id: string; resource_id: string; user_id: string; role: "member" | "leader"; status: "active" | "left" | "removed"; joined_at: string; left_at: string | null; removed_at: string | null; updated_at: string };
        Insert: { id?: string; resource_id: string; user_id: string; role?: "member" | "leader"; status?: "active" | "left" | "removed"; joined_at?: string; left_at?: string | null; removed_at?: string | null; updated_at?: string };
        Update: { role?: "member" | "leader"; status?: "active" | "left" | "removed"; joined_at?: string; left_at?: string | null; removed_at?: string | null; updated_at?: string };
        Relationships: [];
      };
      study_group_sessions: {
        Row: { id: string; resource_id: string; start_time: string; end_time: string; meeting_link: string | null; status: "scheduled" | "cancelled"; created_by: string; created_at: string; updated_at: string };
        Insert: { id?: string; resource_id: string; start_time: string; end_time: string; meeting_link?: string | null; status?: "scheduled" | "cancelled"; created_by: string; created_at?: string; updated_at?: string };
        Update: { start_time?: string; end_time?: string; meeting_link?: string | null; status?: "scheduled" | "cancelled"; updated_at?: string };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_booking_from_slot: { Args: { p_resource_id: string; p_slot_id: string }; Returns: string };
      cancel_booking_and_release_slot: { Args: { p_booking_id: string }; Returns: boolean };
      mentor_generate_availability: { Args: { p_resource_id: string; p_days_of_week: number[]; p_start_time: string; p_end_time: string; p_session_duration_minutes?: number; p_break_minutes?: number; p_weeks_ahead?: number; p_timezone?: string; p_replace_existing?: boolean }; Returns: number };
      mentor_cancel_booking: { Args: { p_booking_id: string; p_reason?: string | null }; Returns: boolean };
      get_study_group_summary: { Args: { p_resource_id: string }; Returns: Array<{ capacity: number; member_count: number; membership_status: string | null; can_join: boolean; is_owner: boolean }> };
      join_study_group: { Args: { p_resource_id: string }; Returns: boolean };
      leave_study_group: { Args: { p_resource_id: string }; Returns: boolean };
      mentor_remove_study_group_member: { Args: { p_resource_id: string; p_user_id: string }; Returns: boolean };
      mentor_get_study_group_members: { Args: { p_resource_id: string }; Returns: Array<{ user_id: string; full_name: string; email: string | null; role: string; status: string; joined_at: string }> };
      mentor_get_sessions: { Args: { p_resource_id: string }; Returns: Array<Record<string, unknown>> };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type DataBase = Database;
