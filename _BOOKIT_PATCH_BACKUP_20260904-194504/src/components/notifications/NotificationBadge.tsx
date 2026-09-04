"use client";

import { useUnreadNotificationCount } from "@/hooks/useNotifications";

export default function NotificationBadge() {
  const { data = 0 } = useUnreadNotificationCount();

  if (data <= 0) return null;

  return (
    <span className="ml-auto min-w-5 rounded-full bg-primary-600 px-1.5 py-0.5 text-center text-[10px] font-bold leading-4 text-white">
      {data > 99 ? "99+" : data}
    </span>
  );
}
