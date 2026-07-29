"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import { BfBrandBars } from "@/components/bandforge/bf-brand-bars";
import { ADMIN_BOTTOM_NAV, ADMIN_TOP_NAV } from "@/components/admin/admin-nav";
import { cn } from "@/lib/utils";

type ActiveMatchable = {
  href: string;
  exact?: boolean;
  match?: string[];
};

function matchLength(pathname: string, item: ActiveMatchable): number {
  const prefixes = item.exact ? [item.href] : [item.href, ...(item.match ?? [])];
  let best = -1;
  for (const prefix of prefixes) {
    const hit = item.exact
      ? pathname === prefix
      : pathname === prefix || pathname.startsWith(`${prefix}/`);
    if (hit) best = Math.max(best, prefix.length);
  }
  return best;
}

/**
 * Returns the index of the single nav item that should be active.
 * The most specific (longest) matching prefix wins; ties resolve to the
 * first item, so duplicate destinations never highlight more than one tab.
 */
function activeNavIndex(pathname: string, items: ActiveMatchable[]): number {
  let activeIndex = -1;
  let activeLen = -1;
  items.forEach((item, index) => {
    const len = matchLength(pathname, item);
    if (len > activeLen) {
      activeLen = len;
      activeIndex = index;
    }
  });
  return activeIndex;
}

function AdminWordmark() {
  return (
    <Link
      href="/admin"
      prefetch
      className="inline-flex shrink-0 items-center gap-[11px]"
      aria-label="BandForge admin"
    >
      <BfBrandBars size="lg" className="[&_div]:bg-teal [&_div:nth-child(3)]:bg-cyan [&_div:nth-child(4)]:bg-cyan" />
      <span className="font-display text-[1.1875rem] font-extrabold leading-none tracking-[-0.025em]">
        <span className="text-white">Band</span>
        <span className="text-cyan">Forge</span>
      </span>
      <span className="rounded-md bg-cyan px-2 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-navy">
        Admin
      </span>
    </Link>
  );
}

export function AdminTopNav() {
  const pathname = usePathname();

  const topActiveIndex = activeNavIndex(pathname, ADMIN_TOP_NAV);

  const navLinks = (
    <nav className="flex items-center gap-[26px] text-sm" aria-label="Admin">
      {ADMIN_TOP_NAV.map((item, index) => {
        const active = index === topActiveIndex;
        return (
          <Link
            key={`${item.href}-${item.label}-${index}`}
            href={item.href}
            prefetch
            className={cn(
              "relative pb-1 font-medium transition-colors",
              active
                ? "font-semibold text-white after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-cyan"
                : "text-[#9FB0C8] hover:text-white",
            )}
            aria-current={active ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      <header className="border-b border-white/[0.06] bg-navy">
        <div className="mx-auto flex h-[66px] max-w-[1320px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-6 lg:gap-8">
            <AdminWordmark />
            <div className="hidden lg:block">{navLinks}</div>
          </div>

          <div className="flex items-center gap-3 sm:gap-[18px]">
            <button
              type="button"
              className="relative flex size-10 items-center justify-center rounded-full bg-white/[0.06] text-[#C7D2E1]"
              aria-label="Notifications"
            >
              <Bell className="size-[19px]" strokeWidth={2} />
              <span className="absolute right-2.5 top-2 size-2 rounded-full border border-navy bg-[#E5484D]" />
            </button>

            <div className="flex items-center gap-2.5">
              <div className="hidden text-right sm:block">
                <p className="text-[13px] font-semibold leading-tight text-white">Admin</p>
                <p className="text-[11px] text-[#7689A0]">Super admin</p>
              </div>
              <div className="flex size-10 items-center justify-center rounded-full bg-cyan text-sm font-bold text-navy">
                AD
              </div>
            </div>
          </div>
        </div>
      </header>

      <AdminBottomNav pathname={pathname} />
    </>
  );
}

function AdminBottomNav({ pathname }: { pathname: string }) {
  const activeIndex = activeNavIndex(pathname, ADMIN_BOTTOM_NAV);
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.08] bg-navy/95 backdrop-blur-md lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Admin"
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-around">
        {ADMIN_BOTTOM_NAV.map((item, index) => {
          const active = index === activeIndex;
          const Icon = item.Icon;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                prefetch
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1 px-1 py-2.5 text-[10.5px] font-medium transition-colors",
                  active ? "text-cyan" : "text-[#9FB0C8] hover:text-white",
                )}
              >
                <Icon className="size-[22px]" strokeWidth={2} aria-hidden />
                <span className="leading-none">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
