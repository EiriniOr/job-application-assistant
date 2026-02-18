import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { UserButton } from "@/components/user-button";
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
  title: "JobbaJobba",
  description: "AI-powered job search and application tracking",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col bg-gradient-to-br from-slate-950 via-purple-950 to-indigo-950`}>
        <Providers>
          <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-purple-500/20 shadow-lg">
            <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
              <Link href="/" className="font-bold text-xl bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
                JobbaJobba
              </Link>
              <div className="flex items-center gap-1">
                <Link href="/jobs" className="px-4 py-2 rounded-lg text-sm font-medium text-purple-200 hover:text-white hover:bg-purple-500/20 transition-colors">
                  Jobs
                </Link>
                <Link href="/applications" className="px-4 py-2 rounded-lg text-sm font-medium text-purple-200 hover:text-white hover:bg-purple-500/20 transition-colors">
                  Applications
                </Link>
                <Link href="/resumes" className="px-4 py-2 rounded-lg text-sm font-medium text-purple-200 hover:text-white hover:bg-purple-500/20 transition-colors">
                  Resumes
                </Link>
                <div className="ml-4 pl-4 border-l border-purple-500/30">
                  <UserButton />
                </div>
              </div>
            </nav>
          </header>
          <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
          <footer className="mt-auto py-6 text-center text-purple-400/60 text-sm border-t border-purple-500/10">
            Made by <a href="https://eirini-portfolio-aer3.vercel.app/" target="_blank" rel="noreferrer" className="text-fuchsia-400/80 hover:text-fuchsia-300 transition-colors">Eirini Ornithopoulou</a>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
