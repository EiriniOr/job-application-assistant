"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { JobCard } from "@/components/job-card";
import { AuthGuard } from "@/components/auth-guard";
import { searchJobs, extractJobFromUrl, type Job } from "@/lib/api";
import { createApplication, getSavedJobIds } from "@/lib/supabase-storage";
import { Search, Loader2, Plus, Link2, X, Check } from "lucide-react";

const SOURCES = [
  { id: "arbetsformedlingen", name: "Arbetsförmedlingen", description: "Swedish Public Employment" },
  { id: "jsearch", name: "LinkedIn/Indeed", description: "Via JSearch (needs API key)" },
];

export default function JobsPage() {
  const [keywords, setKeywords] = useState("developer");
  const [location, setLocation] = useState("");
  const [selectedSources, setSelectedSources] = useState<string[]>(["arbetsformedlingen"]);
  const [searchResults, setSearchResults] = useState<Job[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set());
  const [savingJobId, setSavingJobId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [jobUrl, setJobUrl] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Load saved job IDs from Supabase on mount
  useEffect(() => {
    getSavedJobIds().then(setSavedJobIds);
  }, []);

  const searchMutation = useMutation({
    mutationFn: async () => {
      const result = await searchJobs({
        keywords,
        location,
        sources: selectedSources,
      });
      return result;
    },
    onSuccess: (data) => {
      setSearchResults(data.jobs);
      setHasSearched(true);
      setError(null);
    },
    onError: (err: Error) => {
      setError(err.message);
      setHasSearched(true);
    },
  });

  const handleSaveJob = async (job: Job) => {
    const jobId = job.id || job.source_id || "";
    setSavingJobId(jobId);

    const result = await createApplication(job);

    if (result) {
      setSavedJobIds((prev) => new Set(prev).add(jobId));
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    }
    setSavingJobId(null);
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

      // Create job object and save
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

      await handleSaveJob(job);
      setShowAddModal(false);
      setJobUrl("");
    } catch (e) {
      setExtractError(e instanceof Error ? e.message : "Failed to extract job");
    } finally {
      setExtracting(false);
    }
  };

  const toggleSource = (sourceId: string) => {
    setSelectedSources((prev) =>
      prev.includes(sourceId)
        ? prev.filter((s) => s !== sourceId)
        : [...prev, sourceId]
    );
  };

  const isSearching = searchMutation.isPending;

  // Auto-search on page load
  useEffect(() => {
    searchMutation.mutate();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AuthGuard>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
              Search Jobs
            </h1>
            <p className="text-muted-foreground mt-1">
              Search jobs from multiple sources or add manually via URL
            </p>
          </div>
          <Button
            onClick={() => setShowAddModal(true)}
            variant="outline"
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Job via URL
          </Button>
        </div>

        {/* Source Selection */}
        <div className="flex flex-wrap gap-2">
          {SOURCES.map((source) => (
            <button
              key={source.id}
              onClick={() => toggleSource(source.id)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                selectedSources.includes(source.id)
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {selectedSources.includes(source.id) && (
                <Check className="h-3 w-3 inline mr-1" />
              )}
              {source.name}
            </button>
          ))}
        </div>

        {/* Search Form */}
        <div className="flex flex-wrap gap-3">
          <Input
            placeholder="Keywords (e.g. python developer)"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            className="w-64"
            onKeyDown={(e) => e.key === "Enter" && searchMutation.mutate()}
          />
          <Input
            placeholder="Location (optional)"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-48"
            onKeyDown={(e) => e.key === "Enter" && searchMutation.mutate()}
          />
          <Button
            onClick={() => searchMutation.mutate()}
            disabled={isSearching || selectedSources.length === 0}
            className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700"
          >
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Search className="h-4 w-4 mr-2" />
            )}
            Search
          </Button>
        </div>

        {/* Results */}
        {isSearching ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="text-center py-12 text-red-500">Error: {error}</div>
        ) : searchResults.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {searchResults.map((job, idx) => (
              <JobCard
                key={job.source_id || idx}
                job={job}
                onSave={handleSaveJob}
                isSaving={savingJobId === (job.id || job.source_id)}
                isSaved={savedJobIds.has(job.id || job.source_id || "")}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            {hasSearched
              ? "No jobs found. Try different keywords or sources."
              : "Click Search to find jobs!"}
          </div>
        )}

        {/* Add Job Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-lg mx-4 border-0 shadow-2xl">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Link2 className="h-5 w-5" />
                  Add Job via URL
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
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
                <p className="text-sm text-slate-600">
                  Paste a job listing URL and we&apos;ll extract the details
                  using AI.
                </p>
                <Input
                  placeholder="https://linkedin.com/jobs/view/..."
                  value={jobUrl}
                  onChange={(e) => setJobUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleExtractAndSave()}
                />
                {extractError && (
                  <p className="text-sm text-red-600">{extractError}</p>
                )}
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
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
                    className="bg-gradient-to-r from-blue-600 to-violet-600"
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
