import { NextResponse } from "next/server";

// Simple in-memory storage for demo (jobs saved from searches)
// In production, this would be a database
export async function GET() {
  // Return empty for now - in a full deployment, this would query a database
  return NextResponse.json({ count: 0, jobs: [] });
}
