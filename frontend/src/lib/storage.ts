// Client-side localStorage storage for applications and resumes
// Data persists in the browser across page refreshes

import type { Application, Resume, Job } from "./api";

const STORAGE_KEYS = {
  APPLICATIONS: "job_assistant_applications",
  RESUMES: "job_assistant_resumes",
};

// Applications
export function getStoredApplications(): Application[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(STORAGE_KEYS.APPLICATIONS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveApplication(job: Job): Application {
  const apps = getStoredApplications();
  const id = `app_${Date.now()}`;

  const app: Application = {
    id,
    job_id: job.id || job.source_id || "",
    job_title: job.title,
    company: job.company,
    status: "saved",
    cover_letter: null,
    notes: null,
    applied_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    job_description: job.description || undefined,
  };

  apps.push(app);
  localStorage.setItem(STORAGE_KEYS.APPLICATIONS, JSON.stringify(apps));
  return app;
}

export function updateStoredApplication(
  id: string,
  updates: Partial<Application>
): Application | null {
  const apps = getStoredApplications();
  const index = apps.findIndex((a) => a.id === id);
  if (index === -1) return null;

  apps[index] = {
    ...apps[index],
    ...updates,
    updated_at: new Date().toISOString(),
  };

  localStorage.setItem(STORAGE_KEYS.APPLICATIONS, JSON.stringify(apps));
  return apps[index];
}

export function deleteStoredApplication(id: string): boolean {
  const apps = getStoredApplications();
  const filtered = apps.filter((a) => a.id !== id);
  if (filtered.length === apps.length) return false;

  localStorage.setItem(STORAGE_KEYS.APPLICATIONS, JSON.stringify(filtered));
  return true;
}

export function isJobSaved(jobId: string): boolean {
  const apps = getStoredApplications();
  return apps.some((a) => a.job_id === jobId);
}

export function getStoredApplication(id: string): Application | null {
  const apps = getStoredApplications();
  return apps.find((a) => a.id === id) || null;
}

// Resumes
export function getStoredResumes(): Resume[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(STORAGE_KEYS.RESUMES);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveResume(filename: string): Resume {
  const resumes = getStoredResumes();
  const id = `resume_${Date.now()}`;

  // Mark all others as non-primary
  resumes.forEach((r) => (r.is_primary = false));

  const resume: Resume = {
    id,
    filename,
    is_primary: true,
    created_at: new Date().toISOString(),
  };

  resumes.push(resume);
  localStorage.setItem(STORAGE_KEYS.RESUMES, JSON.stringify(resumes));
  return resume;
}

export function deleteStoredResume(id: string): boolean {
  const resumes = getStoredResumes();
  const filtered = resumes.filter((r) => r.id !== id);
  if (filtered.length === resumes.length) return false;

  localStorage.setItem(STORAGE_KEYS.RESUMES, JSON.stringify(filtered));
  return true;
}
