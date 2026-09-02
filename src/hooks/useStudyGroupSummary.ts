"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { StudyGroupSummary } from "@/types/studyGroup";

export function useStudyGroupSummary(resourceId?: string, enabled = true) {
  return useQuery({
    queryKey: ["study-group-summary", resourceId],
    enabled: Boolean(resourceId) && enabled,
    queryFn: async (): Promise<StudyGroupSummary> => {
      if (!resourceId) {
        return { capacity: 15, member_count: 0, membership_status: null, can_join: false, is_owner: false };
      }

      const supabase = createClient();
      const { data, error } = await supabase.rpc("get_study_group_summary", {
        p_resource_id: resourceId,
      });

      if (error) throw new Error(error.message);
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) throw new Error("Study group summary is unavailable.");

      const membership = String(row.membership_status ?? "");
      return {
        capacity: Number(row.capacity ?? 15),
        member_count: Number(row.member_count ?? 0),
        membership_status:
          membership === "active" || membership === "left" || membership === "removed"
            ? membership
            : null,
        can_join: Boolean(row.can_join),
        is_owner: Boolean(row.is_owner),
      };
    },
    staleTime: 15_000,
  });
}
