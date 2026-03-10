import { NextResponse } from "next/server";
import { buildGmailAuthUrl } from "@/lib/gmail";

export async function GET() {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.NEXT_PUBLIC_APP_URL) {
    return NextResponse.json({ error: "Gmail OAuth not configured" }, { status: 500 });
  }
  return NextResponse.redirect(buildGmailAuthUrl());
}
