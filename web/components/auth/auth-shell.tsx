import Link from "next/link";
import { BandForgeLogoLink } from "@/components/bandforge/bandforge-logo-link";
import { AuthAntigravity } from "@/components/auth/auth-antigravity";

type AuthShellProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
};

/**
 * Single-column auth layout — white bg, antigravity particles, content centered.
 */
export function AuthShell({ title, subtitle, children }: AuthShellProps) {
  return (
    <div className="bf-auth relative flex min-h-dvh flex-col overflow-hidden bg-white text-[#081B33]">
      <AuthAntigravity />

      <header className="bf-auth-enter relative z-10 flex justify-center px-6 pt-8 sm:px-8 sm:pt-10">
        <BandForgeLogoLink
          size="md"
          priority
          className="[&_img]:object-center"
        />
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center px-6 py-12 sm:max-w-md sm:px-8">
        <h1 className="bf-auth-enter w-full text-center font-display text-[2rem] leading-[1.1] font-bold tracking-[-0.04em] text-[#081B33] sm:text-[2.75rem] md:text-[3.5rem]">
          {title}
        </h1>
        {subtitle ? (
          <p
            className="bf-auth-enter mx-auto mt-4 max-w-[28ch] text-center text-base leading-relaxed text-[#081B33]/60 sm:text-lg"
            style={{ animationDelay: "100ms" }}
          >
            {subtitle}
          </p>
        ) : null}

        <div
          className="bf-auth-enter mt-10 w-full sm:mt-12"
          style={{ animationDelay: "200ms" }}
        >
          {children}
        </div>
      </main>

      <footer
        className="bf-auth-enter relative z-10 px-6 py-8 text-center sm:px-8 sm:py-10"
        style={{ animationDelay: "400ms" }}
      >
        <p className="mx-auto max-w-sm text-sm leading-relaxed text-[#081B33]/45">
          By continuing, you agree to our{" "}
          <Link
            href="/terms"
            prefetch
            className="cursor-pointer font-medium text-[#081B33]/60 underline-offset-2 transition-colors duration-200 hover:text-[#00A9C0] hover:underline"
          >
            Terms
          </Link>{" "}
          and{" "}
          <Link
            href="/privacy-policy"
            prefetch
            className="cursor-pointer font-medium text-[#081B33]/60 underline-offset-2 transition-colors duration-200 hover:text-[#00A9C0] hover:underline"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </footer>
    </div>
  );
}
