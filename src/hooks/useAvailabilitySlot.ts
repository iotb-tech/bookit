"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { ResourceAvailability } from "@/types/availability";

export function useAvailabilitySlot(slotId?: string) {
  return useQuery({
    queryKey: ["availability-slot", slotId],
    queryFn: async (): Promise<ResourceAvailability | null> => {
      if (!slotId) return null;
      const supabase = createClient();
      const { data, error } = await supabase
        .from("resource_availability")
        .select("id, resource_id, start_time, end_time, status, created_at")
        .eq("id", slotId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data ? {
        id: String(data.id), resource_id: String(data.resource_id), start_time: String(data.start_time), end_time: String(data.end_time), status: String(data.status), created_at: String(data.created_at),
      } : null;
    },
    enabled: Boolean(slotId),
    staleTime: 0,
  });
}
