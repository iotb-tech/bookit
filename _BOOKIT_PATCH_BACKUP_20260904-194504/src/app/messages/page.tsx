import AppShell from "@/components/layout/AppShell";
import NotificationsPanel from "@/components/notifications/NotificationsPanel";
import PageBadge from "@/components/ui/PageBadge";

export default function MessagesPage() {
  return (
    <AppShell>
      <main className="px-6 py-8 sm:px-8 lg:px-12 lg:py-10">
        <div className="mx-auto max-w-6xl">
          <div>
            <PageBadge label="Messages" />

            <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-800">
              Stay connected around your sessions
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Booking confirmations, mentor cancellation reasons, study-group
              updates and session reminders appear here. Direct chat remains a
              future enhancement.
            </p>
          </div>

          <section className="mt-8">
            <NotificationsPanel />
          </section>
        </div>
      </main>
    </AppShell>
  );
}
