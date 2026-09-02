"use client";

import { useEffect, useState, useTransition } from "react";
import {
  KeyRound,
  Laptop,
  LogOut,
  Moon,
  ShieldCheck,
  Sun,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AutoDismissAlert from "@/components/ui/AutoDismissAlert";
import type { UserPreferences } from "@/types/notification";

const DEFAULTS: UserPreferences = {
  theme: "system",
  booking_updates: true,
  study_group_updates: true,
  reminder_enabled: true,
  reminder_hours: 24,
};

function applyTheme(theme: UserPreferences["theme"]) {
  const root = document.documentElement;
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const dark = theme === "dark" || (theme === "system" && systemDark);
  root.classList.toggle("dark", dark);
  root.dataset.theme = theme;
  window.localStorage.setItem("bookit-theme", theme);
}

export default function AccountSettings() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULTS);
  const [provider, setProvider] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return;

      setEmail(user.email ?? null);
      setProvider(
        typeof user.app_metadata?.provider === "string"
          ? user.app_metadata.provider
          : null
      );

      const { data } = await supabase
        .from("user_preferences")
        .select(
          "theme, booking_updates, study_group_updates, reminder_enabled, reminder_hours"
        )
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        const next: UserPreferences = {
          theme:
            data.theme === "light" || data.theme === "dark"
              ? data.theme
              : "system",
          booking_updates: data.booking_updates !== false,
          study_group_updates: data.study_group_updates !== false,
          reminder_enabled: data.reminder_enabled !== false,
          reminder_hours: Number(data.reminder_hours ?? 24),
        };
        setPreferences(next);
        applyTheme(next.theme);
      } else {
        const stored = window.localStorage.getItem("bookit-theme");
        if (stored === "light" || stored === "dark" || stored === "system") {
          setPreferences((current) => ({ ...current, theme: stored }));
          applyTheme(stored);
        }
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const savePreferences = (next: UserPreferences) => {
    setPreferences(next);
    applyTheme(next.theme);
    setMessage(null);
    setError(null);

    startTransition(async () => {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        setError("Please log in again.");
        return;
      }

      const { error: saveError } = await supabase
        .from("user_preferences")
        .upsert(
          {
            user_id: userData.user.id,
            ...next,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );

      if (saveError) {
        setError(saveError.message);
        return;
      }

      setMessage("Settings saved.");
    });
  };

  const changePassword = () => {
    setMessage(null);
    setError(null);

    if (!email) {
      setError("Your account email could not be loaded.");
      return;
    }

    if (newPassword.length < 8) {
      setError("Use at least 8 characters for your new password.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("The new passwords do not match.");
      return;
    }

    startTransition(async () => {
      const supabase = createClient();

      if (provider === "email") {
        const { error: verifyError } = await supabase.auth.signInWithPassword({
          email,
          password: currentPassword,
        });

        if (verifyError) {
          setError("Your current password is incorrect.");
          return;
        }
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage("Password changed successfully.");
    });
  };

  const signOutEverywhere = () => {
    startTransition(async () => {
      const supabase = createClient();
      await supabase.auth.signOut({ scope: "global" });
      router.replace("/login");
      router.refresh();
    });
  };

  return (
    <div className="mt-8 grid gap-6 xl:grid-cols-2">
      <AutoDismissAlert
        message={message}
        error={error}
        onDismiss={() => setMessage(null)}
        className="xl:col-span-2"
      />

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
            <Sun size={21} />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-semibold text-slate-800">
              Appearance
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Choose how BookIt looks on this device.
            </p>

            <div className="mt-5 grid grid-cols-3 gap-2">
              {[
                { value: "light" as const, label: "Light", icon: Sun },
                { value: "dark" as const, label: "Dark", icon: Moon },
                { value: "system" as const, label: "System", icon: Laptop },
              ].map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    savePreferences({ ...preferences, theme: value })
                  }
                  className={`flex h-11 items-center justify-center gap-2 rounded-lg border text-sm font-semibold transition ${
                    preferences.theme === value
                      ? "border-primary-200 bg-primary-50 text-primary-700"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
            <ShieldCheck size={21} />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-semibold text-slate-800">
              Notifications & reminders
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Control in-app updates. Reminder notifications appear in Messages
              at the selected lead time.
            </p>

            <div className="mt-5 space-y-3">
              {[
                {
                  key: "booking_updates" as const,
                  label: "Booking updates",
                },
                {
                  key: "study_group_updates" as const,
                  label: "Study-group updates",
                },
                {
                  key: "reminder_enabled" as const,
                  label: "Session reminders",
                },
              ].map(({ key, label }) => (
                <label
                  key={key}
                  className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700"
                >
                  {label}
                  <input
                    type="checkbox"
                    checked={preferences[key]}
                    onChange={(event) =>
                      savePreferences({
                        ...preferences,
                        [key]: event.target.checked,
                      })
                    }
                    className="h-4 w-4 accent-primary-600"
                  />
                </label>
              ))}

              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-600">
                  Remind me before a session
                </label>
                <select
                  value={preferences.reminder_hours}
                  onChange={(event) =>
                    savePreferences({
                      ...preferences,
                      reminder_hours: Number(event.target.value),
                    })
                  }
                  disabled={!preferences.reminder_enabled}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm disabled:bg-slate-100"
                >
                  {[1, 2, 6, 12, 24, 48].map((hours) => (
                    <option key={hours} value={hours}>
                      {hours === 24
                        ? "1 day before"
                        : hours === 48
                          ? "2 days before"
                          : `${hours} hour${hours === 1 ? "" : "s"} before`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
            <KeyRound size={21} />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-semibold text-slate-800">
              Change password
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              {provider && provider !== "email"
                ? `You currently sign in with ${provider}. You can still set a BookIt password below.`
                : "Confirm your current password, then choose a new one."}
            </p>

            <div className="mt-5 space-y-3">
              {provider === "email" && (
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  placeholder="Current password"
                  className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm"
                />
              )}
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="New password"
                className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm"
              />
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Confirm new password"
                className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm"
              />
            </div>

            <button
              type="button"
              onClick={changePassword}
              disabled={pending}
              className="mt-4 h-10 rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
            >
              {pending ? "Saving..." : "Change Password"}
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
            <LogOut size={21} />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-semibold text-slate-800">
              Session security
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Sign out of BookIt on all devices if you think your account is
              still active somewhere else.
            </p>

            <button
              type="button"
              onClick={signOutEverywhere}
              disabled={pending}
              className="mt-5 h-10 rounded-lg border border-red-200 px-4 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
            >
              Sign out of all devices
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
