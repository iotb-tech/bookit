import MentorAppShell from "@/components/mentor/MentorAppShell";
import NotificationsPanel from "@/components/notifications/NotificationsPanel";
import PageBadge from "@/components/ui/PageBadge";

export default function MentorMessagesPage() {
  return (
    <MentorAppShell>
      <main className="px-6 py-8 sm:px-8 lg:px-12 lg:py-10">
        <div className="mx-auto max-w-6xl">
          <PageBadge label="Messages" />
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-800">
            Session notifications
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            New booking requests, mentee cancellations, reschedule requests and
            study-group activity appear here.
          </p>

          <section className="mt-8">
            <NotificationsPanel emptyHref="/mentor/dashboard" />
          </section>
        </div>
      </main>
    </MentorAppShell>
  );
}
