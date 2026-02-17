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

    const prompt = `Generate a professional cover letter for a job application.

Job Details:
- Position: ${jobTitle}
- Company: ${company}
- Description: ${jobDescription || "Not provided"}

${resumeInfo ? `Applicant's Resume/Background:\n${resumeInfo}` : ""}

Write a compelling, personalized cover letter that:
1. Shows enthusiasm for the specific role and company
2. Highlights relevant skills and experience
3. Explains why the candidate is a good fit
4. Is professional but not overly formal
5. Is about 3-4 paragraphs

Return ONLY the cover letter text, no additional commentary.`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
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
