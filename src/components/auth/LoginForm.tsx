"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Eye,
  EyeOff,
} from "lucide-react";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  loginSchema,
  type LoginFormValues,
} from "@/schemas/authSchema";

import {
  login,
  type LoginMode,
} from "@/lib/auth/actions";
import SocialAuthButtons from "./SocialAuthButtons";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const requestedMode: LoginMode =
    searchParams.get("mode") === "mentor"
      ? "mentor"
      : "mentee";

  const [mode, setMode] = useState<LoginMode>(requestedMode);

  const redirectTo =
    searchParams.get("redirectTo") ||
    (mode === "mentor" ? "/mentor/dashboard" : "/dashboard");

  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(
    searchParams.get("error") === "mentor_required"
      ? "This account is not registered as a mentor. Switch to Mentee Login or contact an administrator."
      : null
  );

  const {
    register,
    handleSubmit,
    formState: {
      errors,
      isSubmitting,
    },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const changeMode = (nextMode: LoginMode) => {
    setMode(nextMode);
    setServerError(null);

    const params = new URLSearchParams(searchParams.toString());
    if (nextMode === "mentor") {
      params.set("mode", "mentor");
    } else {
      params.delete("mode");
    }
    params.delete("error");

    const query = params.toString();
    router.replace(query ? `/login?${query}` : "/login", { scroll: false });
  };

  const onSubmit = async (values: LoginFormValues) => {
    setServerError(null);

    const result = await login(
      values.email,
      values.password,
      mode
    );

    if (!result.success) {
      setServerError(
        result.error ??
          "Unable to log in. Please try again."
      );
      return;
    }

    router.replace(
      mode === "mentor"
        ? "/mentor/dashboard"
        : redirectTo.startsWith("/mentor")
          ? "/dashboard"
          : redirectTo
    );
    router.refresh();
  };

  return (
    <div className="w-full rounded-2xl border border-slate-200 bg-white p-7 shadow-[0_8px_30px_rgba(15,23,42,0.06)] sm:p-8">

      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight text-slate-800">
          Welcome Back 👋
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          {mode === "mentor"
            ? "Log in to manage your mentor sessions"
            : "Log in to your BookIt account"}
        </p>
      </div>

      {/* Role selector - kept inside the existing login card/design */}
      <div className="mt-6 grid grid-cols-2 rounded-lg border border-slate-200 bg-slate-50 p-1">
        <button
          type="button"
          onClick={() => changeMode("mentee")}
          className={`h-9 rounded-md text-xs font-semibold transition ${
            mode === "mentee"
              ? "bg-white text-primary-700 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Mentee Login
        </button>

        <button
          type="button"
          onClick={() => changeMode("mentor")}
          className={`h-9 rounded-md text-xs font-semibold transition ${
            mode === "mentor"
              ? "bg-white text-primary-700 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Mentor Login
        </button>
      </div>

      {/* Server Error */}
      {serverError && (
        <div
          role="alert"
          className="mt-6 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600"
        >
          {serverError}
          {mode === "mentor" && (
            <button
              type="button"
              onClick={() => changeMode("mentee")}
              className="mt-2 block text-xs font-semibold text-primary-700 hover:text-primary-800"
            >
              Switch to Mentee Login
            </button>
          )}
        </div>
      )}

      {/* Form */}
      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="mt-7 space-y-5"
      >

        {/* Email */}
        <div>
          <label
            htmlFor="email"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Email
          </label>

          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            aria-invalid={Boolean(errors.email)}
            className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
            {...register("email")}
          />

          {errors.email && (
            <p className="mt-1.5 text-xs font-medium text-red-500">
              {errors.email.message}
            </p>
          )}
        </div>

        {/* Password */}
        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <label
              htmlFor="password"
              className="text-sm font-semibold text-slate-700"
            >
              Password
            </label>

            <button
              type="button"
              className="text-xs font-semibold text-primary-700 transition hover:text-primary-800"
            >
              Forgot password?
            </button>
          </div>

          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              aria-invalid={Boolean(errors.password)}
              className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 pr-11 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              {...register("password")}
            />

            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-400 transition hover:text-slate-700"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff size={17} />
              ) : (
                <Eye size={17} />
              )}
            </button>
          </div>

          {errors.password && (
            <p className="mt-1.5 text-xs font-medium text-red-500">
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex h-11 w-full items-center justify-center rounded-lg bg-primary-600 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 disabled:cursor-wait disabled:opacity-60"
        >
          {isSubmitting
            ? "Logging in..."
            : mode === "mentor"
              ? "Log In as Mentor"
              : "Log In"}
        </button>
      </form>

      {/* Divider */}
      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-slate-200" />

        <span className="whitespace-nowrap text-xs text-slate-400">
          or continue with
        </span>

        <div className="h-px flex-1 bg-slate-200" />
      </div>

      {/* Social Auth */}
      <SocialAuthButtons mode={mode} />

      {/* Signup */}
      <p className="mt-6 text-center text-sm text-slate-500">
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="font-semibold text-primary-700 transition hover:text-primary-800 hover:underline"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}
