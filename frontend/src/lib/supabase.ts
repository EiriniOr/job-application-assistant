import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Types for database tables
export interface DbApplication {
  id: string;
  user_id: string;
  job_id: string | null;
  job_title: string;
  company: string;
  job_description: string | null;
  status: string;
  cover_letter: string | null;
  notes: string | null;
  applied_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbResumeContent {
  id: string;
  user_id: string;
  content: string | null;
  updated_at: string;
}
