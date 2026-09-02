import { redirect } from "next/navigation";

import MentorAppShell from "@/components/mentor/MentorAppShell";
import MentorProfileForm from "@/components/mentor/MentorProfileForm";
import PageBadge from "@/components/ui/PageBadge";
import { getMentorContext } from "@/lib/mentor";

export const dynamic = "force-dynamic";

export default async function MentorProfilePage() {
  const context = await getMentorContext();
  if (!context) {
    redirect("/login?mode=mentor");
    return null;
  }

  return (
    <MentorAppShell>
      <main className="px-6 py-8 sm:px-8 lg:px-12 lg:py-10">
        <div className="mx-auto max-w-4xl">
          <PageBadge label="Mentor Profile" />
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-800">
            Manage your mentor profile
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Keep your expertise, session duration, availability details and meeting link up to date.
          </p>

          <div className="mt-8">
            <MentorProfileForm
              profile={context.profile}
              resource={context.resource}
            />
          </div>
        </div>
      </main>
    </MentorAppShell>
  );
}
