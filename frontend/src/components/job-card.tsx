"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Building2, DollarSign, Briefcase } from "lucide-react";
import type { Job, MatchScore } from "@/lib/api";

interface JobCardProps {
  job: Job;
  matchScore?: MatchScore;
  onSave?: (jobId: string) => void;
  isSaving?: boolean;
}

export function JobCard({ job, matchScore, onSave, isSaving }: JobCardProps) {
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
    arbetsformedlingen: "bg-blue-100 text-blue-700 border-blue-200",
    remoteok: "bg-emerald-100 text-emerald-700 border-emerald-200",
    adzuna: "bg-orange-100 text-orange-700 border-orange-200",
  };

  return (
    <Card className="border-0 shadow-md hover:shadow-lg transition-all bg-white/90 backdrop-blur hover:-translate-y-0.5">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <CardTitle className="text-lg leading-tight text-slate-800">{job.title}</CardTitle>
            <div className="flex items-center gap-1 text-slate-500 text-sm">
              <Building2 className="h-3.5 w-3.5" />
              <span>{job.company}</span>
            </div>
          </div>
          {score !== null && (
            <Badge
              variant={score >= 80 ? "default" : score >= 60 ? "secondary" : "outline"}
              className={score >= 80 ? "bg-emerald-500 text-white" : score >= 60 ? "bg-amber-500 text-white" : ""}
            >
              {score}% match
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2 text-sm">
          {job.location && (
            <div className="flex items-center gap-1 text-slate-500">
              <MapPin className="h-3.5 w-3.5" />
              <span>{job.location}</span>
            </div>
          )}
          {job.is_remote && (
            <Badge variant="outline" className="bg-violet-50 text-violet-700 border-violet-200">
              Remote
            </Badge>
          )}
          {salary && (
            <div className="flex items-center gap-1 text-slate-500">
              <DollarSign className="h-3.5 w-3.5" />
              <span>{salary}</span>
            </div>
          )}
          <Badge variant="outline" className={`capitalize ${sourceColors[job.source] || ""}`}>
            {job.source === "arbetsformedlingen" ? "Arbetsförmedlingen" : job.source}
          </Badge>
        </div>

        {job.description && (
          <p className="text-sm text-slate-500 line-clamp-3">{job.description}</p>
        )}

        {matchScore && matchScore.reasons.length > 0 && (
          <div className="space-y-1 p-2 bg-blue-50 rounded-lg">
            <p className="text-xs font-medium text-blue-800">Why it matches:</p>
            <ul className="text-xs text-blue-600 space-y-0.5">
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
              className="flex-1"
              onClick={() => window.open(job.url!, "_blank")}
            >
              View Job
            </Button>
          )}
          {onSave && (
            <Button
              size="sm"
              onClick={() => onSave(job.id || job.source_id || "")}
              disabled={isSaving}
              className="flex-1 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700"
            >
              <Briefcase className="h-4 w-4 mr-2" />
              {isSaving ? "Saving..." : "Save"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
