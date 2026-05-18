import type { Metadata, Viewport } from "next";
import Link from "next/link";
import Script from "next/script";
import "./globals.css";

const SITE_URL = "https://avi892nash.github.io/ICE";
const SITE_NAME = "ICE Demo";
const SITE_TITLE = "ICE Demo — Interactive Connectivity Establishment";
const SITE_DESCRIPTION =
  "A Next.js demo of WebRTC's ICE protocol (RFC 8445): live two-peer connection, candidate explorer, animated algorithm simulator across 4 network topologies, and a candid look at why ICE fails 10–15% of the time in production.";

export const viewport: Viewport = {
  themeColor: "#0284c7",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: "%s · ICE Demo",
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: "avi892nash", url: "https://github.com/avi892nash" }],
  creator: "avi892nash",
  publisher: "avi892nash",
  category: "technology",
  keywords: [
    "WebRTC",
    "ICE",
    "Interactive Connectivity Establishment",
    "RFC 8445",
    "STUN",
    "TURN",
    "peer-to-peer",
    "NAT traversal",
    "WebRTC tutorial",
    "WebRTC demo",
    "Next.js",
  ],
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: "/og-image.png",
        width: 1024,
        height: 1024,
        alt: "ICE Demo — Interactive Connectivity Establishment for WebRTC",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/og-image.png"],
  },
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/favicon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
    shortcut: "/favicon-32.png",
  },
  manifest: "/manifest.webmanifest",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
};

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: SITE_NAME,
  alternateName: "Interactive Connectivity Establishment Demo",
  description: SITE_DESCRIPTION,
  url: SITE_URL,
  applicationCategory: "DeveloperApplication",
  applicationSubCategory: "Educational",
  operatingSystem: "Any",
  browserRequirements: "Requires JavaScript and a modern browser with WebRTC support",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  author: {
    "@type": "Person",
    name: "avi892nash",
    url: "https://github.com/avi892nash",
  },
  about: [
    { "@type": "Thing", name: "WebRTC" },
    { "@type": "Thing", name: "Interactive Connectivity Establishment (ICE)" },
    { "@type": "Thing", name: "STUN" },
    { "@type": "Thing", name: "TURN" },
    { "@type": "Thing", name: "Peer-to-peer networking" },
  ],
  isAccessibleForFree: true,
  inLanguage: "en",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <Script
          id="ld-json-webapp"
          type="application/ld+json"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
        />
        <header className="border-b border-slate-200 bg-white">
          <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-md bg-gradient-to-br from-ice-400 to-ice-600 flex items-center justify-center text-white font-bold text-sm">
                ICE
              </div>
              <span className="font-semibold text-slate-900">
                Interactive Connectivity Establishment
              </span>
            </Link>
            <nav className="flex items-center gap-6 text-sm">
              <Link href="/" className="text-slate-600 hover:text-ice-600">
                Overview
              </Link>
              <Link
                href="/algorithm"
                className="text-slate-600 hover:text-ice-600"
              >
                Algorithm
              </Link>
              <Link href="/demo" className="text-slate-600 hover:text-ice-600">
                Live Demo
              </Link>
              <Link
                href="/candidates"
                className="text-slate-600 hover:text-ice-600"
              >
                Candidates
              </Link>
              <Link
                href="/limitations"
                className="text-slate-600 hover:text-ice-600"
              >
                Limitations
              </Link>
            </nav>
          </div>
        </header>
        <main className="max-w-5xl mx-auto px-6 py-10">{children}</main>
        <footer className="border-t border-slate-200 mt-20">
          <div className="max-w-5xl mx-auto px-6 py-6 text-xs text-slate-500 flex flex-col sm:flex-row gap-2 sm:gap-4 sm:items-center justify-between">
            <span>
              Built with Next.js to demonstrate WebRTC ICE. Educational use
              only.
            </span>
            <a
              href="https://github.com/avi892nash/ICE"
              target="_blank"
              rel="noopener noreferrer"
              className="text-ice-600 hover:text-ice-700 hover:underline whitespace-nowrap"
            >
              View on GitHub →
            </a>
          </div>
        </footer>
      </body>
    </html>
  );
}
