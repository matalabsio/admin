import Image from "next/image";
import Link from "next/link";
import bandforgeLogo from "@/modules/listening/img/logo.png";
import { cn } from "@/lib/utils";

const sizeClass = {
  nav: "h-8 w-auto max-w-[190px] sm:h-9 sm:max-w-[210px]",
  sm: "h-7 w-auto max-w-[180px] sm:max-w-[200px]",
  md: "h-9 w-auto max-w-[220px] sm:h-10 sm:max-w-[260px]",
  lg: "h-10 w-auto max-w-[260px] sm:h-11 sm:max-w-[300px]",
} as const;

type BandForgeLogoLinkProps = {
  href?: string;
  size?: keyof typeof sizeClass;
  className?: string;
  priority?: boolean;
};

/** Brand logo — links home by default. */
export function BandForgeLogoLink({
  href = "/",
  size = "md",
  className,
  priority = false,
}: BandForgeLogoLinkProps) {
  return (
    <Link
      href={href}
      prefetch
      className={cn(
        "inline-flex shrink-0 items-center transition-opacity duration-200 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan/40 focus-visible:ring-offset-2 rounded-sm",
        className,
      )}
      aria-label="BandForge home"
    >
      <Image
        src={bandforgeLogo}
        alt="BandForge — AI-powered IELTS preparation"
        width={bandforgeLogo.width}
        height={bandforgeLogo.height}
        priority={priority}
        className={cn("object-contain object-left", sizeClass[size])}
      />
    </Link>
  );
}
