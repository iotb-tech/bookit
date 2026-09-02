import AppShell from "@/components/layout/AppShell";
import AccountSettings from "@/components/settings/AccountSettings";
import PageBadge from "@/components/ui/PageBadge";

export default function SettingsPage() {
  return (
    <AppShell>
      <main className="px-6 py-8 sm:px-8 lg:px-12 lg:py-10">
        <div className="mx-auto max-w-6xl">
          <PageBadge label="Settings" />

          <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-800">
            Manage your account
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Manage your BookIt appearance, notifications, password and session
            security.
          </p>

          <AccountSettings />
        </div>
      </main>
    </AppShell>
  );
}
