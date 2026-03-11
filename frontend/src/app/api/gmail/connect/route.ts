import { NextResponse } from "next/server";
import { buildGmailAuthUrl } from "@/lib/gmail";

export async function GET() {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.json(
      { error: "Gmail OAuth not configured — add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in Vercel env vars" },
      { status: 500 }
    );
  }
  return NextResponse.redirect(buildGmailAuthUrl());
}
