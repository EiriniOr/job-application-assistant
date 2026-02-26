"use client";

import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AuthGuard } from "@/components/auth-guard";
import { getApplication, updateApplication, deleteApplication, getResumeContent, getCustomInstructions, getCVFileBlob } from "@/lib/supabase-storage";
import type { Application } from "@/lib/api";
import { ArrowLeft, ArrowRight, Building2, Loader2, FileText, Trash2, Sparkles, Copy, Check, ExternalLink, Target, ChevronDown, ChevronUp, Wand2, X, Download } from "lucide-react";
import { useState, useEffect } from "react";
import { downloadBeautifulCV } from "@/lib/cv-docx";

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
  const [coverLetterLang, setCoverLetterLang] = useState<"en" | "sv">("en");
  const [atsScore, setAtsScore] = useState<{
    overallScore: number;
    label: string;
    breakdown: { similarity: number; keywordCoverage: number; softSkillsCoverage: number; impactScore: number };
    missingKeywords: string[];
    missingSoftSkills: string[];
    suggestions: string[];
  } | null>(null);
  const [atsLoading, setAtsLoading] = useState(false);
  const [atsExpanded, setAtsExpanded] = useState(false);
  const [improvedResume, setImprovedResume] = useState("");
  const [improvedResumeLoading, setImprovedResumeLoading] = useState(false);
  const [showImprovedResume, setShowImprovedResume] = useState(false);
  const [improvedResumeCopied, setImprovedResumeCopied] = useState(false);
  const [isGeneratingWithAts, setIsGeneratingWithAts] = useState(false);
  const [newAtsScore, setNewAtsScore] = useState<number | null>(null);
  const [customInstructions, setCustomInstructions] = useState("");
  const [cvOutputLang, setCvOutputLang] = useState<"en" | "sv">("en");

  // Load application from Supabase
  useEffect(() => {
    if (id) {
      Promise.all([
        getApplication(id),
        getResumeContent(),
        getCustomInstructions()
      ]).then(([stored, resume, instructions]) => {
        setApp(stored);
        setCustomInstructions(instructions);
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
          language: coverLetterLang,
          customInstructions,
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

  const handleCalculateATS = async () => {
    if (!app?.job_description || !resumeContent) return;

    setAtsLoading(true);
    try {
      const response = await fetch("/api/ats-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeText: resumeContent,
          jobDescription: app.job_description,
          language: coverLetterLang,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setAtsScore(data);
      }
    } catch (error) {
      console.error("ATS score error:", error);
    } finally {
      setAtsLoading(false);
    }
  };

  const handleGenerateImprovedResume = async () => {
    if (!app?.job_description || !resumeContent || !atsScore) return;

    setImprovedResumeLoading(true);
    setNewAtsScore(null);
    try {
      const response = await fetch("/api/improve-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeText: resumeContent,
          jobDescription: app.job_description,
          missingKeywords: atsScore.missingKeywords,
          missingSoftSkills: atsScore.missingSoftSkills,
          suggestions: atsScore.suggestions,
          outputLanguage: cvOutputLang,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setImprovedResume(data.improvedResume);
        setShowImprovedResume(true);

        // Calculate new ATS score for improved resume
        const newScoreResponse = await fetch("/api/ats-score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            resumeText: data.improvedResume,
            jobDescription: app.job_description,
            language: coverLetterLang,
          }),
        });
        const newScoreData = await newScoreResponse.json();
        if (newScoreResponse.ok) {
          setNewAtsScore(newScoreData.overallScore);
        }
      }
    } catch (error) {
      console.error("Resume improvement error:", error);
    } finally {
      setImprovedResumeLoading(false);
    }
  };

  const handleCopyImprovedResume = () => {
    navigator.clipboard.writeText(improvedResume);
    setImprovedResumeCopied(true);
    setTimeout(() => setImprovedResumeCopied(false), 2000);
  };

  const handleDownloadWord = async () => {
    const original = await getCVFileBlob();
    const isDocx = original?.name.endsWith(".docx");
    await downloadBeautifulCV(improvedResume, {
      originalDocxBlob: isDocx ? original?.blob : null,
      companyName: app?.company,
    });
  };

  const handleGenerateWithAtsSuggestions = async () => {
    if (!app || !atsScore) return;

    setIsGeneratingWithAts(true);
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
          language: coverLetterLang,
          customInstructions,
          atsSuggestions: {
            missingKeywords: atsScore.missingKeywords,
            missingSoftSkills: atsScore.missingSoftSkills,
            suggestions: atsScore.suggestions,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate cover letter");
      }

      const updated = await updateApplication(id, { cover_letter: data.coverLetter });
      if (updated) {
        setApp(updated);
      }
    } catch (error) {
      setGenerateError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setIsGeneratingWithAts(false);
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

  if (!app) {
    return (
      <AuthGuard>
        <div className="text-center py-12">
          <p className="text-purple-300">Application not found</p>
          <Button variant="link" className="text-fuchsia-400" onClick={() => router.push("/applications")}>
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
            <Button variant="ghost" size="icon" className="text-purple-300 hover:text-white hover:bg-purple-500/20" onClick={() => router.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
                {app.job_title}
              </h1>
              <div className="flex items-center gap-2 text-purple-300">
                <Building2 className="h-4 w-4" />
                <span>{app.company}</span>
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleDelete} className="border-red-500/50 text-red-400 hover:text-red-300 hover:bg-red-500/20">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Status */}
          <Card className="border border-purple-500/30 shadow-md shadow-purple-500/10 bg-slate-900/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-sm text-purple-200">Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Badge variant="outline" className="capitalize text-base px-3 py-1 border-fuchsia-400/50 text-fuchsia-300">
                {app.status.replace("_", " ")}
              </Badge>
              <div className="flex flex-wrap gap-2">
                {STATUSES.filter((s) => s !== app.status).map((s) => (
                  <Button
                    key={s}
                    variant="outline"
                    size="sm"
                    className="capitalize border-purple-400/50 text-purple-200 hover:bg-purple-500/20 hover:text-white"
                    onClick={() => handleStatusChange(s)}
                  >
                    {s.replace("_", " ")}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card className="border border-purple-500/30 shadow-md shadow-purple-500/10 bg-slate-900/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-sm text-purple-200">Timeline</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2 text-white">
              <p>
                <span className="text-purple-400">Saved:</span>{" "}
                {new Date(app.created_at).toLocaleDateString()}
              </p>
              {app.applied_at && (
                <p>
                  <span className="text-purple-400">Applied:</span>{" "}
                  {new Date(app.applied_at).toLocaleDateString()}
                </p>
              )}
              <p>
                <span className="text-purple-400">Updated:</span>{" "}
                {new Date(app.updated_at).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* ATS Match Score */}
        <Card className="border border-purple-500/30 shadow-md shadow-purple-500/10 bg-slate-900/50 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2 text-purple-200">
              <Target className="h-4 w-4 text-fuchsia-400" />
              ATS Match Score
            </CardTitle>
            <Button
              size="sm"
              onClick={handleCalculateATS}
              disabled={atsLoading || !app.job_description || !resumeContent}
              className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 shadow-md shadow-purple-500/25"
            >
              {atsLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Target className="h-4 w-4 mr-2" />
              )}
              {atsScore ? "Recalculate" : "Calculate Match"}
            </Button>
          </CardHeader>
          <CardContent>
            {!resumeContent && (
              <p className="text-sm text-purple-300">
                Add your resume in the Resumes page to calculate your match score.
              </p>
            )}
            {!app.job_description && resumeContent && (
              <p className="text-sm text-purple-300">
                No job description available for this application.
              </p>
            )}
            {atsScore && (
              <div className="space-y-4">
                {/* Score Display */}
                <div className="flex items-center gap-4">
                  <div
                    className={`text-4xl font-bold ${
                      atsScore.overallScore >= 70
                        ? "text-emerald-400"
                        : atsScore.overallScore >= 50
                        ? "text-yellow-400"
                        : "text-orange-400"
                    }`}
                  >
                    {atsScore.overallScore}%
                  </div>
                  <div>
                    <div
                      className={`text-sm font-medium ${
                        atsScore.overallScore >= 70
                          ? "text-emerald-400"
                          : atsScore.overallScore >= 50
                          ? "text-yellow-400"
                          : "text-orange-400"
                      }`}
                    >
                      {atsScore.label}
                    </div>
                    <div className="text-xs text-purple-400">ATS Compatibility</div>
                  </div>
                </div>

                {/* Breakdown */}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between bg-slate-800/50 rounded px-3 py-2">
                    <span className="text-purple-300">Keywords</span>
                    <span className="text-white font-medium">{atsScore.breakdown.keywordCoverage}%</span>
                  </div>
                  <div className="flex justify-between bg-slate-800/50 rounded px-3 py-2">
                    <span className="text-purple-300">Soft Skills</span>
                    <span className="text-white font-medium">{atsScore.breakdown.softSkillsCoverage}%</span>
                  </div>
                  <div className="flex justify-between bg-slate-800/50 rounded px-3 py-2">
                    <span className="text-purple-300">Similarity</span>
                    <span className="text-white font-medium">{atsScore.breakdown.similarity}%</span>
                  </div>
                  <div className="flex justify-between bg-slate-800/50 rounded px-3 py-2">
                    <span className="text-purple-300">Impact</span>
                    <span className="text-white font-medium">{atsScore.breakdown.impactScore}%</span>
                  </div>
                </div>

                {/* Expandable Details */}
                <button
                  onClick={() => setAtsExpanded(!atsExpanded)}
                  className="flex items-center gap-1 text-sm text-fuchsia-400 hover:text-fuchsia-300"
                >
                  {atsExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  {atsExpanded ? "Hide details" : "Show suggestions & missing keywords"}
                </button>

                {atsExpanded && (
                  <div className="space-y-3 pt-2 border-t border-purple-500/20">
                    {/* Missing Keywords */}
                    {atsScore.missingKeywords.length > 0 && (
                      <div>
                        <h4 className="text-xs font-medium text-purple-300 mb-1">Missing Keywords</h4>
                        <div className="flex flex-wrap gap-1">
                          {atsScore.missingKeywords.map((kw) => (
                            <span
                              key={kw}
                              className="px-2 py-0.5 text-xs bg-red-900/30 text-red-300 rounded"
                            >
                              {kw}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Missing Soft Skills */}
                    {atsScore.missingSoftSkills.length > 0 && (
                      <div>
                        <h4 className="text-xs font-medium text-purple-300 mb-1">Missing Soft Skills</h4>
                        <div className="flex flex-wrap gap-1">
                          {atsScore.missingSoftSkills.map((skill) => (
                            <span
                              key={skill}
                              className="px-2 py-0.5 text-xs bg-orange-900/30 text-orange-300 rounded"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Suggestions */}
                    {atsScore.suggestions.length > 0 && (
                      <div>
                        <h4 className="text-xs font-medium text-purple-300 mb-1">Suggestions</h4>
                        <ul className="space-y-1">
                          {atsScore.suggestions.map((s, i) => (
                            <li key={i} className="text-xs text-purple-200 flex items-start gap-2">
                              <span className="text-fuchsia-400">•</span>
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Generate Improved CV Button - Always visible after ATS calculation */}
                <div className="pt-3 border-t border-purple-500/20 space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="flex rounded-md overflow-hidden border border-purple-400/50">
                      <button
                        onClick={() => setCvOutputLang("en")}
                        className={`px-3 py-1 text-xs font-medium transition-colors ${
                          cvOutputLang === "en"
                            ? "bg-cyan-600 text-white"
                            : "bg-slate-800 text-purple-300 hover:bg-cyan-500/20"
                        }`}
                      >
                        EN
                      </button>
                      <button
                        onClick={() => setCvOutputLang("sv")}
                        className={`px-3 py-1 text-xs font-medium transition-colors ${
                          cvOutputLang === "sv"
                            ? "bg-cyan-600 text-white"
                            : "bg-slate-800 text-purple-300 hover:bg-cyan-500/20"
                        }`}
                      >
                        SV
                      </button>
                    </div>
                    <Button
                      size="sm"
                      onClick={handleGenerateImprovedResume}
                      disabled={improvedResumeLoading}
                      className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 shadow-md shadow-cyan-500/25"
                    >
                      {improvedResumeLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Wand2 className="h-4 w-4 mr-2" />
                      )}
                      Generate Improved CV
                    </Button>
                  </div>
                  <p className="text-xs text-purple-400">
                    AI will rewrite your CV in {cvOutputLang === "sv" ? "Swedish" : "English"}, incorporating missing keywords (truthfully)
                  </p>
                </div>
              </div>
            )}
            {resumeContent && app.job_description && !atsScore && !atsLoading && (
              <p className="text-sm text-purple-300">
                Click &quot;Calculate Match&quot; to see how well your resume matches this job.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Cover Letter Section */}
        <Card className="border border-purple-500/30 shadow-md shadow-purple-500/10 bg-slate-900/50 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2 text-purple-200">
              <Sparkles className="h-4 w-4 text-fuchsia-400" />
              AI Cover Letter
            </CardTitle>
            <div className="flex gap-2 items-center">
              <div className="flex rounded-md overflow-hidden border border-purple-400/50">
                <button
                  onClick={() => setCoverLetterLang("en")}
                  className={`px-3 py-1 text-xs font-medium transition-colors ${
                    coverLetterLang === "en"
                      ? "bg-purple-500 text-white"
                      : "bg-slate-800 text-purple-300 hover:bg-purple-500/20"
                  }`}
                >
                  EN
                </button>
                <button
                  onClick={() => setCoverLetterLang("sv")}
                  className={`px-3 py-1 text-xs font-medium transition-colors ${
                    coverLetterLang === "sv"
                      ? "bg-purple-500 text-white"
                      : "bg-slate-800 text-purple-300 hover:bg-purple-500/20"
                  }`}
                >
                  SV
                </button>
              </div>
              {app.cover_letter && (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-purple-400/50 text-purple-200 hover:bg-purple-500/20 hover:text-white"
                  onClick={handleCopyCoverLetter}
                >
                  {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                  {copied ? "Copied!" : "Copy"}
                </Button>
              )}
              <Button
                size="sm"
                onClick={handleGenerateCoverLetter}
                disabled={isGenerating || isGeneratingWithAts}
                className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 shadow-md shadow-purple-500/25"
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                {app.cover_letter ? "Regenerate" : "Generate"}
              </Button>
              <Button
                size="sm"
                onClick={handleGenerateWithAtsSuggestions}
                disabled={isGenerating || isGeneratingWithAts || !atsScore}
                className={atsScore
                  ? "bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 shadow-md shadow-cyan-500/25"
                  : "bg-slate-700 text-slate-400 cursor-not-allowed"
                }
                title={!atsScore ? "Calculate ATS score first" : undefined}
              >
                {isGeneratingWithAts ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Target className="h-4 w-4 mr-2" />
                )}
                With ATS
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {generateError && (
              <div className="mb-4 p-3 bg-red-900/30 border border-red-500/50 rounded-lg text-red-300 text-sm">
                {generateError}
              </div>
            )}
            {app.cover_letter ? (
              <div className="prose prose-sm max-w-none prose-invert">
                <p className="whitespace-pre-wrap text-purple-100">{app.cover_letter}</p>
              </div>
            ) : (
              <p className="text-sm text-purple-300">
                Click &quot;Generate&quot; to create a personalized cover letter using AI.
                {resumeContent ? " Your resume will be used to tailor the letter." : " Add your resume info in the Resumes page for better results."}
              </p>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Job Description */}
          <Card className="border border-purple-500/30 shadow-md shadow-purple-500/10 bg-slate-900/50 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2 text-purple-200">
                <FileText className="h-4 w-4" />
                Job Description
              </CardTitle>
              {app.job_url && (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-purple-400/50 text-purple-200 hover:bg-purple-500/20 hover:text-white"
                  onClick={() => window.open(app.job_url, "_blank")}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Original
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <p className="text-sm text-purple-300 whitespace-pre-wrap">
                {app.job_description || "No description available"}
              </p>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card className="border border-purple-500/30 shadow-md shadow-purple-500/10 bg-slate-900/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2 text-purple-200">
                <FileText className="h-4 w-4" />
                Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about this application..."
                className="w-full h-32 p-3 text-sm bg-slate-800/50 border border-purple-500/30 rounded-lg resize-none text-white placeholder:text-purple-300/50 focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
              />
              <Button
                size="sm"
                onClick={handleNotesChange}
                className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600"
              >
                Save Notes
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Improved Resume Modal */}
        {showImprovedResume && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-3xl max-h-[90vh] flex flex-col border border-purple-500/30 shadow-2xl shadow-purple-500/20 bg-slate-900">
              <CardHeader className="flex flex-row items-center justify-between shrink-0">
                <CardTitle className="flex items-center gap-2 text-white">
                  <Wand2 className="h-5 w-5 text-cyan-400" />
                  Improved CV
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyImprovedResume}
                    className="border-purple-400/50 text-purple-200 hover:bg-purple-500/20 hover:text-white"
                  >
                    {improvedResumeCopied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                    {improvedResumeCopied ? "Copied!" : "Copy"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadWord}
                    className="border-cyan-400/50 text-cyan-200 hover:bg-cyan-500/20 hover:text-white"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Word
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-purple-300 hover:text-white hover:bg-purple-500/20"
                    onClick={() => setShowImprovedResume(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="overflow-y-auto flex-1">
                {/* ATS Score Comparison */}
                {atsScore && newAtsScore !== null && (
                  <div className="mb-4 p-4 bg-gradient-to-r from-slate-800/80 to-slate-800/50 rounded-lg border border-purple-500/20">
                    <p className="text-xs text-purple-400 mb-3 font-medium">ATS Score Improvement</p>
                    <div className="flex items-center justify-center gap-6">
                      <div className="text-center">
                        <p className="text-xs text-purple-300 mb-1">Before</p>
                        <div className="text-2xl font-bold text-purple-400">{atsScore.overallScore}%</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <ArrowRight className="h-5 w-5 text-purple-400" />
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-purple-300 mb-1">After</p>
                        <div className="text-2xl font-bold text-emerald-400">{newAtsScore}%</div>
                      </div>
                      {newAtsScore > atsScore.overallScore && (
                        <div className="ml-2 px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-full">
                          <span className="text-sm font-medium text-emerald-400">
                            +{newAtsScore - atsScore.overallScore}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <p className="text-xs text-purple-400 mb-3">
                  This CV has been rewritten to better match the job description. Only truthful information from your original CV is included.
                </p>
                <div className="bg-slate-800/50 border border-purple-500/20 rounded-lg p-4">
                  <pre className="text-sm text-purple-100 whitespace-pre-wrap font-sans">{improvedResume}</pre>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
