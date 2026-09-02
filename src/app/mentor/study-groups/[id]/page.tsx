import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import MentorAppShell from "@/components/mentor/MentorAppShell";
import MentorStudyGroupDetail from "@/components/mentor/MentorStudyGroupDetail";
import PageBadge from "@/components/ui/PageBadge";
import { getMentorStudyGroupDetail } from "@/lib/study-groups";

export const dynamic = "force-dynamic";

export default async function MentorStudyGroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getMentorStudyGroupDetail(id);
  if (!detail) notFound();

  return (
    <MentorAppShell>
      <main className="px-6 py-8 sm:px-8 lg:px-12 lg:py-10">
        <div className="mx-auto max-w-6xl">
          <Link href="/mentor/study-groups" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-primary-700"><ArrowLeft size={17} /> Back to Study Groups</Link>
          <PageBadge label="Study Group" />
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-800">{detail.group.name}</h1>
              <p className="mt-2 text-sm leading-6 text-slate-500">{detail.group.headline || "Manage the group, members and shared sessions."}</p>
            </div>
            <span className={`self-start rounded-full px-3 py-1.5 text-xs font-semibold ${detail.group.archived_at ? "bg-slate-100 text-slate-600" : detail.group.status === "available" ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>{detail.group.archived_at ? "Archived" : detail.group.status === "available" ? "Open to members" : "Membership closed"}</span>
          </div>
          <div className="mt-8">
            <MentorStudyGroupDetail group={detail.group} members={detail.members} sessions={detail.sessions} nowIso={new Date().toISOString()} />
          </div>
        </div>
      </main>
    </MentorAppShell>
  );
}
