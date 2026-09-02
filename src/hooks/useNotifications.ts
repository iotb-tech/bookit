"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { BookItNotification } from "@/types/notification";

export function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: async (): Promise<BookItNotification[]> => {
      const supabase = createClient();
      const nowIso = new Date().toISOString();

      const { data, error } = await supabase
        .from("notifications")
        .select("id, type, title, body, href, metadata, scheduled_for, read_at, created_at")
        .lte("scheduled_for", nowIso)
        .order("scheduled_for", { ascending: false })
        .limit(100);

      if (error) throw new Error(error.message);

      return (data ?? []).map((row) => ({
        id: String(row.id),
        type: String(row.type),
        title: String(row.title),
        body: String(row.body),
        href: typeof row.href === "string" ? row.href : null,
        metadata:
          row.metadata && typeof row.metadata === "object"
            ? (row.metadata as Record<string, unknown>)
            : {},
        scheduled_for: String(row.scheduled_for),
        read_at: typeof row.read_at === "string" ? row.read_at : null,
        created_at: String(row.created_at),
      }));
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: async () => {
      const supabase = createClient();
      const { count, error } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .is("read_at", null)
        .lte("scheduled_for", new Date().toISOString());

      if (error) throw new Error(error.message);
      return count ?? 0;
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}

export function useNotificationActions() {
  const queryClient = useQueryClient();

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["notifications"] }),
      queryClient.invalidateQueries({
        queryKey: ["notifications", "unread-count"],
      }),
    ]);
  };

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw new Error(error.message);
    },
    onSuccess: refresh,
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const supabase = createClient();
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .is("read_at", null)
        .lte("scheduled_for", new Date().toISOString());

      if (error) throw new Error(error.message);
    },
    onSuccess: refresh,
  });

  return { markRead, markAllRead };
}
