import { createClient, DbApplication } from "./supabase";
import type { Application, Job } from "./api";

const supabase = createClient();

// Convert DB application to frontend Application type
function toApplication(db: DbApplication): Application {
  return {
    id: db.id,
    job_id: db.job_id || "",
    job_title: db.job_title,
    company: db.company,
    job_description: db.job_description || undefined,
    status: db.status,
    cover_letter: db.cover_letter,
    notes: db.notes,
    applied_at: db.applied_at,
    created_at: db.created_at,
    updated_at: db.updated_at,
  };
}

// Applications
export async function getApplications(): Promise<Application[]> {
  const { data, error } = await supabase
    .from("applications")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching applications:", error);
    return [];
  }

  return (data || []).map(toApplication);
}

export async function getApplication(id: string): Promise<Application | null> {
  const { data, error } = await supabase
    .from("applications")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching application:", error);
    return null;
  }

  return data ? toApplication(data) : null;
}

export async function createApplication(job: Job): Promise<Application | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("applications")
    .insert({
      user_id: user.id,
      job_id: job.id || job.source_id || "",
      job_title: job.title,
      company: job.company,
      job_description: job.description || null,
      status: "saved",
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating application:", error);
    return null;
  }

  return data ? toApplication(data) : null;
}

export async function updateApplication(
  id: string,
  updates: Partial<Application>
): Promise<Application | null> {
  const updateData: Record<string, unknown> = {};

  if (updates.status !== undefined) updateData.status = updates.status;
  if (updates.cover_letter !== undefined) updateData.cover_letter = updates.cover_letter;
  if (updates.notes !== undefined) updateData.notes = updates.notes;
  if (updates.applied_at !== undefined) updateData.applied_at = updates.applied_at;

  const { data, error } = await supabase
    .from("applications")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating application:", error);
    return null;
  }

  return data ? toApplication(data) : null;
}

export async function deleteApplication(id: string): Promise<boolean> {
  const { error } = await supabase
    .from("applications")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting application:", error);
    return false;
  }

  return true;
}

export async function isJobSaved(jobId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("applications")
    .select("id")
    .eq("job_id", jobId)
    .limit(1);

  if (error) {
    console.error("Error checking job:", error);
    return false;
  }

  return (data?.length || 0) > 0;
}

export async function getSavedJobIds(): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("applications")
    .select("job_id");

  if (error) {
    console.error("Error fetching job ids:", error);
    return new Set();
  }

  return new Set(data?.map((d) => d.job_id).filter(Boolean) || []);
}

// Resume content
export async function getResumeContent(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return "";

  const { data, error } = await supabase
    .from("resume_content")
    .select("content")
    .eq("user_id", user.id)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("Error fetching resume:", error);
    return "";
  }

  return data?.content || "";
}

export async function saveResumeContent(content: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from("resume_content")
    .upsert({
      user_id: user.id,
      content,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: "user_id",
    });

  if (error) {
    console.error("Error saving resume:", error);
    return false;
  }

  return true;
}
