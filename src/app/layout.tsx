import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthSessionProvider } from "@/providers/session-provider";
import { QueryProvider } from "@/providers/query-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  adjustFontFallback: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  adjustFontFallback: true,
});

export const metadata: Metadata = {
  title: "AI Code Trust",
  description:
    "Trust score and ship-readiness verdict for AI-generated and human-written code.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full scroll-smooth antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans antialiased [font-synthesis:none]">
        <AuthSessionProvider>
          <QueryProvider>
            <div className="relative flex min-h-0 w-full min-w-0 flex-1 flex-col">{children}</div>
          </QueryProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
