import { NextResponse } from "next/server";

export async function GET() {
  // Demo: Return empty list
  // In production, query database
  return NextResponse.json({ count: 0, resumes: [] });
}
