"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { JobCard } from "@/components/job-card";
import { searchJobs, getJobs, createApplication, runAgent, type MatchScore } from "@/lib/api";
import { Search, Loader2, Sparkles } from "lucide-react";

export default function JobsPage() {
  const [keywords, setKeywords] = useState("python developer");
  const [location, setLocation] = useState("");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [matchScores, setMatchScores] = useState<Record<string, MatchScore>>({});
  const queryClient = useQueryClient();

  const { data: jobs, isLoading } = useQuery({
    queryKey: ["jobs"],
    queryFn: () => getJobs(),
  });

  const searchMutation = useMutation({
    mutationFn: () => searchJobs({ keywords, location, remote_only: remoteOnly }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["jobs"] }),
  });

  const aiSearchMutation = useMutation({
    mutationFn: () =>
      runAgent("search_jobs", { keywords, location, remote_only: remoteOnly }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
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
        <h1 className="text-3xl font-bold tracking-tight">Search Jobs</h1>
        <p className="text-muted-foreground mt-1">
          Find jobs from Adzuna and RemoteOK
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
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : jobs && jobs.jobs.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {jobs.jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              matchScore={matchScores[job.id]}
              onSave={(id) => saveMutation.mutate(id)}
              isSaving={saveMutation.isPending}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          No jobs found. Try searching for something!
        </div>
      )}
    </div>
  );
}
