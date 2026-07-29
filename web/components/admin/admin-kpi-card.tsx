import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { TrendingDown, TrendingUp } from "lucide-react";
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
    trend: "bg-[#E0F5F8] text-teal",
  },
  amber: {
    icon: "bg-[#FBF1D9] text-[#B7791F]",
    trend: "bg-[#FBF1D9] text-[#B7791F]",
  },
  violet: {
    icon: "bg-violet-100 text-violet-600",
    trend: "bg-violet-100 text-violet-700",
  },
  emerald: {
    icon: "bg-emerald-100 text-emerald-600",
    trend: "bg-emerald-100 text-emerald-700",
  },
} as const;

function TrendPill({ pct }: { pct: number }) {
  const up = pct >= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-2 py-1 text-[11px] font-bold",
        up ? "bg-[#E0F5F8] text-teal" : "bg-rose-100 text-rose-700",
      )}
    >
      {up ? (
        <TrendingUp className="size-2.5" aria-hidden />
      ) : (
        <TrendingDown className="size-2.5" aria-hidden />
      )}
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

  const inner = (
    <div className="flex h-full flex-col">
      <div className="mb-[18px] flex items-start justify-between gap-2">
        <div
          className={cn(
            "flex size-[42px] shrink-0 items-center justify-center rounded-xl",
            styles.icon,
          )}
        >
          <Icon className="size-[21px]" strokeWidth={2} aria-hidden />
        </div>
        {badge ? (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold",
              styles.trend,
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
      </div>
      <p className="font-mono text-[30px] font-medium leading-none text-navy tabular-nums">
        {value}
      </p>
      <p className="mt-[11px] font-display text-sm font-bold text-navy">{label}</p>
      {hint ? (
        <p className="mt-0.5 text-xs text-[#94A3B8]">{hint}</p>
      ) : null}
    </div>
  );

  const cardClass = cn(
    adminCard,
    "transition-all duration-200",
    href && "cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(13,31,60,0.08)]",
    className,
  );

  if (href) {
    return (
      <Link href={href} className={cardClass}>
        {inner}
      </Link>
    );
  }

  return <div className={cardClass}>{inner}</div>;
}
