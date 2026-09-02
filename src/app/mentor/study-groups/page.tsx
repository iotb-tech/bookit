import MentorAppShell from "@/components/mentor/MentorAppShell";
import MentorStudyGroupsList from "@/components/mentor/MentorStudyGroupsList";
import PageBadge from "@/components/ui/PageBadge";
import { getMentorStudyGroups } from "@/lib/study-groups";

export const dynamic = "force-dynamic";

export default async function MentorStudyGroupsPage() {
  const groups = await getMentorStudyGroups();

  return (
    <MentorAppShell>
      <main className="px-6 py-8 sm:px-8 lg:px-12 lg:py-10">
        <div className="mx-auto max-w-6xl">
          <PageBadge label="Study Groups" />
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-800">Manage Study Groups</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Create study groups, control capacity, manage members and schedule one shared session for the whole group.</p>
          <div className="mt-8">
            <MentorStudyGroupsList groups={groups} />
          </div>
        </div>
      </main>
    </MentorAppShell>
  );
}
