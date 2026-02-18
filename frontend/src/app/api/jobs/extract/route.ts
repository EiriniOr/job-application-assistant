import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY not configured" },
        { status: 500 }
      );
    }

    // Try to fetch the page content
    let pageContent = "";
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; JobAssistant/1.0)",
          Accept: "text/html,application/xhtml+xml",
        },
      });

      if (response.ok) {
        const html = await response.text();
        // Strip HTML tags and get text content
        pageContent = html
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .slice(0, 15000); // Limit content size
      }
    } catch (e) {
      console.log("Could not fetch URL:", e);
      // Continue without page content - Claude will use URL context
    }

    // Use Claude to extract job information
    const prompt = `Extract job information from this job posting.

URL: ${url}

${pageContent ? `Page content:\n${pageContent}` : "Note: Could not fetch page content. Extract what you can from the URL itself."}

Return a JSON object with these fields (use null if not found):
{
  "title": "Job title",
  "company": "Company name",
  "location": "Job location",
  "description": "Full job description text (keep the original wording, do not summarize)",
  "salary_min": null or number,
  "salary_max": null or number,
  "is_remote": true/false or null,
  "requirements": ["requirement 1", "requirement 2"],
  "success": true/false
}

If you cannot extract meaningful information, set success to false and provide what you can.
Return ONLY the JSON object, no additional text.`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";

    // Parse the JSON response
    let jobData;
    try {
      // Extract JSON from response (handle potential markdown code blocks)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jobData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch {
      return NextResponse.json(
        { error: "Failed to parse job data", raw: responseText },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ...jobData,
      url,
      source: "manual",
      source_id: `manual_${Date.now()}`,
    });
  } catch (error) {
    console.error("Job extraction error:", error);
    return NextResponse.json(
      { error: "Failed to extract job information" },
      { status: 500 }
    );
  }
}
