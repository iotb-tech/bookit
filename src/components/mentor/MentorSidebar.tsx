"use client";

import Link from "next/link";
import {
  usePathname,
  useRouter,
} from "next/navigation";

import {
  ArrowLeftRight,
  BookOpen,
  CalendarDays,
  Clock3,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  UserRound,
  UsersRound,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import NotificationBadge from "@/components/notifications/NotificationBadge";

const navigation = [
  {
    label: "Dashboard",
    href: "/mentor/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Sessions",
    href: "/mentor/sessions",
    icon: UsersRound,
  },
  {
    label: "Study Groups",
    href: "/mentor/study-groups",
    icon: BookOpen,
  },
  {
    label: "Availability",
    href: "/mentor/availability",
    icon: Clock3,
  },
  {
    label: "Messages",
    href: "/mentor/messages",
    icon: MessageSquare,
  },
  {
    label: "Profile",
    href: "/mentor/profile",
    icon: UserRound,
  },
];

export default function MentorSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login?mode=mentor");
    router.refresh();
  };

  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
      <Link
        href="/mentor/dashboard"
        aria-label="Go to mentor dashboard"
        className="flex h-20 items-center gap-3 px-7 transition-opacity hover:opacity-80"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600 text-white">
          <CalendarDays size={20} />
        </span>

        <span className="text-xl font-semibold text-[#2b2451]">
          BookIt
        </span>
      </Link>

      <nav
        className="flex-1 space-y-1.5 px-3 pt-3"
        aria-label="Mentor navigation"
      >
        {navigation.map(({ label, href, icon: Icon }) => {
          const active =
            href === "/mentor/dashboard"
              ? pathname === "/mentor/dashboard"
              : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-4 py-3 text-base font-medium transition-colors ${
                active
                  ? "bg-primary-50 text-primary-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Icon size={19} strokeWidth={2} />
              <span>{label}</span>
              {label === "Messages" && <NotificationBadge />}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-100 p-3">
        <Link
          href="/dashboard"
          className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-base font-medium text-slate-600 transition-colors hover:bg-primary-50 hover:text-primary-700"
        >
          <ArrowLeftRight size={19} strokeWidth={2} />
          <span>Mentee View</span>
        </Link>

        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-base font-medium text-slate-600 transition-colors hover:bg-red-50 hover:text-red-600"
        >
          <LogOut size={19} strokeWidth={2} />
          <span>Log out</span>
        </button>
      </div>
    </aside>
  );
}
