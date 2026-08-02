import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { ArrowUpRight, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { adminCard } from "@/components/admin/admin-ui";

type AdminKpiCardProps = {
  label: string;
  value: string | number;
  hint?: string;
  Icon: LucideIcon;
  accent?: "teal" | "amber" | "violet" | "emerald";
  href?: string;
  trendPct?: number | null;
  badge?: string;
  className?: string;
};

const accentStyles = {
  teal: {
    icon: "bg-[#E6F6F8] text-cyan",
    badge: "bg-[#E0F5F8] text-teal",
    ring: "hover:border-cyan/35 focus-visible:ring-cyan/30",
  },
  amber: {
    icon: "bg-[#FBF1D9] text-[#B7791F]",
    badge: "bg-[#FBF1D9] text-[#B7791F]",
    ring: "hover:border-[#B7791F]/30 focus-visible:ring-[#B7791F]/25",
  },
  violet: {
    icon: "bg-violet-100 text-violet-600",
    badge: "bg-violet-100 text-violet-700",
    ring: "hover:border-violet-300 focus-visible:ring-violet-300/40",
  },
  emerald: {
    icon: "bg-emerald-100 text-emerald-600",
    badge: "bg-emerald-100 text-emerald-700",
    ring: "hover:border-emerald-300 focus-visible:ring-emerald-300/40",
  },
} as const;

function TrendPill({ pct }: { pct: number }) {
  const up = pct >= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10.5px] font-bold tabular-nums",
        up ? "bg-[#E0F5F8] text-teal" : "bg-rose-100 text-rose-700",
      )}
      title={`${up ? "+" : ""}${pct}% vs prior week`}
    >
      {up ? (
        <TrendingUp className="size-2.5" aria-hidden />
      ) : (
        <TrendingDown className="size-2.5" aria-hidden />
      )}
      {up ? "+" : "−"}
      {Math.abs(pct)}%
    </span>
  );
}

export function AdminKpiCard({
  label,
  value,
  hint,
  Icon,
  accent = "teal",
  href,
  trendPct,
  badge,
  className,
}: AdminKpiCardProps) {
  const styles = accentStyles[accent];

  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-[12px]",
            styles.icon,
          )}
        >
          <Icon className="size-5" strokeWidth={2} aria-hidden />
        </div>
        <div className="flex items-center gap-2">
          {badge ? (
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10.5px] font-bold",
                styles.badge,
              )}
            >
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  accent === "amber" ? "bg-[#B7791F]" : "bg-teal",
                )}
                aria-hidden
              />
              {badge}
            </span>
          ) : trendPct != null ? (
            <TrendPill pct={trendPct} />
          ) : null}
          {href ? (
            <span
              className="flex size-7 items-center justify-center rounded-full bg-[#F4F7FA] text-[#94A3B8] transition-colors group-hover:bg-cyan-soft group-hover:text-teal"
              aria-hidden
            >
              <ArrowUpRight className="size-3.5" strokeWidth={2.4} />
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-auto pt-5">
        <p className="font-mono text-[28px] font-medium leading-none tracking-tight text-navy tabular-nums sm:text-[30px]">
          {value}
        </p>
        <p className="mt-2.5 font-display text-[13.5px] font-bold leading-snug text-navy">
          {label}
        </p>
        {hint ? (
          <p className="mt-0.5 text-[12px] leading-snug text-[#94A3B8]">{hint}</p>
        ) : null}
      </div>
    </>
  );

  const cardClass = cn(
    adminCard,
    "group flex min-h-[148px] flex-col",
    href &&
      cn(
        "cursor-pointer transition-all duration-200",
        "hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(13,31,60,0.08)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        styles.ring,
      ),
    className,
  );

  if (href) {
    return (
      <Link href={href} className={cardClass} aria-label={`${label}: ${value}. View details`}>
        {content}
      </Link>
    );
  }

  return <div className={cardClass}>{content}</div>;
}
