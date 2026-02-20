"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AuthGuard } from "@/components/auth-guard";
import { getResumeContent, saveResumeContent, getCustomInstructions, saveCustomInstructions } from "@/lib/supabase-storage";
import { Loader2, Save, Sparkles, FileText, MessageSquare, ChevronDown, ChevronUp } from "lucide-react";

const DEFAULT_INSTRUCTIONS_PREVIEW = `Default AI behavior (used when no custom instructions provided):

• First paragraph: Start with "Hej!" or greeting, introduce yourself and state genuine interest
• Second paragraph: Talk about specific experiences - "During my education I learned...", "In my thesis I built..."
• Third paragraph: Explain additional value you bring to the organization
• Closing: "I look forward to discussing..." + "Med vänlig hälsning," (Swedish) or "Best regards," (English)
• Tone: Direct, specific, human-sounding - avoid corporate buzzwords
• Length: 250-350 words`;

export default function MyPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [resumeText, setResumeText] = useState("");
  const [customInstructions, setCustomInstructions] = useState("");
  const [resumeSaved, setResumeSaved] = useState(false);
  const [instructionsSaved, setInstructionsSaved] = useState(false);
  const [savingResume, setSavingResume] = useState(false);
  const [savingInstructions, setSavingInstructions] = useState(false);
  const [showDefaultInstructions, setShowDefaultInstructions] = useState(false);

  // Load content from Supabase
  useEffect(() => {
    Promise.all([getResumeContent(), getCustomInstructions()]).then(
      ([resume, instructions]) => {
        setResumeText(resume);
        setCustomInstructions(instructions);
        setIsLoading(false);
      }
    );
  }, []);

  const handleSaveResumeText = async () => {
    setSavingResume(true);
    const success = await saveResumeContent(resumeText);
    if (success) {
      setResumeSaved(true);
      setTimeout(() => setResumeSaved(false), 2000);
    }
    setSavingResume(false);
  };

  const handleSaveInstructions = async () => {
    setSavingInstructions(true);
    const success = await saveCustomInstructions(customInstructions);
    if (success) {
      setInstructionsSaved(true);
      setTimeout(() => setInstructionsSaved(false), 2000);
    }
    setSavingInstructions(false);
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

  return (
    <AuthGuard>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
            My Page
          </h1>
          <p className="text-purple-300 mt-1">
            Your resume and personalized AI settings
          </p>
        </div>

        {/* Resume Content */}
        <Card className="border border-purple-500/30 shadow-md shadow-purple-500/10 bg-slate-900/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2 text-purple-200">
              <FileText className="h-4 w-4 text-fuchsia-400" />
              My Resume / CV
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-purple-300">
              Paste your resume content. This will be used to generate personalized cover letters.
            </p>
            <textarea
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              placeholder="Paste your resume content here (skills, experience, education, etc.)..."
              className="w-full h-64 p-3 text-sm bg-slate-800/50 border border-purple-500/30 rounded-lg resize-none text-white placeholder:text-purple-300/50 focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
            />
            <div className="flex items-center gap-3">
              <Button
                onClick={handleSaveResumeText}
                disabled={savingResume}
                className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 shadow-md shadow-purple-500/25"
              >
                {savingResume ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Resume
              </Button>
              {resumeSaved && (
                <span className="text-sm text-emerald-400">Saved!</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Custom Instructions */}
        <Card className="border border-purple-500/30 shadow-md shadow-purple-500/10 bg-slate-900/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2 text-purple-200">
              <MessageSquare className="h-4 w-4 text-cyan-400" />
              Custom Cover Letter Instructions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-purple-300">
              Add your own instructions for how the AI should write cover letters. Leave blank to use the default style.
            </p>

            {/* Show/Hide Default Instructions */}
            <button
              onClick={() => setShowDefaultInstructions(!showDefaultInstructions)}
              className="flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              {showDefaultInstructions ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              {showDefaultInstructions ? "Hide" : "Show"} default instructions
            </button>

            {showDefaultInstructions && (
              <div className="p-3 bg-slate-800/70 border border-cyan-500/20 rounded-lg">
                <pre className="text-xs text-cyan-200 whitespace-pre-wrap font-sans">
                  {DEFAULT_INSTRUCTIONS_PREVIEW}
                </pre>
              </div>
            )}

            <textarea
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              placeholder="Example: Always mention my passion for sustainability. Start with an attention-grabbing first sentence. Emphasize my leadership experience. Keep a friendly but professional tone..."
              className="w-full h-40 p-3 text-sm bg-slate-800/50 border border-purple-500/30 rounded-lg resize-none text-white placeholder:text-purple-300/50 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
            <div className="flex items-center gap-3">
              <Button
                onClick={handleSaveInstructions}
                disabled={savingInstructions}
                className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 shadow-md shadow-cyan-500/25"
              >
                {savingInstructions ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Instructions
              </Button>
              {instructionsSaved && (
                <span className="text-sm text-emerald-400">Saved!</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tips Card */}
        <Card className="border border-purple-500/30 shadow-md shadow-purple-500/10 bg-slate-900/50 backdrop-blur p-6">
          <div className="space-y-3 text-sm text-purple-200">
            <h3 className="font-medium text-white flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-fuchsia-400" />
              Tips for better results
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="font-medium text-purple-100 mb-1">Resume tips:</p>
                <ul className="list-disc list-inside space-y-1 text-purple-300">
                  <li>Include key skills and technologies</li>
                  <li>List relevant work experience</li>
                  <li>Mention notable projects</li>
                  <li>Add education background</li>
                </ul>
              </div>
              <div>
                <p className="font-medium text-purple-100 mb-1">Instruction ideas:</p>
                <ul className="list-disc list-inside space-y-1 text-purple-300">
                  <li>Specify your preferred tone</li>
                  <li>Highlight certain achievements</li>
                  <li>Mention values to emphasize</li>
                  <li>Request specific opening styles</li>
                </ul>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </AuthGuard>
  );
}
