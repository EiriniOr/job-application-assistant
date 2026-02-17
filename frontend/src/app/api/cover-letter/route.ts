import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { jobTitle, company, jobDescription, resumeInfo } = await request.json();

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY not configured" },
        { status: 500 }
      );
    }

    const prompt = `You are an expert career coach and ATS (Applicant Tracking System) optimization specialist. Generate a highly effective cover letter for a job application in Sweden.

JOB DETAILS:
- Position: ${jobTitle}
- Company: ${company}
- Job Description: ${jobDescription || "Not provided"}

${resumeInfo ? `APPLICANT'S RESUME/BACKGROUND:\n${resumeInfo}` : "No resume provided - write a general but compelling letter."}

CRITICAL REQUIREMENTS:

1. OPENING: Start with "Hej!" (Swedish greeting) - this creates a friendly, culturally appropriate tone for Swedish job market.

2. ATS OPTIMIZATION:
   - Extract and naturally incorporate keywords from the job description
   - Include specific skills, technologies, and qualifications mentioned in the ad
   - Use industry-standard terminology that ATS systems recognize
   - Avoid tables, headers, or special formatting that confuse ATS

3. STRENGTHS MATCHING:
   - Analyze the job requirements and identify the TOP 3-5 most important qualifications
   - For each key requirement, provide a specific example from the resume showing how the candidate meets it
   - Use the STAR method implicitly (Situation, Task, Action, Result) for achievements
   - Quantify achievements where possible (%, numbers, scale)

4. STRUCTURE (3-4 paragraphs):
   - Para 1: Enthusiastic opening with "Hej!", state the position, express genuine interest in the company
   - Para 2: Key strengths matched to job requirements with specific examples
   - Para 3: Additional relevant skills/experience, cultural fit, what you bring to the team
   - Para 4: Strong closing with call to action, availability to discuss further

5. TONE:
   - Professional but warm and personable (Swedish work culture values humility and collaboration)
   - Confident without being arrogant
   - Show genuine enthusiasm, not generic phrases
   - Avoid clichés like "passionate self-starter" or "think outside the box"

6. LENGTH: 250-350 words (optimal for both human readers and ATS)

Return ONLY the cover letter text, ready to copy and use. No additional commentary, headers, or explanations.`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const coverLetter = message.content[0].type === "text"
      ? message.content[0].text
      : "";

    return NextResponse.json({ coverLetter });
  } catch (error) {
    console.error("Cover letter generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate cover letter" },
      { status: 500 }
    );
  }
}
