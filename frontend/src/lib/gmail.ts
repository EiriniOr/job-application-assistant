// Server-side Gmail helpers — only used from API routes

// NEXT_PUBLIC_APP_URL takes priority; falls back to Vercel's auto-set VERCEL_URL
const appBase = () =>
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

const redirectUri = () => `${appBase()}/api/gmail/callback`;

export function buildGmailAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: "https://www.googleapis.com/auth/gmail.readonly",
    access_type: "offline",
    prompt: "consent",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function exchangeCodeForTokens(code: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri(),
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${await res.text()}`);
  return res.json();
}

export async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string;
  expires_in: number;
}> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Token refresh failed: ${await res.text()}`);
  return res.json();
}

export interface GmailEmail {
  id: string;
  from: string;
  subject: string;
  snippet: string;
}

// Extracts plain text from a Gmail message payload (handles multipart recursively)
function extractBody(payload: Record<string, unknown>, maxChars = 800): string {
  if (!payload) return "";
  const mimeType = (payload.mimeType as string) ?? "";
  const body = payload.body as { data?: string } | undefined;

  if (mimeType === "text/plain" && body?.data) {
    return Buffer.from(body.data, "base64url").toString("utf-8").slice(0, maxChars);
  }
  // Prefer text/plain part in multipart
  const parts = (payload.parts as Record<string, unknown>[] | undefined) ?? [];
  for (const part of parts) {
    const text = extractBody(part, maxChars);
    if (text) return text;
  }
  // Fall back to text/html if nothing else
  if (mimeType === "text/html" && body?.data) {
    return Buffer.from(body.data, "base64url")
      .toString("utf-8")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .slice(0, maxChars);
  }
  return "";
}

export async function fetchJobEmails(accessToken: string): Promise<GmailEmail[]> {
  // Search full email text (not just subject) so rejections with generic subjects are caught
  const query = encodeURIComponent(
    '(application OR interview OR offer OR "thank you for" OR unfortunately OR "we regret" OR "not selected" OR "other candidates" OR "not moving forward" OR "position has been filled" OR "next steps" OR tyvärr OR ansökan) newer_than:30d -from:me'
  );
  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${query}&maxResults=50`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!listRes.ok) throw new Error(`Gmail list failed: ${await listRes.text()}`);
  const { messages = [] } = await listRes.json();

  const emails: GmailEmail[] = [];
  for (const { id } of messages as { id: string }[]) {
    const msgRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!msgRes.ok) continue;
    const data = await msgRes.json();
    const headers: { name: string; value: string }[] = data.payload?.headers ?? [];
    const get = (n: string) => headers.find((h) => h.name === n)?.value ?? "";
    const body = extractBody(data.payload);
    // Use body if available, else fall back to snippet
    const snippet = body || (data.snippet ?? "");
    emails.push({ id, from: get("From"), subject: get("Subject"), snippet });
  }
  return emails;
}
