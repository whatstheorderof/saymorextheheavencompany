import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://saymorextheheavencompany.vercel.app"),
  title: {
    default: "The Implementation Imperative 2026",
    template: "%s | Say More x The Heaven Company"
  },
  description: "How to Embed Inclusion and Belonging. A Say More x The Heaven Company collaboration game, created by Savine Agency.",
  openGraph: {
    title: "The Implementation Imperative 2026",
    description: "How to Embed Inclusion and Belonging. A Say More x The Heaven Company collaboration game, created by Savine Agency.",
    url: "/",
    siteName: "Say More x The Heaven Company",
    images: [
      {
        url: "/assets/say-more-card-logo.png",
        width: 1200,
        height: 630,
        alt: "Say More x The Heaven Company"
      }
    ],
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "The Implementation Imperative 2026",
    description: "How to Embed Inclusion and Belonging. A Say More x The Heaven Company collaboration game, created by Savine Agency.",
    images: ["/assets/say-more-card-logo.png"]
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
