import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Return a placeholder - in production, query database
  return NextResponse.json({
    id,
    source: "demo",
    source_id: id,
    title: "Demo Position",
    company: "Demo Company",
    location: "Remote",
    is_remote: true,
    description: "This is a demo job listing.",
    salary_min: null,
    salary_max: null,
    url: "",
    posted_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  });
}
