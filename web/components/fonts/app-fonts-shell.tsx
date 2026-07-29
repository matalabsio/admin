import { Bricolage_Grotesque, DM_Mono, DM_Sans } from "next/font/google";
import type { ReactNode } from "react";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: ["700", "800"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

/** App/admin typography — full next/font bundle for dashboard UI. */
export function AppFontsShell({ children }: { children: ReactNode }) {
  return (
    <div
      className={`${bricolage.variable} ${dmSans.variable} ${dmMono.variable} min-h-dvh`}
    >
      {children}
    </div>
  );
}
