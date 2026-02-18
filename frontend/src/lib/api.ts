const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

// Debug: log what API_BASE is set to
if (typeof window !== "undefined") {
  console.log("[API] NEXT_PUBLIC_API_URL =", API_BASE || "(empty - using relative paths)");
}

async function fetcher<T>(url: string, options?: RequestInit): Promise<T> {
  const fullUrl = `${API_BASE}${url}`;
  console.log("[API] Fetching:", fullUrl);

  const res = await fetch(fullUrl, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    console.error("[API] Error:", res.status, "for URL:", fullUrl);
    throw new Error(`API error: ${res.status}`);
  }
  return res.json();
}

// Jobs
export const searchJobs = (params: {
  keywords: string;
  location?: string;
  sources?: string[];
  englishOnly?: boolean;
}) =>
  fetcher<{ count: number; jobs: Job[]; sources: string[] }>(
    `/api/jobs/search?keywords=${encodeURIComponent(params.keywords)}&location=${params.location || ""}&sources=${(params.sources || ["arbetsformedlingen"]).join(",")}&englishOnly=${params.englishOnly || false}`
  );

export const extractJobFromUrl = (url: string) =>
  fetcher<{
    success: boolean;
    title?: string;
    company?: string;
    location?: string;
    description?: string;
    salary_min?: number | null;
    salary_max?: number | null;
    is_remote?: boolean;
    requirements?: string[];
    url: string;
    source: string;
    source_id: string;
    error?: string;
  }>("/api/jobs/extract", {
    method: "POST",
    body: JSON.stringify({ url }),
  });

export const getJobs = () => fetcher<{ count: number; jobs: Job[] }>("/api/jobs");

export const getJob = (id: string) => fetcher<Job>(`/api/jobs/${id}`);

// Applications
export const getApplications = (status?: string) =>
  fetcher<{ count: number; applications: Application[] }>(
    `/api/applications${status ? `?status=${status}` : ""}`
  );

export const createApplication = (job: { id?: string | null; source_id?: string | null; title: string; company: string; description?: string | null }) =>
  fetcher<Application>("/api/applications", {
    method: "POST",
    body: JSON.stringify({
      job_id: job.id || job.source_id || "",
      job_title: job.title,
      company: job.company,
      job_description: job.description,
    }),
  });

export const updateApplication = (id: string, data: { status?: string; notes?: string }) =>
  fetcher<Application>(`/api/applications/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });

export const getApplication = (id: string) => fetcher<Application>(`/api/applications/${id}`);

// Resumes
export const uploadResume = async (file: File) => {
  const fullUrl = `${API_BASE}/api/resumes/upload`;
  console.log("[API] Uploading resume to:", fullUrl, "file:", file.name);

  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(fullUrl, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    console.error("[API] Upload error:", res.status, "for URL:", fullUrl);
    throw new Error(`Upload failed: ${res.status}`);
  }
  const result = await res.json();
  console.log("[API] Upload success:", result);
  return result;
};

export const getResumes = () => fetcher<{ count: number; resumes: Resume[] }>("/api/resumes");

// Agent
export const runAgent = (action: string, params: Record<string, unknown>) =>
  fetcher<AgentResult>("/api/agent/run", {
    method: "POST",
    body: JSON.stringify({ action, params }),
  });

// Types
export interface Job {
  id: string;
  source: string;
  source_id: string | null;
  title: string;
  company: string;
  company_url: string | null;
  location: string | null;
  is_remote: boolean | null;
  salary_min: number | null;
  salary_max: number | null;
  description: string | null;
  requirements: string[] | null;
  url: string | null;
  posted_at: string | null;
  created_at: string;
}

export interface Application {
  id: string;
  job_id: string;
  job_title: string;
  company: string;
  status: string;
  cover_letter: string | null;
  notes: string | null;
  applied_at: string | null;
  created_at: string;
  updated_at: string;
  events?: ApplicationEvent[];
  job_description?: string;
  job_url?: string;
}

export interface ApplicationEvent {
  id: string;
  event_type: string;
  old_value: string | null;
  new_value: string | null;
  notes: string | null;
  created_at: string;
}

export interface Resume {
  id: string;
  filename: string;
  is_primary: boolean;
  created_at: string;
}

export interface AgentResult {
  status: string;
  result: {
    action: string;
    jobs_found: Job[];
    match_scores: MatchScore[];
    cover_letter: string;
    resume_suggestions: string[];
    application_update: Record<string, unknown>;
    error: string;
  };
}

export interface MatchScore {
  job_id: string;
  job_title: string;
  company: string;
  score: number;
  reasons: string[];
  skills_matched: string[];
  skills_missing: string[];
}
