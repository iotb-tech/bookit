export type BookingStatus =
  | "pending"
  | "confirmed"
  | "cancelled";

export interface BookingResourceSummary {
  name: string;
  type?: string | null;
  duration_minutes?: number | null;
  meeting_link?: string | null;
}

export interface Booking {
  id: string;
  resource_id: string;
  user_id: string;
  availability_id: string | null;
  start_time: string;
  end_time: string;
  status: BookingStatus;
  cancelled_by?: "mentee" | "mentor" | null;
  cancellation_reason?: string | null;
  cancelled_at?: string | null;
  confirmed_at?: string | null;
  confirmed_by?: string | null;
  created_at: string;
  resource?: BookingResourceSummary | null;
}
