import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import Link from "next/link";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Job Application Assistant",
  description: "AI-powered job search and application tracking",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-gray-50`}>
        <Providers>
          <header className="sticky top-0 z-50 bg-white border-b">
            <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
              <Link href="/" className="font-semibold text-lg">
                Job Assistant
              </Link>
              <div className="flex gap-6 text-sm">
                <Link href="/jobs" className="text-gray-600 hover:text-gray-900">
                  Jobs
                </Link>
                <Link href="/applications" className="text-gray-600 hover:text-gray-900">
                  Applications
                </Link>
                <Link href="/resumes" className="text-gray-600 hover:text-gray-900">
                  Resumes
                </Link>
              </div>
            </nav>
          </header>
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
