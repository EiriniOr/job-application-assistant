"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Building2, DollarSign, Briefcase } from "lucide-react";
import type { Job, MatchScore } from "@/lib/api";

interface JobCardProps {
  job: Job;
  matchScore?: MatchScore;
  onSave?: (job: Job) => void;
  isSaving?: boolean;
  isSaved?: boolean;
}

export function JobCard({ job, matchScore, onSave, isSaving, isSaved }: JobCardProps) {
  const formatSalary = (min: number | null, max: number | null) => {
    if (!min && !max) return null;
    const fmt = (n: number) => `$${Math.round(n / 1000)}k`;
    if (min && max) return `${fmt(min)} - ${fmt(max)}`;
    if (min) return `${fmt(min)}+`;
    return `Up to ${fmt(max!)}`;
  };

  const salary = formatSalary(job.salary_min, job.salary_max);
  const score = matchScore?.score ? Math.round(matchScore.score * 100) : null;

  const sourceColors: Record<string, string> = {
    arbetsformedlingen: "bg-blue-900/50 text-blue-300 border-blue-500/30",
    remoteok: "bg-emerald-900/50 text-emerald-300 border-emerald-500/30",
    adzuna: "bg-orange-900/50 text-orange-300 border-orange-500/30",
    jsearch: "bg-cyan-900/50 text-cyan-300 border-cyan-500/30",
  };

  return (
    <Card className="border border-purple-500/30 shadow-md shadow-purple-500/10 hover:shadow-lg hover:shadow-purple-500/20 transition-all bg-slate-900/50 backdrop-blur hover:-translate-y-0.5">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <CardTitle className="text-lg leading-tight text-white">{job.title}</CardTitle>
            <div className="flex items-center gap-1 text-purple-300 text-sm">
              <Building2 className="h-3.5 w-3.5" />
              <span>{job.company}</span>
            </div>
          </div>
          {score !== null && (
            <Badge
              variant={score >= 80 ? "default" : score >= 60 ? "secondary" : "outline"}
              className={score >= 80 ? "bg-emerald-500 text-white" : score >= 60 ? "bg-amber-500 text-white" : "border-purple-400/50 text-purple-200"}
            >
              {score}% match
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2 text-sm">
          {job.location && (
            <div className="flex items-center gap-1 text-purple-300">
              <MapPin className="h-3.5 w-3.5" />
              <span>{job.location}</span>
            </div>
          )}
          {job.is_remote && (
            <Badge variant="outline" className="bg-fuchsia-900/50 text-fuchsia-300 border-fuchsia-500/30">
              Remote
            </Badge>
          )}
          {salary && (
            <div className="flex items-center gap-1 text-purple-300">
              <DollarSign className="h-3.5 w-3.5" />
              <span>{salary}</span>
            </div>
          )}
          <Badge variant="outline" className={`capitalize ${sourceColors[job.source] || "border-purple-400/50 text-purple-200"}`}>
            {job.source === "arbetsformedlingen" ? "Arbetsförmedlingen" : job.source}
          </Badge>
        </div>

        {job.description && (
          <p className="text-sm text-purple-300 line-clamp-3">{job.description}</p>
        )}

        {matchScore && matchScore.reasons.length > 0 && (
          <div className="space-y-1 p-2 bg-purple-900/30 rounded-lg border border-purple-500/20">
            <p className="text-xs font-medium text-purple-200">Why it matches:</p>
            <ul className="text-xs text-purple-300 space-y-0.5">
              {matchScore.reasons.slice(0, 3).map((r, i) => (
                <li key={i}>• {r}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex gap-2">
          {job.url && (
            <Button
              size="sm"
              variant="outline"
              className="flex-1 border-purple-400/50 text-purple-200 hover:bg-purple-500/20 hover:text-white"
              onClick={() => window.open(job.url!, "_blank")}
            >
              View Job
            </Button>
          )}
          {onSave && (
            <Button
              size="sm"
              onClick={() => onSave(job)}
              disabled={isSaving || isSaved}
              className={`flex-1 ${isSaved ? "bg-emerald-500 hover:bg-emerald-500" : "bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 shadow-md shadow-purple-500/25"}`}
            >
              <Briefcase className="h-4 w-4 mr-2" />
              {isSaving ? "Saving..." : isSaved ? "Saved!" : "Save"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
