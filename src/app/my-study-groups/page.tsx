import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import MyStudyGroupsList from "@/components/study-groups/MyStudyGroupsList";
import PageBadge from "@/components/ui/PageBadge";
import { getMyStudyGroups } from "@/lib/study-groups";

export const dynamic = "force-dynamic";

export default async function MyStudyGroupsPage() {
  const groups = await getMyStudyGroups();

  return (
    <AppShell>
      <main className="px-6 py-8 sm:px-8 lg:px-10 lg:py-10">
        <div className="mx-auto max-w-6xl">
          <Link href="/dashboard" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-primary-700">
            <ArrowLeft size={17} /> Back to Dashboard
          </Link>
          <PageBadge label="My Study Groups" />
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-800">My Study Groups</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">See the groups you belong to, upcoming shared sessions and meeting links.</p>
          <div className="mt-8">
            <MyStudyGroupsList groups={groups} />
          </div>
        </div>
      </main>
    </AppShell>
  );
}
