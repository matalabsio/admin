"use client";

import { useEffect, type ReactNode } from "react";
import { AdminTopNav } from "@/components/admin/admin-top-nav";
import { adminHeading, adminPageBg, adminSubtext } from "@/components/admin/admin-ui";
import { cn } from "@/lib/utils";

type AdminShellProps = {
  children: ReactNode;
  title?: string;
  description?: string;
  /** Hide legacy page header (dashboard has its own hero). */
  hidePageHeader?: boolean;
};

export function AdminShell({
  children,
  title = "Admin",
  description,
  hidePageHeader = false,
}: AdminShellProps) {
  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);

  return (
    <div className={cn("relative", adminPageBg)}>
      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:shadow-lg"
      >
        Skip to main content
      </a>

      <AdminTopNav />

      <main
        id="admin-main"
        className="mx-auto w-full max-w-[1320px] flex-1 px-4 py-6 pb-[calc(72px+env(safe-area-inset-bottom))] sm:px-6 sm:py-8 lg:px-8 lg:pb-8"
      >
        {!hidePageHeader && title ? (
          <header className="mb-6">
            <h1 className={cn(adminHeading, "text-2xl sm:text-[1.875rem]")}>{title}</h1>
            {description ? (
              <p className={cn(adminSubtext, "mt-1")}>{description}</p>
            ) : null}
          </header>
        ) : null}
        {children}
      </main>
    </div>
  );
}
