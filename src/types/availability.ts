export type AvailabilityStatus = "available" | "booked" | "unavailable";

export interface ResourceAvailability {
  id: string;
  resource_id: string;
  start_time: string;
  end_time: string;
  status: AvailabilityStatus | string;
  created_at: string;
}
