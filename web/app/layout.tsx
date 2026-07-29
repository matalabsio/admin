import type { Metadata, Viewport } from "next";
import { AuthSessionProvider } from "@/components/auth/auth-session-provider";
import "./globals.css";

export const metadata: Metadata = {
  applicationName: "BandForge Admin",
  title: {
    default: "BandForge Admin",
    template: "%s · BandForge Admin",
  },
  description: "Internal BandForge admin and evaluator portal.",
  robots: { index: false, follow: false },
  icons: {
    icon: [
      { url: "/icon.png", type: "image/png", sizes: "32x32" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/apple-icon.png", type: "image/png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0d1f3c",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-dvh font-sans" suppressHydrationWarning>
        <AuthSessionProvider>{children}</AuthSessionProvider>
      </body>
    </html>
  );
}
