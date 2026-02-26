import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// 10 ATS optimization rules from resume-analyzer
const ATS_RULES = `
1. MIRROR THE JOB AD - Use the same key skills and phrases (truthfully) in the CV, especially in summary and recent roles.
2. USE SIMPLE FORMATTING - One column, no tables or graphics, standard headings (Experience, Education, Skills) so ATS can parse correctly.
3. MATCH TITLES WHERE POSSIBLE - Align title/summary with the target role if it reflects actual experience.
4. PUT IMPORTANT KEYWORDS HIGH - Prioritize the most relevant tools, domains and responsibilities in the top third of the CV.
5. ADD A CLEAR SKILLS SECTION - List core tools, methods and languages in a dedicated Skills section for easy matching.
6. TAILOR FOR THIS APPLICATION - Reorder bullets, add/remove details so the CV specifically reflects THIS job description.
7. AVOID KEYWORD STUFFING - Repeat key terms a few times in context, but don't dump buzzwords; humans still read it.
8. USE ATS-FRIENDLY STRUCTURE - Clear section headers, consistent date formats, no fancy formatting.
9. MUST-HAVES OVER NICE-TO-HAVES - Real ATS weigh must-have skills heavier, so prioritize those.
10. LAST JOB TITLE MATTERS - If applicable, align the most recent job title closer to the target role.
`;

export async function POST(request: NextRequest) {
  try {
    const { resumeText, jobDescription, missingKeywords, missingSoftSkills, suggestions, outputLanguage } = await request.json();

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

    // Detect if job description is in a different language than CV
    const detectLang = (text: string): "en" | "sv" => {
      const lower = text.toLowerCase();
      const svWords = ["och", "att", "som", "för", "med", "är", "har", "erfarenhet", "arbete"];
      const enWords = ["and", "the", "that", "for", "with", "is", "have", "experience", "work"];
      let sv = 0, en = 0;
      for (const w of svWords) if (lower.includes(` ${w} `)) sv++;
      for (const w of enWords) if (lower.includes(` ${w} `)) en++;
      return sv > en ? "sv" : "en";
    };

    const jdLang = detectLang(jobDescription);
    const cvLang = detectLang(resumeText);
    // outputLanguage explicitly overrides; otherwise keep CV in original language
    const targetLang: "en" | "sv" = outputLanguage === "sv" ? "sv" : outputLanguage === "en" ? "en" : cvLang;
    const crossLanguage = jdLang !== targetLang;
    const translating = cvLang !== targetLang;

    const crossLanguageInstructions = (crossLanguage || translating) ? `
LANGUAGE INSTRUCTIONS:
${translating ? `- TRANSLATE the CV from ${cvLang === "sv" ? "Swedish" : "English"} to ${targetLang === "sv" ? "Swedish" : "English"}` : ""}
${crossLanguage ? `- The job description is in ${jdLang === "sv" ? "Swedish" : "English"} — translate and incorporate its keywords into ${targetLang === "sv" ? "Swedish" : "English"}` : ""}
- The missing keywords may show format "swedish (english)" — use the ${targetLang === "sv" ? "Swedish" : "English"} version
` : "";

    const prompt = `You are an expert CV editor optimizing resumes for ATS (Applicant Tracking Systems).

TASK:
Rewrite the following CV to better match this job description, while staying COMPLETELY TRUTHFUL.

THE 10 ATS OPTIMIZATION RULES TO FOLLOW:
${ATS_RULES}

ORIGINAL CV:
"""${resumeText}"""

JOB DESCRIPTION:
"""${jobDescription}"""

MISSING KEYWORDS TO INCORPORATE (only where truthful):
${missingKeywords?.join(", ") || "None"}

MISSING SOFT SKILLS TO DEMONSTRATE:
${missingSoftSkills?.join(", ") || "None"}

SPECIFIC SUGGESTIONS:
${suggestions?.join("\n") || "None"}
${crossLanguageInstructions}
CRITICAL INSTRUCTIONS:
1. Write the CV in ${targetLang === "sv" ? "Swedish" : "English"}
2. DO NOT invent skills, experience, or technologies not already in the CV
3. Preserve ALL roles, dates, employers, education from the original
4. Apply the 10 ATS rules above to optimize structure and content
5. Move the most relevant experience and skills toward the top
6. Rephrase bullets to naturally include relevant keywords where they truthfully apply
7. Ensure clear section headers: Summary/Profile, Experience, Education, Skills
8. Keep similar length - do not summarize or shorten significantly

Return ONLY the improved CV text. No commentary, explanations, or markdown formatting.`;

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
