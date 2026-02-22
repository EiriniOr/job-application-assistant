"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { KanbanBoard } from "@/components/kanban-board";
import { AuthGuard } from "@/components/auth-guard";
import { getApplications, updateApplication, createApplication } from "@/lib/supabase-storage";
import { extractJobFromUrl, type Job } from "@/lib/api";
import type { Application } from "@/lib/api";
import { Loader2, Plus, Link2, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function ApplicationsPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [jobUrl, setJobUrl] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load applications from Supabase
  useEffect(() => {
    getApplications().then((apps) => {
      setApplications(apps);
      setIsLoading(false);
    });
  }, []);

  const handleStatusChange = async (id: string, status: string) => {
    // Update in Supabase
    const updated = await updateApplication(id, { status });
    if (updated) {
      // Update local state
      setApplications((prev) =>
        prev.map((app) => (app.id === id ? { ...app, status } : app))
      );
    }
  };

  const handleCardClick = (id: string) => {
    router.push(`/applications/${id}`);
  };

  const handleExtractAndSave = async () => {
    if (!jobUrl.trim()) return;

    setExtracting(true);
    setExtractError(null);

    try {
      const data = await extractJobFromUrl(jobUrl);

      if (!data.success || !data.title) {
        setExtractError("Could not extract job details. Please check the URL.");
        return;
      }

      const job: Job = {
        id: data.source_id,
        source: data.source,
        source_id: data.source_id,
        title: data.title || "Unknown Position",
        company: data.company || "Unknown Company",
        company_url: null,
        location: data.location || null,
        is_remote: data.is_remote || null,
        salary_min: data.salary_min || null,
        salary_max: data.salary_max || null,
        description: data.description || null,
        requirements: data.requirements || null,
        url: data.url,
        posted_at: null,
        created_at: new Date().toISOString(),
      };

      const result = await createApplication(job);
      if (result) {
        setApplications((prev) => [result, ...prev]);
        setShowAddModal(false);
        setJobUrl("");
        setSuccessMessage("Job ad successfully added to Saved!");
        setTimeout(() => setSuccessMessage(null), 4000);
      }
    } catch (e) {
      setExtractError(e instanceof Error ? e.message : "Failed to extract job");
    } finally {
      setExtracting(false);
    }
  };

  if (isLoading) {
    return (
      <AuthGuard>
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
              Applications
            </h1>
            <p className="text-purple-300 mt-1">
              Drag cards to update status. Click to view details.
            </p>
          </div>
          <Button
            onClick={() => setShowAddModal(true)}
            size="sm"
            className="gap-2 bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 shadow-md shadow-purple-500/25"
          >
            <Plus className="h-4 w-4" />
            Add Job via URL
          </Button>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="p-3 bg-emerald-900/40 border border-emerald-500/50 rounded-lg text-emerald-300 text-sm flex items-center gap-2">
            <Check className="h-4 w-4" />
            {successMessage}
          </div>
        )}

        {applications.length === 0 ? (
          <div className="text-center py-12 text-purple-300">
            <p>No saved applications yet.</p>
            <p className="text-sm mt-2 text-purple-400">Search for jobs and click &quot;Save&quot; to add them here.</p>
          </div>
        ) : (
          <KanbanBoard
            applications={applications}
            onStatusChange={handleStatusChange}
            onCardClick={handleCardClick}
          />
        )}

        {/* Add Job Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
            <Card className="w-full max-w-lg mx-4 border border-purple-500/30 shadow-2xl shadow-purple-500/20 bg-slate-900">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-white">
                  <Link2 className="h-5 w-5 text-fuchsia-400" />
                  Add Job via URL
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-purple-300 hover:text-white hover:bg-purple-500/20"
                  onClick={() => {
                    setShowAddModal(false);
                    setJobUrl("");
                    setExtractError(null);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-purple-200">
                  Paste a job listing URL and we&apos;ll extract the details using AI.
                </p>
                <Input
                  placeholder="https://linkedin.com/jobs/view/..."
                  value={jobUrl}
                  onChange={(e) => setJobUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleExtractAndSave()}
                  className="bg-slate-800/50 border-purple-500/30 text-white placeholder:text-purple-300/50 focus-visible:ring-fuchsia-500"
                />
                {extractError && (
                  <p className="text-sm text-red-400">{extractError}</p>
                )}
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    className="border-purple-400/50 text-purple-200 hover:bg-purple-500/20 hover:text-white"
                    onClick={() => {
                      setShowAddModal(false);
                      setJobUrl("");
                      setExtractError(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleExtractAndSave}
                    disabled={extracting || !jobUrl.trim()}
                    className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600"
                  >
                    {extracting ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Plus className="h-4 w-4 mr-2" />
                    )}
                    Extract & Save
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
