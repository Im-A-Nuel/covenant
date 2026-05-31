import type { Metadata } from "next";
import { Space_Grotesk, Hanken_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

// Body / UI sans
const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

// Geometric grotesk for display headings — the Covenant signature voice
const display = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

// Monospace
const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

const SITE_URL = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000";
const TITLE = "Covenant · Policy-Bound x402 Payments for Autonomous Agents";
const DESCRIPTION =
  "Let agents pay, but only under covenant. Policy-bound x402 payments using MetaMask Smart Accounts and ERC-7710 delegated permissions.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  applicationName: "Covenant",
  keywords: [
    "x402",
    "ERC-7710",
    "MetaMask Smart Accounts",
    "delegated permissions",
    "autonomous agents",
    "agent payments",
    "Venice AI",
    "Base",
  ],
  openGraph: {
    type: "website",
    siteName: "Covenant",
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${hanken.variable} ${display.variable} ${jetbrains.variable}`}
    >
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
