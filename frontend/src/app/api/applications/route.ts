import { NextRequest, NextResponse } from "next/server";

// Demo: In-memory storage (resets on redeploy)
// In production, use a database like Vercel KV or external DB
const applications: Map<string, Application> = new Map();

interface Application {
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
  job_description?: string;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  let apps = Array.from(applications.values());
  if (status) {
    apps = apps.filter((a) => a.status === status);
  }

  return NextResponse.json({ count: apps.length, applications: apps });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const id = `app_${Date.now()}`;

  const app: Application = {
    id,
    job_id: body.job_id || "",
    job_title: body.job_title || "Unknown Position",
    company: body.company || "Unknown Company",
    status: "saved",
    cover_letter: null,
    notes: null,
    applied_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    job_description: body.job_description,
  };

  applications.set(id, app);
  return NextResponse.json(app);
}
