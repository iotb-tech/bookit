export interface BookItNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  href: string | null;
  metadata: Record<string, unknown>;
  scheduled_for: string;
  read_at: string | null;
  created_at: string;
}

export interface UserPreferences {
  theme: "light" | "dark" | "system";
  booking_updates: boolean;
  study_group_updates: boolean;
  reminder_enabled: boolean;
  reminder_hours: number;
}
