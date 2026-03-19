import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import Anthropic from "@anthropic-ai/sdk";
import { fetchJobEmails, refreshAccessToken, type GmailEmail } from "@/lib/gmail";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const STATUS_MAP: Record<string, string> = {
  rejection: "rejected",
  interview_invite: "interview",
  assessment_invite: "assessment",
  offer: "offer",
  application_confirmed: "applied",
};

// Only advance status — never go backwards. Rejections always apply.
function shouldUpdateStatus(current: string, next: string): boolean {
  if (next === "rejected") return true;
  const p: Record<string, number> = { saved: 0, applied: 1, assessment: 2, interview: 3, offer: 4 };
  return (p[next] ?? 0) > (p[current] ?? 0);
}

// Common generic words that shouldn't drive a company match on their own
const GENERIC = new Set([
  "data", "scientist", "engineer", "manager", "senior", "junior", "lead",
  "the", "and", "for", "with", "services", "group", "global", "solutions",
  "digital", "technology", "technologies", "consulting", "graduate", "programme",
  "program", "position", "role", "team",
]);

function significantWords(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !GENERIC.has(w));
}

// Match on company name OR job title word overlap (catches parent/subsidiary pairs like TRATON/Scania)
function matchesApplication(
  emailCompany: string,
  emailJobTitle: string,
  app: { company: string; job_title: string }
): boolean {
  const emailWords = new Set([
    ...significantWords(emailCompany),
    ...significantWords(emailJobTitle),
  ]);
  const appWords = [
    ...significantWords(app.company),
    ...significantWords(app.job_title),
  ];
  return appWords.some((w) => emailWords.has(w));
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
- "rejection": chose other candidates, not moving forward, position filled, unfortunately, regret to inform, will keep you in mind / keep your profile for future opportunities (this IS a rejection for the current role). Swedish: tyvärr, vi har valt andra kandidater, vi går inte vidare med din ansökan, vi har beslutat att gå vidare med andra kandidater, du är inte längre aktuell, vi tackar för ditt intresse men, tack för din ansökan men, vi har tyvärr valt, tjänsten är tillsatt, vi sparar din profil (keeping profile = rejection).
- "assessment_invite": invited to complete an online test, case study, assignment, coding challenge, or any take-home task/assessment before an interview.
- "interview_invite": explicitly invited to a live interview, phone screen, or video call with a person.
- "offer": job offer, employment contract offer.
- "application_confirmed": application received/registered confirmation only.
- "other": newsletters, unrelated emails, or genuinely ambiguous.

Be aggressive about classifying as "rejection" — apologetic tone + other candidates or "not at this time" = rejection. "We'll keep your profile" = rejection.

JSON fields:
- is_job_related: boolean
- type: "rejection" | "assessment_invite" | "interview_invite" | "offer" | "application_confirmed" | "other"
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

    // Fetch emails and applications in parallel
    const [emails, appsResult] = await Promise.all([
      fetchJobEmails(accessToken),
      supabase.from("applications").select("id, company, job_title, status").eq("user_id", user.id),
    ]);

    const applications: { id: string; company: string; job_title: string; status: string }[] =
      appsResult.data ?? [];

    // Classify all emails in parallel (cap concurrency to avoid rate limits)
    const CONCURRENCY = 5;
    const classified: { email: GmailEmail; result: Awaited<ReturnType<typeof classifyEmail>> | null }[] = [];
    for (let i = 0; i < emails.length; i += CONCURRENCY) {
      const batch = emails.slice(i, i + CONCURRENCY);
      const results = await Promise.all(
        batch.map((e) => classifyEmail(e).catch(() => null))
      );
      results.forEach((result, j) => classified.push({ email: batch[j], result }));
    }

    let moved = 0;
    let created = 0;

    for (const { email, result: classification } of classified) {
      if (!classification) continue;

      if (!classification.is_job_related || classification.type === "other") continue;

      const newStatus = STATUS_MAP[classification.type];
      if (!newStatus) continue;

      const match = applications.find((a) =>
        matchesApplication(classification.company, classification.job_title, a)
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
