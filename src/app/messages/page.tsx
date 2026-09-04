import AppShell from "@/components/layout/AppShell";
import NotificationsWorkspace from "@/components/notifications/NotificationsWorkspace";
import PageBadge from "@/components/ui/PageBadge";

export const dynamic =
  "force-dynamic";

export default function MessagesPage() {
  return (
    <AppShell>
      <main className="min-h-screen bg-[#fbfbfd] px-6 py-8 dark:bg-[#0f1219] sm:px-8 lg:px-10 lg:py-10">
        <div className="mx-auto max-w-7xl">
          <PageBadge label="Messages" />

          <div className="mt-4">
            <NotificationsWorkspace
              title="Stay connected around your sessions"
              description="Booking confirmations, mentor cancellation reasons, study-group updates, reschedule decisions and session reminders appear here."
            />
          </div>
        </div>
      </main>
    </AppShell>
  );
}