"use client";

import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AuthGuard } from "@/components/auth-guard";
import { getApplication, updateApplication, deleteApplication, getResumeContent } from "@/lib/supabase-storage";
import type { Application } from "@/lib/api";
import { ArrowLeft, Building2, Loader2, FileText, Trash2, Sparkles, Copy, Check } from "lucide-react";
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
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [resumeContent, setResumeContent] = useState("");

  // Load application from Supabase
  useEffect(() => {
    if (id) {
      Promise.all([
        getApplication(id),
        getResumeContent()
      ]).then(([stored, resume]) => {
        setApp(stored);
        setNotes(stored?.notes || "");
        setResumeContent(resume);
        setIsLoading(false);
      });
    }
  }, [id]);

  const handleStatusChange = async (status: string) => {
    if (!app) return;
    const updated = await updateApplication(id, {
      status,
      applied_at: status === "applied" ? new Date().toISOString() : app.applied_at,
    });
    if (updated) {
      setApp(updated);
    }
  };

  const handleNotesChange = async () => {
    if (!app) return;
    const updated = await updateApplication(id, { notes });
    if (updated) {
      setApp(updated);
    }
  };

  const handleDelete = async () => {
    if (confirm("Delete this application?")) {
      const success = await deleteApplication(id);
      if (success) {
        router.push("/applications");
      }
    }
  };

  const handleGenerateCoverLetter = async () => {
    if (!app) return;

    setIsGenerating(true);
    setGenerateError(null);

    try {
      const response = await fetch("/api/cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobTitle: app.job_title,
          company: app.company,
          jobDescription: app.job_description,
          resumeInfo: resumeContent,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate cover letter");
      }

      // Save cover letter to application
      const updated = await updateApplication(id, { cover_letter: data.coverLetter });
      if (updated) {
        setApp(updated);
      }
    } catch (error) {
      setGenerateError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyCoverLetter = () => {
    if (app?.cover_letter) {
      navigator.clipboard.writeText(app.cover_letter);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <AuthGuard>
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AuthGuard>
    );
  }

  if (!app) {
    return (
      <AuthGuard>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Application not found</p>
          <Button variant="link" onClick={() => router.push("/applications")}>
            Back to Applications
          </Button>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent">
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

        {/* Cover Letter Section */}
        <Card className="border-0 shadow-md bg-white/90 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2 text-slate-600">
              <Sparkles className="h-4 w-4" />
              AI Cover Letter
            </CardTitle>
            <div className="flex gap-2">
              {app.cover_letter && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyCoverLetter}
                >
                  {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                  {copied ? "Copied!" : "Copy"}
                </Button>
              )}
              <Button
                size="sm"
                onClick={handleGenerateCoverLetter}
                disabled={isGenerating}
                className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600"
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                {app.cover_letter ? "Regenerate" : "Generate"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {generateError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {generateError}
              </div>
            )}
            {app.cover_letter ? (
              <div className="prose prose-sm max-w-none">
                <p className="whitespace-pre-wrap text-slate-700">{app.cover_letter}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Click &quot;Generate&quot; to create a personalized cover letter using AI.
                {resumeContent ? " Your resume will be used to tailor the letter." : " Add your resume info in the Resumes page for better results."}
              </p>
            )}
          </CardContent>
        </Card>

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
                className="w-full h-32 p-3 text-sm border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
              <Button size="sm" onClick={handleNotesChange}>
                Save Notes
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthGuard>
  );
}
