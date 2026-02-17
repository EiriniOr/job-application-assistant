"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { getApplications } from "@/lib/supabase-storage";
import type { Application } from "@/lib/api";
import { Briefcase, FileText, Clock, Trophy, Loader2, Rocket, Sparkles } from "lucide-react";
import Link from "next/link";

// SVG of cartoon people rushing to work
const PeopleIllustration = () => (
  <svg viewBox="0 0 400 200" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Person 1 - Running with briefcase */}
    <g transform="translate(40, 60)">
      <circle cx="20" cy="15" r="15" fill="#fbbf24" /> {/* Head */}
      <rect x="10" y="30" width="20" height="35" rx="5" fill="#3b82f6" /> {/* Body */}
      <rect x="5" y="65" width="8" height="25" rx="3" fill="#1e3a5f" transform="rotate(-20 5 65)" /> {/* Leg */}
      <rect x="27" y="65" width="8" height="25" rx="3" fill="#1e3a5f" transform="rotate(15 27 65)" /> {/* Leg */}
      <rect x="30" y="40" width="15" height="10" rx="2" fill="#f97316" /> {/* Briefcase */}
      <circle cx="15" cy="12" r="2" fill="#1e3a5f" /> {/* Eye */}
      <circle cx="25" cy="12" r="2" fill="#1e3a5f" /> {/* Eye */}
      <path d="M15 20 Q20 24 25 20" stroke="#1e3a5f" strokeWidth="2" fill="none" /> {/* Smile */}
    </g>

    {/* Person 2 - Jumping with laptop */}
    <g transform="translate(140, 50)">
      <circle cx="20" cy="15" r="15" fill="#ec4899" /> {/* Head */}
      <rect x="10" y="30" width="20" height="35" rx="5" fill="#8b5cf6" /> {/* Body */}
      <rect x="8" y="65" width="8" height="25" rx="3" fill="#1e3a5f" transform="rotate(-30 8 65)" /> {/* Leg */}
      <rect x="24" y="65" width="8" height="25" rx="3" fill="#1e3a5f" transform="rotate(30 24 65)" /> {/* Leg */}
      <rect x="30" y="35" width="18" height="12" rx="2" fill="#374151" /> {/* Laptop */}
      <rect x="32" y="37" width="14" height="8" rx="1" fill="#60a5fa" /> {/* Screen */}
      <circle cx="15" cy="12" r="2" fill="#1e3a5f" />
      <circle cx="25" cy="12" r="2" fill="#1e3a5f" />
      <path d="M14 20 Q20 26 26 20" stroke="#1e3a5f" strokeWidth="2" fill="none" />
    </g>

    {/* Person 3 - Walking with coffee */}
    <g transform="translate(250, 70)">
      <circle cx="20" cy="15" r="15" fill="#34d399" /> {/* Head */}
      <rect x="10" y="30" width="20" height="35" rx="5" fill="#f97316" /> {/* Body */}
      <rect x="5" y="65" width="8" height="25" rx="3" fill="#1e3a5f" transform="rotate(-10 5 65)" />
      <rect x="27" y="65" width="8" height="25" rx="3" fill="#1e3a5f" transform="rotate(10 27 65)" />
      <rect x="-5" y="40" width="8" height="12" rx="2" fill="#fbbf24" /> {/* Coffee cup */}
      <circle cx="15" cy="12" r="2" fill="#1e3a5f" />
      <circle cx="25" cy="12" r="2" fill="#1e3a5f" />
      <path d="M15 20 Q20 24 25 20" stroke="#1e3a5f" strokeWidth="2" fill="none" />
    </g>

    {/* Person 4 - Celebrating */}
    <g transform="translate(330, 55)">
      <circle cx="20" cy="15" r="15" fill="#60a5fa" /> {/* Head */}
      <rect x="10" y="30" width="20" height="35" rx="5" fill="#ec4899" /> {/* Body */}
      <rect x="0" y="32" width="8" height="20" rx="3" fill="#ec4899" transform="rotate(-45 0 32)" /> {/* Arm up */}
      <rect x="32" y="32" width="8" height="20" rx="3" fill="#ec4899" transform="rotate(45 32 32)" /> {/* Arm up */}
      <rect x="8" y="65" width="8" height="25" rx="3" fill="#1e3a5f" />
      <rect x="24" y="65" width="8" height="25" rx="3" fill="#1e3a5f" />
      <circle cx="15" cy="12" r="2" fill="#1e3a5f" />
      <circle cx="25" cy="12" r="2" fill="#1e3a5f" />
      <path d="M12 20 Q20 28 28 20" stroke="#1e3a5f" strokeWidth="2" fill="none" />
    </g>

    {/* Decorative elements */}
    <circle cx="100" cy="30" r="5" fill="#fbbf24" opacity="0.6" />
    <circle cx="200" cy="20" r="8" fill="#ec4899" opacity="0.4" />
    <circle cx="300" cy="35" r="6" fill="#34d399" opacity="0.5" />
    <path d="M50 180 L350 180" stroke="#e2e8f0" strokeWidth="3" strokeDasharray="10,5" />
  </svg>
);

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (user) {
      getApplications().then((apps) => {
        setApplications(apps);
        setIsLoading(false);
      });
    } else {
      setApplications([]);
      setIsLoading(false);
    }
  }, [user, authLoading]);

  const counts = {
    saved: applications.filter((a) => a.status === "saved").length,
    applied: applications.filter((a) => a.status === "applied").length,
    interview: applications.filter((a) =>
      ["phone_screen", "interview"].includes(a.status)
    ).length,
    offer: applications.filter((a) => a.status === "offer").length,
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 p-8 text-white shadow-2xl border border-purple-400/20">
        {/* Animated background shapes - stars effect */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-cyan-400/30 rounded-full blur-2xl animate-pulse" />
          <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-fuchsia-400/20 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 w-32 h-32 bg-pink-400/20 rounded-full blur-2xl" />
          {/* Stars */}
          <div className="absolute top-4 left-1/4 w-1 h-1 bg-white rounded-full animate-pulse" />
          <div className="absolute top-8 right-1/3 w-1.5 h-1.5 bg-white rounded-full animate-pulse delay-100" />
          <div className="absolute bottom-12 left-1/3 w-1 h-1 bg-white rounded-full animate-pulse delay-200" />
        </div>

        <div className="relative flex flex-col md:flex-row items-center gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-6 w-6 text-cyan-300" />
              <span className="text-cyan-200 font-medium">Your job hunt companion</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight">
              JobbaJobba
            </h1>
            <p className="mt-3 text-lg text-white/90 max-w-xl">
              Search jobs from Sweden & worldwide. Track applications with a Kanban board. Let AI write your cover letters!
            </p>
            {!user && (
              <Link href="/login">
                <Button className="mt-6 bg-white text-purple-600 hover:bg-cyan-50 font-semibold px-6 py-3 text-lg shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5">
                  <Rocket className="h-5 w-5 mr-2" />
                  Get Started
                </Button>
              </Link>
            )}
          </div>
          <div className="w-full md:w-80 h-48 flex-shrink-0">
            <PeopleIllustration />
          </div>
        </div>
      </div>

      {user ? (
        <>
          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="border border-purple-500/20 shadow-lg bg-slate-900/50 backdrop-blur hover:shadow-xl hover:shadow-purple-500/10 transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-purple-300">Saved</CardTitle>
                <div className="p-2 bg-gradient-to-r from-violet-500 to-purple-500 rounded-xl shadow-md">
                  <Briefcase className="h-4 w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-black text-white">{counts.saved}</div>
              </CardContent>
            </Card>
            <Card className="border border-purple-500/20 shadow-lg bg-slate-900/50 backdrop-blur hover:shadow-xl hover:shadow-fuchsia-500/10 transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-fuchsia-300">Applied</CardTitle>
                <div className="p-2 bg-gradient-to-r from-fuchsia-500 to-pink-500 rounded-xl shadow-md">
                  <FileText className="h-4 w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-black text-white">{counts.applied}</div>
              </CardContent>
            </Card>
            <Card className="border border-purple-500/20 shadow-lg bg-slate-900/50 backdrop-blur hover:shadow-xl hover:shadow-cyan-500/10 transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-cyan-300">Interviews</CardTitle>
                <div className="p-2 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl shadow-md">
                  <Clock className="h-4 w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-black text-white">{counts.interview}</div>
              </CardContent>
            </Card>
            <Card className="border border-purple-500/20 shadow-lg bg-slate-900/50 backdrop-blur hover:shadow-xl hover:shadow-emerald-500/10 transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-emerald-300">Offers</CardTitle>
                <div className="p-2 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl shadow-md">
                  <Trophy className="h-4 w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-black text-white">{counts.offer}</div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Links */}
          <div className="grid gap-4 md:grid-cols-2">
            <Link href="/jobs">
              <Card className="border border-purple-500/20 shadow-lg hover:shadow-xl hover:shadow-purple-500/10 transition-all cursor-pointer bg-slate-900/50 backdrop-blur hover:-translate-y-1 group">
                <CardHeader>
                  <div className="p-3 bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-xl w-fit shadow-md group-hover:scale-110 transition-transform">
                    <Briefcase className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-white mt-2">Search Jobs</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-purple-200">
                    Search Swedish jobs from Arbetsförmedlingen and international positions via LinkedIn/Indeed.
                  </p>
                </CardContent>
              </Card>
            </Link>
            <Link href="/applications">
              <Card className="border border-purple-500/20 shadow-lg hover:shadow-xl hover:shadow-fuchsia-500/10 transition-all cursor-pointer bg-slate-900/50 backdrop-blur hover:-translate-y-1 group">
                <CardHeader>
                  <div className="p-3 bg-gradient-to-r from-fuchsia-500 to-pink-500 rounded-xl w-fit shadow-md group-hover:scale-110 transition-transform">
                    <FileText className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-white mt-2">Track Applications</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-purple-200">
                    Manage your application pipeline with drag-and-drop Kanban board.
                  </p>
                </CardContent>
              </Card>
            </Link>
          </div>

          {/* Recent Applications */}
          {applications.length > 0 && (
            <div>
              <h2 className="text-xl font-bold mb-4 text-white">Recent Applications</h2>
              <div className="space-y-2">
                {applications.slice(0, 5).map((app) => (
                  <Link key={app.id} href={`/applications/${app.id}`}>
                    <Card className="hover:shadow-md hover:shadow-purple-500/10 transition-all border border-purple-500/20 bg-slate-900/50 backdrop-blur hover:-translate-x-1">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-white">{app.job_title}</p>
                          <p className="text-sm text-purple-300">{app.company}</p>
                        </div>
                        <Badge variant="outline" className="capitalize font-medium border-purple-400/50 text-purple-200">
                          {app.status.replace("_", " ")}
                        </Badge>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        /* Not logged in - show features */
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="border border-purple-500/20 shadow-lg bg-slate-900/50 backdrop-blur hover:shadow-xl hover:shadow-violet-500/10 transition-all hover:-translate-y-1">
            <CardHeader>
              <div className="p-4 bg-gradient-to-r from-violet-500 to-purple-500 rounded-2xl w-fit shadow-lg">
                <Briefcase className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-white mt-3 text-xl">Search Jobs</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-purple-200">
                Search thousands of jobs from Swedish job boards and international sites like LinkedIn and Indeed.
              </p>
            </CardContent>
          </Card>
          <Card className="border border-purple-500/20 shadow-lg bg-slate-900/50 backdrop-blur hover:shadow-xl hover:shadow-fuchsia-500/10 transition-all hover:-translate-y-1">
            <CardHeader>
              <div className="p-4 bg-gradient-to-r from-fuchsia-500 to-pink-500 rounded-2xl w-fit shadow-lg">
                <FileText className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-white mt-3 text-xl">AI Cover Letters</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-purple-200">
                Generate personalized cover letters using AI, tailored to each job based on your resume.
              </p>
            </CardContent>
          </Card>
          <Card className="border border-purple-500/20 shadow-lg bg-slate-900/50 backdrop-blur hover:shadow-xl hover:shadow-cyan-500/10 transition-all hover:-translate-y-1">
            <CardHeader>
              <div className="p-4 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-2xl w-fit shadow-lg">
                <Trophy className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-white mt-3 text-xl">Track Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-purple-200">
                Use the Kanban board to track your applications from saved to offer.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
