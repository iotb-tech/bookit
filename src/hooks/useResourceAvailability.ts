"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { ResourceAvailability } from "@/types/availability";

export function useResourceAvailability(resourceId?: string) {
  return useQuery({
    queryKey: ["resource-availability", resourceId],
    queryFn: async (): Promise<ResourceAvailability[]> => {
      if (!resourceId) return [];
      const supabase = createClient();
      const nowIso = new Date().toISOString();
      const { data, error } = await supabase
        .from("resource_availability")
        .select("id, resource_id, start_time, end_time, status, created_at")
        .eq("resource_id", resourceId)
        .eq("status", "available")
        .gte("start_time", nowIso)
        .order("start_time", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []).map((row) => ({
        id: String(row.id), resource_id: String(row.resource_id), start_time: String(row.start_time), end_time: String(row.end_time), status: String(row.status), created_at: String(row.created_at),
      }));
    },
    enabled: Boolean(resourceId),
  });
}
