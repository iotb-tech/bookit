import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";

import MentorAppShell from "@/components/mentor/MentorAppShell";
import MentorSessionsList from "@/components/mentor/MentorSessionsList";
import PageBadge from "@/components/ui/PageBadge";
import {
  getMentorContext,
  getMentorSessionBuckets,
} from "@/lib/mentor";

export const dynamic = "force-dynamic";

export default async function MentorSessionsPage() {
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
            <PageBadge label="Sessions" />
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-800">
              See who booked you
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Create your mentor profile before receiving bookings.
            </p>

            <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-6">
              <p className="font-semibold text-amber-900">
                Create your mentor profile first.
              </p>
              <p className="mt-1 text-sm text-amber-700">
                Once your mentor resource exists, mentee bookings will appear here.
              </p>
              <Link
                href="/mentor/profile"
                className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary-700"
              >
                Set up profile <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </main>
      </MentorAppShell>
    );
  }

  const buckets = await getMentorSessionBuckets(context.resource.id);

  return (
    <MentorAppShell>
      <main className="px-6 py-8 sm:px-8 lg:px-12 lg:py-10">
        <div className="mx-auto max-w-6xl">
          <PageBadge label="1-to-1 Sessions" />
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-800">
            See who booked you
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Review your one-to-one mentorship bookings, completed sessions and cancellations. Real mentee names and emails are shown only for bookings connected to your mentor resource.
          </p>

          <div className="mt-8">
            <MentorSessionsList
              {...buckets}
              meetingLink={context.resource.meeting_link}
            />
          </div>
        </div>
      </main>
    </MentorAppShell>
  );
}
