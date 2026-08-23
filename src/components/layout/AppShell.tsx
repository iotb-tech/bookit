"use client";

import type { ReactNode } from "react";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  BookOpen,
  CalendarDays,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Settings,
  UserRound,
  X,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import Sidebar from "./Sidebar";

const mobileLinks = [
  [
    "Dashboard",
    "/dashboard",
    LayoutDashboard,
  ],
  [
    "Resources",
    "/resources",
    BookOpen,
  ],
  [
    "My Bookings",
    "/my-bookings",
    CalendarDays,
  ],
  [
    "Messages",
    "/messages",
    MessageSquare,
  ],
  [
    "Profile",
    "/profile",
    UserRound,
  ],
  [
    "Settings",
    "/settings",
    Settings,
  ],
] as const;

export default function AppShell({
  children,
}: {
  children: ReactNode;
}) {
  const [open, setOpen] =
    useState(false);

  const router = useRouter();

  const logOut = async () => {
    await createClient().auth.signOut();

    router.replace("/login");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-[#fbfbfd] lg:flex">
      <Sidebar />

      <div className="min-w-0 flex-1">
        {/* Mobile Header */}
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-5 lg:hidden">

          <Link
            href="/"
            className="flex items-center gap-2 text-[#2b2451]"
            aria-label="Go to BookIt home page"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600 text-white">
              <CalendarDays
                size={19}
              />
            </span>

            <span className="text-lg font-semibold">
              BookIt
            </span>
          </Link>

          <button
            type="button"
            onClick={() =>
              setOpen(true)
            }
            aria-label="Open dashboard navigation"
            className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50"
          >
            <Menu size={20} />
          </button>
        </header>

        {/* Mobile Drawer */}
        {open && (
          <div className="fixed inset-0 z-50 lg:hidden">

            <button
              type="button"
              aria-label="Close navigation"
              className="absolute inset-0 bg-slate-900/25"
              onClick={() =>
                setOpen(false)
              }
            />

            <div className="absolute right-0 top-0 flex h-full w-72.5 flex-col bg-white p-4 shadow-2xl">

              <div className="flex items-center justify-between px-2 py-2">
                <span className="text-lg font-semibold text-slate-800">
                  Navigation
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setOpen(false)
                  }
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-50"
                  aria-label="Close navigation"
                >
                  <X size={20} />
                </button>
              </div>

              <nav className="mt-4 space-y-1">
                {mobileLinks.map(
                  ([
                    label,
                    href,
                    Icon,
                  ]) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={() =>
                        setOpen(
                          false
                        )
                      }
                      className="flex items-center gap-3 rounded-lg px-3 py-3 text-base font-medium text-slate-600 transition hover:bg-primary-50 hover:text-primary-700"
                    >
                      <Icon
                        size={19}
                      />
                      {label}
                    </Link>
                  )
                )}
              </nav>

              <button
                type="button"
                onClick={logOut}
                className="mt-auto flex items-center gap-3 rounded-lg px-3 py-3 text-base font-medium text-slate-600 transition hover:bg-red-50 hover:text-red-600"
              >
                <LogOut
                  size={19}
                />
                Log out
              </button>
            </div>
          </div>
        )}

        {children}
      </div>
    </div>
  );
}