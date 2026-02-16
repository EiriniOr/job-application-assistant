"use client";

import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getStoredApplication, updateStoredApplication } from "@/lib/storage";
import type { Application } from "@/lib/api";
import { ArrowLeft, Building2, Loader2, FileText, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";

const STATUSES = [
  "saved",
  "applied",
  "phone_screen",
  "interview",
  "offer",
  "rejected",
  "withdrawn",
];

export default function ApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [app, setApp] = useState<Application | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notes, setNotes] = useState("");

  // Load application from localStorage
  useEffect(() => {
    if (id) {
      const stored = getStoredApplication(id);
      setApp(stored);
      setNotes(stored?.notes || "");
      setIsLoading(false);
    }
  }, [id]);

  const handleStatusChange = (status: string) => {
    if (!app) return;
    const updated = updateStoredApplication(id, {
      status,
      applied_at: status === "applied" ? new Date().toISOString() : app.applied_at,
    });
    if (updated) {
      setApp(updated);
    }
  };

  const handleNotesChange = () => {
    if (!app) return;
    const updated = updateStoredApplication(id, { notes });
    if (updated) {
      setApp(updated);
    }
  };

  const handleDelete = () => {
    if (confirm("Delete this application?")) {
      const apps = JSON.parse(localStorage.getItem("job_assistant_applications") || "[]");
      const filtered = apps.filter((a: Application) => a.id !== id);
      localStorage.setItem("job_assistant_applications", JSON.stringify(filtered));
      router.push("/applications");
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!app) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Application not found</p>
        <Button variant="link" onClick={() => router.push("/applications")}>
          Back to Applications
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
              {app.job_title}
            </h1>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Building2 className="h-4 w-4" />
              <span>{app.company}</span>
            </div>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleDelete} className="text-red-600 hover:text-red-700">
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Status */}
        <Card className="border-0 shadow-md bg-white/90 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-sm text-slate-600">Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Badge variant="outline" className="capitalize text-base px-3 py-1">
              {app.status.replace("_", " ")}
            </Badge>
            <div className="flex flex-wrap gap-2">
              {STATUSES.filter((s) => s !== app.status).map((s) => (
                <Button
                  key={s}
                  variant="outline"
                  size="sm"
                  className="capitalize"
                  onClick={() => handleStatusChange(s)}
                >
                  {s.replace("_", " ")}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card className="border-0 shadow-md bg-white/90 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-sm text-slate-600">Timeline</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p>
              <span className="text-muted-foreground">Saved:</span>{" "}
              {new Date(app.created_at).toLocaleDateString()}
            </p>
            {app.applied_at && (
              <p>
                <span className="text-muted-foreground">Applied:</span>{" "}
                {new Date(app.applied_at).toLocaleDateString()}
              </p>
            )}
            <p>
              <span className="text-muted-foreground">Updated:</span>{" "}
              {new Date(app.updated_at).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Job Description */}
        <Card className="border-0 shadow-md bg-white/90 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2 text-slate-600">
              <FileText className="h-4 w-4" />
              Job Description
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {app.job_description || "No description available"}
            </p>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card className="border-0 shadow-md bg-white/90 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2 text-slate-600">
              <FileText className="h-4 w-4" />
              Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this application..."
              className="w-full h-32 p-3 text-sm border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Button size="sm" onClick={handleNotesChange}>
              Save Notes
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
