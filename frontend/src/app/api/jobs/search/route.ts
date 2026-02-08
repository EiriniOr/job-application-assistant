import { NextRequest, NextResponse } from "next/server";

interface Job {
  source: string;
  source_id: string;
  title: string;
  company: string;
  location: string;
  is_remote?: boolean;
  description: string;
  salary_min?: number | null;
  salary_max?: number | null;
  url: string;
  posted_at: string;
  tags?: string[];
}

async function searchArbetsformedlingen(
  keywords: string,
  limit: number
): Promise<Job[]> {
  const url = `https://jobsearch.api.jobtechdev.se/search?q=${encodeURIComponent(keywords)}&limit=${limit}`;

  try {
    const resp = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 60 },
    });
    if (!resp.ok) return [];
    const data = await resp.json();

    return (data.hits || []).map((hit: Record<string, unknown>) => {
      const workplace = (hit.workplace_address as Record<string, string>) || {};
      const location =
        workplace.city || workplace.municipality || "Sweden";

      return {
        source: "arbetsformedlingen",
        source_id: String(hit.id || ""),
        title: String((hit.headline as string) || ""),
        company: String(
          ((hit.employer as Record<string, string>)?.name as string) || "Unknown"
        ),
        location,
        is_remote: Boolean(hit.remote_work),
        description: String(
          ((hit.description as Record<string, string>)?.text || "").slice(0, 500)
        ),
        salary_min: null,
        salary_max: null,
        url: String((hit.webpage_url as string) || ""),
        posted_at: String((hit.publication_date as string) || ""),
      };
    });
  } catch {
    return [];
  }
}

async function searchRemoteOK(tags: string, limit: number): Promise<Job[]> {
  const url = `https://remoteok.com/api?tag=${encodeURIComponent(tags)}&limit=${limit}`;

  try {
    const resp = await fetch(url, {
      headers: { "User-Agent": "job-assistant/1.0" },
      next: { revalidate: 60 },
    });
    if (!resp.ok) return [];
    const data = await resp.json();

    // First element is metadata, skip it
    return data.slice(1, limit + 1).map((r: Record<string, unknown>) => ({
      source: "remoteok",
      source_id: String(r.id || ""),
      title: String((r.position as string) || ""),
      company: String((r.company as string) || "Unknown"),
      location: "Remote",
      is_remote: true,
      description: String((r.description as string) || ""),
      salary_min: r.salary_min ? Number(r.salary_min) : null,
      salary_max: r.salary_max ? Number(r.salary_max) : null,
      url: String((r.url as string) || ""),
      posted_at: String((r.date as string) || ""),
      tags: (r.tags as string[]) || [],
    }));
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const keywords = searchParams.get("keywords") || "python";
  const remoteOnly = searchParams.get("remote_only") === "true";
  const limit = parseInt(searchParams.get("limit") || "10", 10);

  const results: Job[] = [];

  // Arbetsförmedlingen (Swedish jobs) - skip if remote only
  if (!remoteOnly) {
    const afJobs = await searchArbetsformedlingen(keywords, limit);
    results.push(...afJobs);
  }

  // RemoteOK (remote/tech jobs)
  const tag = keywords.split(" ")[0].toLowerCase();
  const remoteJobs = await searchRemoteOK(tag, limit);
  results.push(...remoteJobs);

  return NextResponse.json({ count: results.length, jobs: results });
}
