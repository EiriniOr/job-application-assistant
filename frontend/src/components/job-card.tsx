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

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <CardTitle className="text-lg leading-tight">{job.title}</CardTitle>
            <div className="flex items-center gap-1 text-muted-foreground text-sm">
              <Building2 className="h-3.5 w-3.5" />
              <span>{job.company}</span>
            </div>
          </div>
          {score !== null && (
            <Badge
              variant={score >= 80 ? "default" : score >= 60 ? "secondary" : "outline"}
              className={score >= 80 ? "bg-green-600" : score >= 60 ? "bg-yellow-500" : ""}
            >
              {score}% match
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
          {job.location && (
            <div className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              <span>{job.location}</span>
            </div>
          )}
          {job.is_remote && <Badge variant="outline">Remote</Badge>}
          {salary && (
            <div className="flex items-center gap-1">
              <DollarSign className="h-3.5 w-3.5" />
              <span>{salary}</span>
            </div>
          )}
          <Badge variant="outline" className="capitalize">
            {job.source}
          </Badge>
        </div>

        {job.description && (
          <p className="text-sm text-muted-foreground line-clamp-3">{job.description}</p>
        )}

        {matchScore && matchScore.reasons.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium">Why it matches:</p>
            <ul className="text-xs text-muted-foreground space-y-0.5">
              {matchScore.reasons.slice(0, 3).map((r, i) => (
                <li key={i}>• {r}</li>
              ))}
            </ul>
          </div>
        )}

        {onSave && (
          <Button
            size="sm"
            onClick={() => onSave(job.id)}
            disabled={isSaving}
            className="w-full"
          >
            <Briefcase className="h-4 w-4 mr-2" />
            {isSaving ? "Saving..." : "Save Application"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
