"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getStoredResumes, saveResume, deleteStoredResume } from "@/lib/storage";
import type { Resume } from "@/lib/api";
import { FileText, Upload, Loader2, Trash2 } from "lucide-react";

export default function ResumesPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Load resumes from localStorage
  useEffect(() => {
    const stored = getStoredResumes();
    setResumes(stored);
    setIsLoading(false);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploading(true);
      setUploadSuccess(false);

      // Simulate brief delay for UX
      setTimeout(() => {
        const newResume = saveResume(file.name);
        setResumes((prev) => [...prev.map(r => ({ ...r, is_primary: false })), newResume]);
        setUploading(false);
        setUploadSuccess(true);

        // Clear success after 3 seconds
        setTimeout(() => setUploadSuccess(false), 3000);
      }, 500);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Delete this resume?")) {
      deleteStoredResume(id);
      setResumes((prev) => prev.filter((r) => r.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
            Resumes
          </h1>
          <p className="text-slate-500 mt-1">
            Upload and manage your resumes for job applications
          </p>
        </div>
        <div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".pdf,.docx,.doc,.txt"
            className="hidden"
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            Upload Resume
          </Button>
        </div>
      </div>

      {uploadSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700">
          Resume uploaded successfully!
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : resumes.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {resumes.map((resume) => (
            <Card key={resume.id} className="border-0 shadow-md bg-white/90 backdrop-blur">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <FileText className="h-5 w-5 text-blue-600" />
                    </div>
                    <CardTitle className="text-base text-slate-800">{resume.filename}</CardTitle>
                  </div>
                  {resume.is_primary && (
                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Primary</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <p className="text-sm text-slate-500">
                  Uploaded {new Date(resume.created_at).toLocaleDateString()}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(resume.id)}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12 border-0 shadow-lg bg-white/90 backdrop-blur">
          <div className="text-center space-y-4">
            <div className="p-4 bg-gradient-to-br from-blue-100 to-violet-100 rounded-2xl w-fit mx-auto">
              <FileText className="h-12 w-12 text-violet-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">No resumes yet</h3>
              <p className="text-sm text-slate-500">
                Upload a PDF or DOCX resume to track your applications
              </p>
            </div>
            <Button
              onClick={() => fileInputRef.current?.click()}
              className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Resume
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
