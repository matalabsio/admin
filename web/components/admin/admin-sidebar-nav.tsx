"use client";

import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { BandForgeLogoLink } from "@/components/bandforge/bandforge-logo-link";
import { ADMIN_NAV } from "@/components/admin/admin-nav";
import { cn } from "@/lib/utils";

type Props = {
  pathname: string;
};

export function AdminSidebarNav({ pathname }: Props) {
  return (
    <>
      <div className="mb-6 px-1">
        <BandForgeLogoLink size="sm" />
        <p className="mt-2 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-500">
          Admin console
        </p>
      </div>

      <nav className="flex flex-1 flex-col gap-6 overflow-y-auto" aria-label="Admin">
        {ADMIN_NAV.map((group) => (
          <div key={group.title || "main"}>
            {group.title ? (
              <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-500">
                {group.title}
              </p>
            ) : null}
            <ul className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const active = item.exact
                  ? pathname === item.href
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition-colors duration-200",
                        active
                          ? "bg-cyan-soft text-teal"
                          : "text-ink hover:bg-surface",
                      )}
                    >
                      <item.Icon
                        className={cn(
                          "size-[18px] shrink-0",
                          active ? "text-cyan" : "text-slate",
                        )}
                        aria-hidden
                      />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="mt-auto space-y-1 border-t border-border pt-4">
        <Link
          href="/dashboard"
          className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-ink transition-colors hover:bg-surface"
        >
          <ArrowLeft className="size-[18px] shrink-0 text-slate" aria-hidden />
          Student app
        </Link>
        <a
          href="https://bandforge.io"
          target="_blank"
          rel="noopener noreferrer"
          className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2.5 text-[13px] font-medium text-slate transition-colors hover:bg-surface"
        >
          <ExternalLink className="size-4 shrink-0" aria-hidden />
          bandforge.io
        </a>
      </div>
    </>
  );
}
