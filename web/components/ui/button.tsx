import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "teal";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-navy text-white hover:bg-navy/90 focus-visible:ring-navy/40",
  secondary:
    "border border-navy/20 bg-white text-navy hover:border-teal hover:bg-surface focus-visible:ring-teal/30",
  ghost:
    "text-teal hover:bg-cyan/10 focus-visible:ring-teal/30",
  teal: "bg-teal text-white hover:bg-cyan-light focus-visible:ring-teal/40",
};

export function Button({
  variant = "primary",
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex cursor-pointer items-center justify-center rounded-md px-4 py-2.5 text-body font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none",
        "min-h-[var(--spacing-touch)] min-w-[var(--spacing-touch)] sm:min-w-0",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
