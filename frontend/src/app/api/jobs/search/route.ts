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

// Arbetsförmedlingen (Swedish Public Employment Service) - FREE
async function searchArbetsformedlingen(
  keywords: string,
  location: string,
  limit: number,
  englishOnly: boolean
): Promise<Job[]> {
  // Include location and language preference in the search query
  let searchQuery = location ? `${keywords} ${location}` : keywords;
  if (englishOnly) {
    searchQuery += " english";
  }
  const url = `https://jobsearch.api.jobtechdev.se/search?q=${encodeURIComponent(searchQuery)}&limit=${limit}`;

  try {
    const resp = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 60 },
    });
    if (!resp.ok) return [];
    const data = await resp.json();

    return (data.hits || []).map((hit: Record<string, unknown>) => {
      const workplace = (hit.workplace_address as Record<string, string>) || {};
      const loc = workplace.city || workplace.municipality || "Sweden";

      return {
        source: "arbetsformedlingen",
        source_id: String(hit.id || ""),
        title: String((hit.headline as string) || ""),
        company: String(
          ((hit.employer as Record<string, string>)?.name as string) || "Unknown"
        ),
        location: loc,
        is_remote: Boolean(hit.remote_work),
        description: String(
          (hit.description as Record<string, string>)?.text || ""
        ),
        salary_min: null,
        salary_max: null,
        url: String((hit.webpage_url as string) || ""),
        posted_at: String((hit.publication_date as string) || ""),
      };
    });
  } catch (e) {
    console.error("Arbetsförmedlingen error:", e);
    return [];
  }
}

// JSearch API (RapidAPI) - FREE TIER: 500 req/month
// Aggregates: LinkedIn, Indeed, Glassdoor, ZipRecruiter, etc.
async function searchJSearch(
  keywords: string,
  location: string,
  limit: number,
  englishOnly: boolean
): Promise<Job[]> {
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) {
    console.log("JSearch: No RAPIDAPI_KEY configured");
    return [];
  }

  // Build query with location
  let query = location ? `${keywords} in ${location}` : keywords;
  if (englishOnly) {
    query += " english";
  }
  let url = `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(query)}&num_pages=1`;

  // Also add location as separate parameter for better filtering
  if (location) {
    url += `&location=${encodeURIComponent(location)}`;
  }

  try {
    const resp = await fetch(url, {
      headers: {
        "X-RapidAPI-Key": apiKey,
        "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
      },
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!resp.ok) {
      console.error("JSearch error:", resp.status, resp.statusText);
      return [];
    }

    const data = await resp.json();
    const jobs = data.data || [];

    return jobs.slice(0, limit).map((job: Record<string, unknown>) => ({
      source: String(job.job_publisher || "jsearch"),
      source_id: String(job.job_id || ""),
      title: String(job.job_title || ""),
      company: String(job.employer_name || "Unknown"),
      location: String(job.job_city || job.job_country || "Remote"),
      is_remote: Boolean(job.job_is_remote),
      description: String(job.job_description || ""),
      salary_min: job.job_min_salary ? Number(job.job_min_salary) : null,
      salary_max: job.job_max_salary ? Number(job.job_max_salary) : null,
      url: String(job.job_apply_link || ""),
      posted_at: String(job.job_posted_at_datetime_utc || ""),
      tags: job.job_required_skills as string[] || [],
    }));
  } catch (e) {
    console.error("JSearch error:", e);
    return [];
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const keywords = searchParams.get("keywords") || "developer";
  const location = searchParams.get("location") || "";
  const sources = searchParams.get("sources")?.split(",") || ["arbetsformedlingen", "jsearch"];
  const limit = parseInt(searchParams.get("limit") || "10", 10);
  const englishOnly = searchParams.get("englishOnly") === "true";

  const results: Job[] = [];
  const errors: string[] = [];

  // Search selected sources in parallel
  const searches: Promise<Job[]>[] = [];

  if (sources.includes("arbetsformedlingen")) {
    searches.push(searchArbetsformedlingen(keywords, location, limit, englishOnly));
  }

  if (sources.includes("jsearch")) {
    searches.push(searchJSearch(keywords, location, limit, englishOnly));
  }

  const searchResults = await Promise.all(searches);
  for (const jobs of searchResults) {
    results.push(...jobs);
  }

  // Sort by posted date (newest first)
  results.sort((a, b) => {
    const dateA = new Date(a.posted_at || 0).getTime();
    const dateB = new Date(b.posted_at || 0).getTime();
    return dateB - dateA;
  });

  return NextResponse.json({
    count: results.length,
    jobs: results,
    sources: sources,
    errors: errors.length > 0 ? errors : undefined,
  });
}
