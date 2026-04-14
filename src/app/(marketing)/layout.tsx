import { Cormorant_Garamond } from "next/font/google";
import { MarketingStickyHeader } from "@/components/marketing-sticky-header";

const heroSerif = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-hero-serif",
  display: "swap",
  adjustFontFallback: true,
});

/**
 * Public marketing routes share the same sticky header and setup notices so
 * loading and redirect states are not missing the banner that only lived in LandingView before.
 */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`flex min-h-screen flex-col ${heroSerif.variable}`}>
      <MarketingStickyHeader />
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
