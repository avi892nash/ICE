import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "ICE Demo — Interactive Connectivity Establishment",
  description:
    "A Next.js demo that explains how WebRTC's ICE protocol works, with a live peer-to-peer connection and a candid look at its limitations.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">
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
          <div className="max-w-5xl mx-auto px-6 py-6 text-xs text-slate-500">
            Built with Next.js to demonstrate WebRTC ICE. Educational use only.
          </div>
        </footer>
      </body>
    </html>
  );
}
