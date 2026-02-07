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
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Track your job search progress
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Saved</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts.saved}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Applied</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts.applied}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Interviews</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts.interview}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Offers</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts.offer}</div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/jobs">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle>Search Jobs</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Find matching jobs from Adzuna and RemoteOK. {jobs?.count || 0} jobs saved.
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/applications">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle>Track Applications</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
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
