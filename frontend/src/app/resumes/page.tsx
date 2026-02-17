"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AuthGuard } from "@/components/auth-guard";
import { getResumeContent, saveResumeContent } from "@/lib/supabase-storage";
import { Loader2, Save, Sparkles } from "lucide-react";

export default function ResumesPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [resumeText, setResumeText] = useState("");
  const [textSaved, setTextSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load resume content from Supabase
  useEffect(() => {
    getResumeContent().then((content) => {
      setResumeText(content);
      setIsLoading(false);
    });
  }, []);

  const handleSaveResumeText = async () => {
    setSaving(true);
    const success = await saveResumeContent(resumeText);
    if (success) {
      setTextSaved(true);
      setTimeout(() => setTextSaved(false), 2000);
    }
    setSaving(false);
  };

  if (isLoading) {
    return (
      <AuthGuard>
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent">
            Resume
          </h1>
          <p className="text-slate-500 mt-1">
            Add your resume content for AI-powered cover letter generation
          </p>
        </div>

        {/* Resume Content for AI */}
        <Card className="border-0 shadow-md bg-white/90 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2 text-slate-600">
              <Sparkles className="h-4 w-4" />
              Resume Content for AI Cover Letters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-slate-500">
              Paste your resume content below. This text will be used to generate personalized cover letters for your job applications.
            </p>
            <textarea
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              placeholder="Paste your resume content here (skills, experience, education, etc.)..."
              className="w-full h-64 p-3 text-sm border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
            <div className="flex items-center gap-3">
              <Button
                onClick={handleSaveResumeText}
                disabled={saving}
                className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Resume Content
              </Button>
              {textSaved && (
                <span className="text-sm text-emerald-600">Saved!</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-white/90 backdrop-blur p-6">
          <div className="space-y-3 text-sm text-slate-600">
            <h3 className="font-medium text-slate-800">Tips for better cover letters:</h3>
            <ul className="list-disc list-inside space-y-1">
              <li>Include your key skills and technologies</li>
              <li>List your most relevant work experience</li>
              <li>Mention notable projects or achievements</li>
              <li>Add your education background</li>
              <li>Include any certifications or awards</li>
            </ul>
          </div>
        </Card>
      </div>
    </AuthGuard>
  );
}
