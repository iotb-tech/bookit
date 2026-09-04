import MentorAppShell from "@/components/mentor/MentorAppShell";
import NotificationsWorkspace from "@/components/notifications/NotificationsWorkspace";
import PageBadge from "@/components/ui/PageBadge";

export const dynamic =
  "force-dynamic";

export default function MentorMessagesPage() {
  return (
    <MentorAppShell>
      <main className="min-h-screen bg-[#fbfbfd] px-6 py-8 dark:bg-[#0f1219] sm:px-8 lg:px-10 lg:py-10">
        <div className="mx-auto max-w-7xl">
          <PageBadge label="Messages" />

          <div className="mt-4">
            <NotificationsWorkspace
              title="Session notifications"
              description="New booking requests, mentee cancellations, reschedule requests and study-group activity appear here."
            />
          </div>
        </div>
      </main>
    </MentorAppShell>
  );
}