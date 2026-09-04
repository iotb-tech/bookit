import { Suspense } from "react";

import Link from "next/link";

import { CalendarDays } from "lucide-react";

import LoginForm from "@/components/auth/LoginForm";

import SessionExpiredBanner from "@/components/auth/SessionExpiredBanner";
export default function LoginPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fbfaff]">
      {/* Decorative circles */}
      <div
        aria-hidden="true"
        className="absolute -right-24 top-16 h-72 w-72 rounded-full bg-primary-50"
      />

      <div
        aria-hidden="true"
        className="absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-primary-100/60"
      />

      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-8 lg:px-8">
        {/* Brand */}
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-2"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-600 text-white">
            <CalendarDays size={20} />
          </span>

          <span className="text-xl font-bold text-slate-800">
            BookIt
          </span>
        </Link>

        {/* Login */}
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-md">
            <Suspense fallback={<LoginSkeleton />}>
              <SessionExpiredBanner />
      <LoginForm />
            </Suspense>
          </div>
        </div>
      </div>
    </main>
  );
}

function LoginSkeleton() {
  return (
    <div className="w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
      <div className="mx-auto h-8 w-44 animate-pulse rounded-md bg-slate-200" />

      <div className="mx-auto mt-3 h-4 w-40 animate-pulse rounded-md bg-slate-100" />

      <div className="mt-8 space-y-5">
        <div>
          <div className="h-4 w-16 animate-pulse rounded bg-slate-200" />

          <div className="mt-2 h-11 w-full animate-pulse rounded-lg bg-slate-100" />
        </div>

        <div>
          <div className="h-4 w-20 animate-pulse rounded bg-slate-200" />

          <div className="mt-2 h-11 w-full animate-pulse rounded-lg bg-slate-100" />
        </div>

        <div className="h-11 w-full animate-pulse rounded-lg bg-slate-200" />
      </div>
    </div>
  );
}