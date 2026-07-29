import { cn } from "@/lib/utils";

const barHeights = ["42%", "62%", "81%", "100%"] as const;

type BfBrandBarsProps = {
  size?: "footer" | "sm" | "md" | "lg" | "card";
  className?: string;
};

const sizeConfig = {
  footer: { bar: "w-[4.5px]", gap: "gap-[3px]", height: "h-[18px]" },
  sm: { bar: "w-[5px]", gap: "gap-[3px]", height: "h-5" },
  md: { bar: "w-[11px]", gap: "gap-2", height: "h-12" },
  lg: { bar: "w-[6px]", gap: "gap-1", height: "h-6" },
  card: { bar: "w-[13px]", gap: "gap-1.5", height: "h-14" },
} as const;

/** BandForge equalizer-style brand mark from marketing designs. */
export function BfBrandBars({ size = "lg", className }: BfBrandBarsProps) {
  const { bar, gap, height } = sizeConfig[size];

  return (
    <div
      className={cn("flex items-end", gap, height, className)}
      aria-hidden
    >
      {barHeights.map((h, i) => (
        <div
          key={h}
          className={cn(
            bar,
            "rounded-sm",
            i < 2 ? "bg-teal" : "bg-cyan",
          )}
          style={{ height: h }}
        />
      ))}
    </div>
  );
}
