import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { resumeText, jobDescription, missingKeywords, missingSoftSkills, suggestions, language = "en" } = await request.json();

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY not configured" },
        { status: 500 }
      );
    }

    if (!resumeText || !jobDescription) {
      return NextResponse.json(
        { error: "Resume and job description are required" },
        { status: 400 }
      );
    }

    const prompt = `You are an expert CV editor optimizing resumes for ATS systems.

TASK:
Rewrite the following CV to better match this job description, while staying COMPLETELY TRUTHFUL.
- DO NOT invent skills, experience, or technologies not already in the CV
- You may rephrase, reorder, and emphasize relevant experience
- Naturally incorporate missing keywords WHERE THEY TRUTHFULLY APPLY
- Keep the same structure and length as the original

ORIGINAL CV:
"""${resumeText}"""

JOB DESCRIPTION:
"""${jobDescription}"""

MISSING KEYWORDS TO INCORPORATE (only if truthful):
${missingKeywords?.join(", ") || "None"}

MISSING SOFT SKILLS TO DEMONSTRATE:
${missingSoftSkills?.join(", ") || "None"}

ATS SUGGESTIONS:
${suggestions?.join("\n") || "None"}

INSTRUCTIONS:
1. Keep the CV in ${language === "sv" ? "Swedish" : "English"}
2. Maintain ATS-friendly structure: clear sections (Summary, Experience, Education, Skills)
3. Use simple formatting, no tables or columns
4. Preserve ALL roles, dates, employers, education from the original
5. Rephrase bullets to naturally include relevant keywords where they apply
6. Add soft skills demonstrations through concrete examples where truthful
7. DO NOT add skills or experience not present in the original CV
8. Keep similar length - do not shorten or summarize

Return ONLY the improved CV text. No commentary or explanations.`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 3000,
      messages: [{ role: "user", content: prompt }],
    });

    const improvedResume = message.content[0].type === "text" ? message.content[0].text : "";

    return NextResponse.json({ improvedResume });
  } catch (error) {
    console.error("Resume improvement error:", error);
    return NextResponse.json(
      { error: "Failed to improve resume" },
      { status: 500 }
    );
  }
}
