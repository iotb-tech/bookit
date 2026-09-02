import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";

import MentorAppShell from "@/components/mentor/MentorAppShell";
import MentorAvailabilityManager from "@/components/mentor/MentorAvailabilityManager";
import PageBadge from "@/components/ui/PageBadge";
import {
  getMentorAvailability,
  getMentorContext,
  getMentorPreference,
} from "@/lib/mentor";

export const dynamic = "force-dynamic";

export default async function MentorAvailabilityPage() {
  const context = await getMentorContext();
  if (!context) {
    redirect("/login?mode=mentor");
    return null;
  }

  if (!context.resource) {
    return (
      <MentorAppShell>
        <main className="px-6 py-8 sm:px-8 lg:px-12 lg:py-10">
          <div className="mx-auto max-w-6xl">
            <PageBadge label="Availability" />
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-800">
              Choose when mentees can book you
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Create your mentor profile before adding availability.
            </p>

            <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-6">
              <p className="font-semibold text-amber-900">
                Create your mentor profile first.
              </p>
              <p className="mt-1 text-sm text-amber-700">
                BookIt needs a mentor resource before it can attach availability slots to you.
              </p>
              <Link
                href="/mentor/profile"
                className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary-700"
              >
                Create mentor profile <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </main>
      </MentorAppShell>
    );
  }

  const [slots, preference] = await Promise.all([
    getMentorAvailability(context.resource.id),
    getMentorPreference(context.resource.id),
  ]);

  return (
    <MentorAppShell>
      <main className="px-6 py-8 sm:px-8 lg:px-12 lg:py-10">
        <div className="mx-auto max-w-6xl">
          <PageBadge label="Availability" />
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-800">
            Choose when mentees can book you
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Add one-off times or create a preferred weekly schedule. BookIt keeps already-booked sessions protected when you generate a new schedule.
          </p>

          <div className="mt-8">
            <MentorAvailabilityManager
              resource={context.resource}
              slots={slots}
              preference={preference}
            />
          </div>
        </div>
      </main>
    </MentorAppShell>
  );
}
