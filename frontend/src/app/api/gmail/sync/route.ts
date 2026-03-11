import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import Anthropic from "@anthropic-ai/sdk";
import { fetchJobEmails, refreshAccessToken, type GmailEmail } from "@/lib/gmail";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const STATUS_MAP: Record<string, string> = {
  rejection: "rejected",
  interview_invite: "interview",
  offer: "offer",
  application_confirmed: "applied",
};

// Only advance status — never go backwards. Rejections always apply.
function shouldUpdateStatus(current: string, next: string): boolean {
  if (next === "rejected") return true;
  const p: Record<string, number> = { saved: 0, applied: 1, interview: 2, offer: 3 };
  return (p[next] ?? 0) > (p[current] ?? 0);
}

function matchesCompany(emailCompany: string, appCompany: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const a = norm(emailCompany);
  const b = norm(appCompany);
  return a.length > 2 && b.length > 2 && (a.includes(b) || b.includes(a));
}

async function classifyEmail(email: GmailEmail) {
  const msg = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 150,
    messages: [
      {
        role: "user",
        content: `Classify this email in the context of job applications. Return only valid JSON with no extra text.

From: ${email.from}
Subject: ${email.subject}
Body: ${email.snippet}

Classification rules:
- "rejection": any indication they chose other candidates, not moving forward, position filled, unfortunately, regret to inform, tyvärr (Swedish for unfortunately), vi har valt andra kandidater, etc.
- "interview_invite": invited to interview, want to schedule a call/meeting
- "offer": job offer, employment offer
- "application_confirmed": application received confirmation
- "other": newsletters, unrelated emails, or genuinely ambiguous

Be aggressive about classifying as "rejection" — if the tone is apologetic and they mention other candidates or not proceeding, it is a rejection.

JSON fields:
- is_job_related: boolean
- type: "rejection" | "interview_invite" | "offer" | "application_confirmed" | "other"
- company: string (company name, empty string if unknown)
- job_title: string (job title, empty string if unknown)

JSON:`,
      },
    ],
  });

  const text = msg.content[0].type === "text" ? msg.content[0].text.trim() : "{}";
  const json = text.match(/\{[\s\S]*\}/)?.[0] ?? "{}";
  return JSON.parse(json) as {
    is_job_related: boolean;
    type: string;
    company: string;
    job_title: string;
  };
}

export async function POST() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (toSet) =>
            toSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            ),
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Load Gmail tokens
    const { data: gmailRow } = await supabase
      .from("gmail_integrations")
      .select("access_token, refresh_token, token_expiry")
      .eq("user_id", user.id)
      .single();

    if (!gmailRow) {
      return NextResponse.json({ error: "Gmail not connected" }, { status: 400 });
    }

    // Refresh token if expired (or expiring within 5 min)
    let accessToken: string = gmailRow.access_token;
    const isExpired =
      !gmailRow.token_expiry ||
      new Date(gmailRow.token_expiry) <= new Date(Date.now() + 5 * 60_000);

    if (isExpired && gmailRow.refresh_token) {
      const refreshed = await refreshAccessToken(gmailRow.refresh_token);
      accessToken = refreshed.access_token;
      await supabase
        .from("gmail_integrations")
        .update({
          access_token: refreshed.access_token,
          token_expiry: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
        })
        .eq("user_id", user.id);
    }

    // Fetch job-related emails
    const emails = await fetchJobEmails(accessToken);

    // Load user's applications
    const { data: appsData } = await supabase
      .from("applications")
      .select("id, company, job_title, status")
      .eq("user_id", user.id);
    const applications: { id: string; company: string; job_title: string; status: string }[] =
      appsData ?? [];

    let moved = 0;
    let created = 0;

    for (const email of emails) {
      let classification;
      try {
        classification = await classifyEmail(email);
      } catch {
        continue;
      }

      if (!classification.is_job_related || classification.type === "other") continue;

      const newStatus = STATUS_MAP[classification.type];
      if (!newStatus) continue;

      const match = applications.find((a) =>
        matchesCompany(classification.company, a.company)
      );

      if (match) {
        if (shouldUpdateStatus(match.status, newStatus)) {
          await supabase
            .from("applications")
            .update({ status: newStatus, updated_at: new Date().toISOString() })
            .eq("id", match.id);
          match.status = newStatus;
          moved++;
        }
      } else if (classification.type === "interview_invite" && classification.company) {
        // No existing card — create one at interview stage
        const { data: newApp } = await supabase
          .from("applications")
          .insert({
            user_id: user.id,
            job_title: classification.job_title || "Unknown Position",
            company: classification.company,
            status: "interview",
            notes: `Auto-created from Gmail: "${email.subject}"`,
            job_id: "",
          })
          .select("id, company, job_title, status")
          .single();
        if (newApp) applications.push(newApp);
        created++;
      }
    }

    // Update last synced timestamp
    await supabase
      .from("gmail_integrations")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("user_id", user.id);

    return NextResponse.json({ moved, created, processed: emails.length });
  } catch (e) {
    console.error("Gmail sync error:", e);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
