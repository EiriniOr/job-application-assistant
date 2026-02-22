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
import { Search, Loader2, Plus, Link2, X, Check, Globe } from "lucide-react";

const SOURCES = [
  { id: "arbetsformedlingen", name: "Arbetsförmedlingen", description: "Swedish Public Employment" },
  { id: "jsearch", name: "JSearch (Indeed, etc)", description: "Via JSearch" },
];

export default function JobsPage() {
  const [keywords, setKeywords] = useState("");
  const [location, setLocation] = useState("");
  const [englishOnly, setEnglishOnly] = useState(false);
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
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    getSavedJobIds().then(setSavedJobIds);
  }, []);

  const searchMutation = useMutation({
    mutationFn: async () => {
      const result = await searchJobs({
        keywords,
        location,
        sources: selectedSources,
        englishOnly,
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
      setSuccessMessage("Job ad successfully added to Saved in the Applications tab!");
      setTimeout(() => setSuccessMessage(null), 5000);
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

  return (
    <AuthGuard>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
              Search Jobs
            </h1>
            <p className="text-purple-300 mt-1">
              Search jobs from multiple sources or add manually via URL
            </p>
          </div>
          <Button
            onClick={() => setShowAddModal(true)}
            variant="outline"
            className="gap-2 border-purple-400/50 text-purple-200 hover:bg-purple-500/20 hover:text-white"
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

        {/* Source Selection */}
        <div className="flex flex-wrap gap-2 items-center">
          {SOURCES.map((source) => (
            <button
              key={source.id}
              onClick={() => toggleSource(source.id)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                selectedSources.includes(source.id)
                  ? "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-md shadow-purple-500/25"
                  : "bg-slate-800/50 text-purple-200 hover:bg-slate-700/50 border border-purple-500/20"
              }`}
            >
              {selectedSources.includes(source.id) && (
                <Check className="h-3 w-3 inline mr-1" />
              )}
              {source.name}
            </button>
          ))}

          {/* Divider */}
          <div className="w-px h-6 bg-purple-500/30 mx-2" />

          {/* English Only Toggle */}
          <button
            onClick={() => setEnglishOnly(!englishOnly)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${
              englishOnly
                ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-md shadow-cyan-500/25"
                : "bg-slate-800/50 text-purple-200 hover:bg-slate-700/50 border border-purple-500/20"
            }`}
          >
            <Globe className="h-3.5 w-3.5" />
            English Only
            {englishOnly && <Check className="h-3 w-3" />}
          </button>
        </div>

        {/* Search Form */}
        <div className="flex flex-wrap gap-3">
          <Input
            placeholder="Keywords (e.g. python developer)"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            className="w-64 bg-slate-900/50 border-purple-500/30 text-white placeholder:text-purple-300/50 focus-visible:ring-fuchsia-500"
            onKeyDown={(e) => e.key === "Enter" && searchMutation.mutate()}
          />
          <Input
            placeholder="Location (optional)"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-48 bg-slate-900/50 border-purple-500/30 text-white placeholder:text-purple-300/50 focus-visible:ring-fuchsia-500"
            onKeyDown={(e) => e.key === "Enter" && searchMutation.mutate()}
          />
          <Button
            onClick={() => searchMutation.mutate()}
            disabled={isSearching || selectedSources.length === 0 || !keywords.trim()}
            className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 shadow-md shadow-purple-500/25"
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
            <Loader2 className="h-8 w-8 animate-spin text-fuchsia-400" />
          </div>
        ) : error ? (
          <div className="text-center py-12 text-red-400">Error: {error}</div>
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
          <div className="text-center py-12 text-purple-300">
            {hasSearched
              ? "No jobs found. Try different keywords or sources."
              : "Click Search to find jobs!"}
          </div>
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
