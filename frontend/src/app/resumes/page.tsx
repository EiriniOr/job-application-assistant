"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getResumes, uploadResume } from "@/lib/api";
import { FileText, Upload, Loader2 } from "lucide-react";
import { useRef, useState } from "react";

export default function ResumesPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["resumes"],
    queryFn: () => getResumes(),
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      setUploading(true);
      try {
        return await uploadResume(file);
      } finally {
        setUploading(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resumes"] });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadMutation.mutate(file);
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
            Upload and manage your resumes for AI-powered matching
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

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : data && data.resumes.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.resumes.map((resume) => (
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
              <CardContent>
                <p className="text-sm text-slate-500">
                  Uploaded {new Date(resume.created_at).toLocaleDateString()}
                </p>
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
                Upload a PDF or DOCX resume to enable AI matching
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
