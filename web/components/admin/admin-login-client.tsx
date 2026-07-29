"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AuthInput } from "@/components/auth/auth-form-fields";
import { useAuthSession } from "@/components/auth/auth-session-provider";
import { isAdminRole } from "@/lib/admin-roles";
import { ApiError } from "@/lib/api";
import { login, logout } from "@/lib/auth";
import { adminBtnPrimary, adminBtnSecondary, adminLink } from "@/components/admin/admin-ui";
import { loginSchema, type LoginInput } from "@/lib/validators";

const ADMIN_DASHBOARD_PATH = "/admin";

const ERROR_MESSAGES: Record<string, string> = {
  access_denied:
    "This account is not authorized for admin access. Sign in with the configured admin email.",
  session_expired: "Your session expired. Please sign in again.",
  not_authorized: "This account is not authorized for admin access.",
};

function safeNextPath(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return ADMIN_DASHBOARD_PATH;
  if (!raw.startsWith("/admin")) return ADMIN_DASHBOARD_PATH;
  if (raw.startsWith("/admin/login")) return ADMIN_DASHBOARD_PATH;
  return raw;
}

function redirectToAdminDashboard() {
  // Fresh login sets cookies on the API response — go straight to the dashboard.
  window.location.replace(ADMIN_DASHBOARD_PATH);
}

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNextPath(searchParams.get("next"));
  const errorCode = searchParams.get("error");
  const [formError, setFormError] = useState<string | null>(
    errorCode ? (ERROR_MESSAGES[errorCode] ?? "Sign in failed.") : null,
  );
  const { user, loading, isAuthenticated } = useAuthSession();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    if (loading || !isAuthenticated || !user) return;
    if (isAdminRole(user.role) && user.is_active !== false) {
      redirectToAdminDashboard();
    }
  }, [loading, isAuthenticated, user]);

  const onSubmit = handleSubmit(async (data) => {
    setFormError(null);
    try {
      const auth = await login({ email: data.email, password: data.password });
      if (!isAdminRole(auth.user.role) || auth.user.is_active === false) {
        await logout();
        setFormError(ERROR_MESSAGES.access_denied);
        return;
      }
      redirectToAdminDashboard();
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) {
        setFormError(
          e.message.includes("not authorized")
            ? ERROR_MESSAGES.not_authorized
            : e.message,
        );
        return;
      }
      setFormError(
        e instanceof ApiError ? e.message : "Could not sign in. Check your email and password.",
      );
    }
  });

  const signOutAndRetry = async () => {
    await logout();
    router.replace(`/admin/login?next=${encodeURIComponent(next)}`);
    router.refresh();
  };

  if (!loading && isAuthenticated && user && !isAdminRole(user.role)) {
    return (
      <div className="space-y-4">
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-gray-800">
          Signed in as <span className="font-semibold">{user.email}</span>, which does not have
          admin access.
        </p>
        <button
          type="button"
          onClick={() => void signOutAndRetry()}
          className={adminBtnSecondary}
        >
          Sign out and use admin account
        </button>
        <p className="text-center text-sm text-gray-600">
          <Link href="/dashboard" className={adminLink}>
            Go to student dashboard
          </Link>
        </p>
      </div>
    );
  }

  if (!loading && isAuthenticated && user && isAdminRole(user.role)) {
    return <p className="text-sm text-gray-700">Redirecting to admin dashboard…</p>;
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
      <AuthInput
        id="email"
        label="Admin email"
        type="email"
        autoComplete="username"
        inputMode="email"
        error={errors.email}
        {...register("email")}
      />
      <AuthInput
        id="password"
        label="Password"
        type="password"
        autoComplete="current-password"
        error={errors.password}
        {...register("password")}
      />

      {formError ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-meta font-medium text-danger" role="alert">
          {formError}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className={`${adminBtnPrimary} w-full py-3`}
      >
        {isSubmitting ? "Signing in…" : "Sign in to admin"}
      </button>

      <p className="text-center text-sm text-gray-600">
        <Link href="/" className={adminLink}>
          ← Back to BandForge
        </Link>
      </p>
    </form>
  );
}

export function AdminLoginClient() {
  return (
    <Suspense fallback={<p className="text-sm text-gray-700">Loading…</p>}>
      <AdminLoginForm />
    </Suspense>
  );
}
