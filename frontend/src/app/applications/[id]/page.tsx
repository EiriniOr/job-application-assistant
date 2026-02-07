"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getApplication, updateApplication, runAgent } from "@/lib/api";
import { ArrowLeft, Building2, Loader2, Sparkles, FileText } from "lucide-react";
import { useState } from "react";

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
  const queryClient = useQueryClient();
  const [generatedCoverLetter, setGeneratedCoverLetter] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const { data: app, isLoading } = useQuery({
    queryKey: ["application", id],
    queryFn: () => getApplication(id),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (status: string) => updateApplication(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["application", id] }),
  });

  const tailorMutation = useMutation({
    mutationFn: () => runAgent("tailor_application", { application_id: id }),
    onSuccess: (data) => {
      if (data.result.cover_letter) {
        setGeneratedCoverLetter(data.result.cover_letter);
      }
      if (data.result.resume_suggestions) {
        setSuggestions(data.result.resume_suggestions);
      }
      queryClient.invalidateQueries({ queryKey: ["application", id] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!app) {
    return <div className="text-center py-12">Application not found</div>;
  }

  const coverLetter = generatedCoverLetter || app.cover_letter;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{app.job_title}</h1>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Building2 className="h-4 w-4" />
            <span>{app.company}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Status</CardTitle>
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
                  onClick={() => updateMutation.mutate(s)}
                  disabled={updateMutation.isPending}
                >
                  {s.replace("_", " ")}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Dates */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Timeline</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p>
              <span className="text-muted-foreground">Created:</span>{" "}
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

        {/* AI Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">AI Assistant</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => tailorMutation.mutate()}
              disabled={tailorMutation.isPending}
              className="w-full"
            >
              {tailorMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Generate Cover Letter
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Job Description */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
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

        {/* Cover Letter */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Cover Letter
            </CardTitle>
          </CardHeader>
          <CardContent>
            {coverLetter ? (
              <p className="text-sm whitespace-pre-wrap">{coverLetter}</p>
            ) : (
              <p className="text-sm text-muted-foreground">
                No cover letter yet. Click &quot;Generate Cover Letter&quot; to create one with AI.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Resume Suggestions */}
      {suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Resume Suggestions</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {suggestions.map((s, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-muted-foreground">{i + 1}.</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Event Timeline */}
      {app.events && app.events.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {app.events.map((e) => (
                <li key={e.id} className="flex gap-3 items-start">
                  <span className="text-muted-foreground text-xs">
                    {new Date(e.created_at).toLocaleDateString()}
                  </span>
                  <span className="capitalize">
                    {e.event_type.replace("_", " ")}
                    {e.new_value && `: ${e.new_value}`}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
