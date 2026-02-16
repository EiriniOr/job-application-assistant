"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getApplications, getJobs } from "@/lib/api";
import { Briefcase, FileText, Clock, Trophy } from "lucide-react";
import Link from "next/link";

export default function Dashboard() {
  const { data: apps } = useQuery({
    queryKey: ["applications"],
    queryFn: () => getApplications(),
  });

  const { data: jobs } = useQuery({
    queryKey: ["jobs"],
    queryFn: () => getJobs(),
  });

  const counts = {
    saved: apps?.applications.filter((a) => a.status === "saved").length || 0,
    applied: apps?.applications.filter((a) => a.status === "applied").length || 0,
    interview: apps?.applications.filter((a) =>
      ["phone_screen", "interview"].includes(a.status)
    ).length || 0,
    offer: apps?.applications.filter((a) => a.status === "offer").length || 0,
  };

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-violet-600 to-purple-700 p-8 text-white shadow-xl">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)',
            backgroundSize: '24px 24px'
          }} />
        </div>
        <div className="relative">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Job Application Assistant
          </h1>
          <p className="mt-2 text-blue-100 max-w-2xl">
            AI-powered job search across Arbetsförmedlingen and RemoteOK. Track applications, generate cover letters, and land your dream job.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-0 shadow-md bg-white/80 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Saved</CardTitle>
            <div className="p-2 bg-blue-100 rounded-lg">
              <Briefcase className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-800">{counts.saved}</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md bg-white/80 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Applied</CardTitle>
            <div className="p-2 bg-violet-100 rounded-lg">
              <FileText className="h-4 w-4 text-violet-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-800">{counts.applied}</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md bg-white/80 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Interviews</CardTitle>
            <div className="p-2 bg-amber-100 rounded-lg">
              <Clock className="h-4 w-4 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-800">{counts.interview}</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md bg-white/80 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Offers</CardTitle>
            <div className="p-2 bg-emerald-100 rounded-lg">
              <Trophy className="h-4 w-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-800">{counts.offer}</div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/jobs">
          <Card className="border-0 shadow-md hover:shadow-lg transition-all cursor-pointer bg-white/80 backdrop-blur hover:-translate-y-1">
            <CardHeader>
              <CardTitle className="text-slate-800">Search Jobs</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">
                Search Swedish jobs from Arbetsförmedlingen and remote positions from RemoteOK.
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/applications">
          <Card className="border-0 shadow-md hover:shadow-lg transition-all cursor-pointer bg-white/80 backdrop-blur hover:-translate-y-1">
            <CardHeader>
              <CardTitle className="text-slate-800">Track Applications</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">
                Manage your application pipeline with drag-and-drop Kanban board.
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Recent Applications */}
      {apps && apps.applications.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Recent Applications</h2>
          <div className="space-y-2">
            {apps.applications.slice(0, 5).map((app) => (
              <Link key={app.id} href={`/applications/${app.id}`}>
                <Card className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{app.job_title}</p>
                      <p className="text-sm text-muted-foreground">{app.company}</p>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {app.status.replace("_", " ")}
                    </Badge>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
