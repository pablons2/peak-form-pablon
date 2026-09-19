import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

// Registers the exact font family globals.css already references by name
// (see docs/design-system.md) — no CSS variable indirection needed since
// next/font registers under this family by default.
//
// IBM Plex Mono (--font-mono, "Numeric/code contexts" per the design
// system) is intentionally not wired here yet — load it the same way, via
// next/font/google, in whichever component first needs font-mono (e.g. the
// set-logging/rest-timer UI in PRD 07), rather than speculatively here.
const sans = Plus_Jakarta_Sans({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "PeakForm",
  description: "Training, nutrition, and progress — under professional supervision.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={sans.className}>
      <body>{children}</body>
    </html>
  );
}
