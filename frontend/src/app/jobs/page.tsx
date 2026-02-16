"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { JobCard } from "@/components/job-card";
import { searchJobs, createApplication, runAgent, type Job, type MatchScore } from "@/lib/api";
import { Search, Loader2, Sparkles } from "lucide-react";

export default function JobsPage() {
  const [keywords, setKeywords] = useState("python developer");
  const [location, setLocation] = useState("");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [matchScores, setMatchScores] = useState<Record<string, MatchScore>>({});
  const [searchResults, setSearchResults] = useState<Job[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const searchMutation = useMutation({
    mutationFn: () => searchJobs({ keywords, location, remote_only: remoteOnly }),
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

  const aiSearchMutation = useMutation({
    mutationFn: () =>
      runAgent("search_jobs", { keywords, location, remote_only: remoteOnly }),
    onSuccess: (data) => {
      if (data.result.jobs_found) {
        setSearchResults(data.result.jobs_found);
        setHasSearched(true);
      }
      if (data.result.match_scores) {
        const scores: Record<string, MatchScore> = {};
        for (const m of data.result.match_scores) {
          scores[m.job_id] = m;
        }
        setMatchScores(scores);
      }
    },
  });

  const saveMutation = useMutation({
    mutationFn: (jobId: string) => createApplication(jobId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["applications"] }),
  });

  const handleSearch = (useAI: boolean) => {
    if (useAI) {
      aiSearchMutation.mutate();
    } else {
      searchMutation.mutate();
    }
  };

  const isSearching = searchMutation.isPending || aiSearchMutation.isPending;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
          Search Jobs
        </h1>
        <p className="text-muted-foreground mt-1">
          Search Swedish jobs from Arbetsförmedlingen and remote positions from RemoteOK
        </p>
      </div>

      {/* Search Form */}
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Keywords (e.g. python developer)"
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          className="w-64"
        />
        <Input
          placeholder="Location (optional)"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="w-48"
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={remoteOnly}
            onChange={(e) => setRemoteOnly(e.target.checked)}
            className="rounded"
          />
          Remote only
        </label>
        <Button onClick={() => handleSearch(false)} disabled={isSearching}>
          {isSearching ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
          Search
        </Button>
        <Button onClick={() => handleSearch(true)} disabled={isSearching} variant="secondary">
          {isSearching ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
          AI Match
        </Button>
      </div>

      {/* Results */}
      {isSearching ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="text-center py-12 text-red-500">
          Error: {error}
        </div>
      ) : searchResults.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {searchResults.map((job, idx) => (
            <JobCard
              key={job.source_id || idx}
              job={job}
              matchScore={matchScores[job.id]}
              onSave={(id) => saveMutation.mutate(id)}
              isSaving={saveMutation.isPending}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          {hasSearched ? "No jobs found for this search." : "Click Search to find jobs!"}
        </div>
      )}
    </div>
  );
}
