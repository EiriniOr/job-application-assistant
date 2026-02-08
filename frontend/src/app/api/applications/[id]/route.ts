import { NextRequest, NextResponse } from "next/server";

// Note: This is a stub for demo - in production use a real database
// The in-memory map from the parent route won't be shared here in Vercel serverless

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  // Return a mock application for demo
  return NextResponse.json({
    id,
    job_id: "",
    job_title: "Demo Position",
    company: "Demo Company",
    status: "saved",
    cover_letter: null,
    notes: null,
    applied_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  // Return updated application
  return NextResponse.json({
    id,
    job_id: "",
    job_title: "Demo Position",
    company: "Demo Company",
    status: body.status || "saved",
    cover_letter: body.cover_letter || null,
    notes: body.notes || null,
    applied_at: body.status === "applied" ? new Date().toISOString() : null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
}
