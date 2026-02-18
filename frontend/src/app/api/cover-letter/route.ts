import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { jobTitle, company, jobDescription, resumeInfo, language = "en" } = await request.json();

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY not configured" },
        { status: 500 }
      );
    }

    const jobDetails = `JOB DETAILS:
- Position: ${jobTitle}
- Company: ${company}
- Job Description: ${jobDescription || "Not provided"}

${resumeInfo ? `APPLICANT'S RESUME/BACKGROUND:\n${resumeInfo}` : ""}`;

    const swedishPrompt = `Du är en expert på karriärcoaching och ATS-optimering (Applicant Tracking System). Skriv ett effektivt personligt brev på svenska för en jobbansökan i Sverige.

${jobDetails}

KRITISKA KRAV:

1. INLEDNING: Börja med "Hej!" - skapar en vänlig, kulturellt lämplig ton för svenska arbetsmarknaden.

2. ATS-OPTIMERING:
   - Extrahera och inkludera nyckelord från jobbannonsen naturligt
   - Inkludera specifika färdigheter, tekniker och kvalifikationer som nämns i annonsen
   - Använd branschstandard terminologi som ATS-system känner igen
   - Undvik tabeller, rubriker eller specialformatering som förvirrar ATS

3. STYRKOR SOM MATCHAR:
   - Analysera jobbkraven och identifiera de TOP 3-5 viktigaste kvalifikationerna
   - För varje nyckelkrav, ge ett specifikt exempel från CV:t som visar hur kandidaten uppfyller det
   - Kvantifiera prestationer där det är möjligt (%, siffror, skala)

4. STRUKTUR (3-4 stycken):
   - Stycke 1: Entusiastisk öppning med "Hej!", ange tjänsten, uttryck genuint intresse för företaget
   - Stycke 2: Nyckelstyrkorna matchade mot jobbkraven med specifika exempel
   - Stycke 3: Ytterligare relevanta färdigheter/erfarenheter, kulturell passform
   - Stycke 4: Stark avslutning med uppmaning till handling, tillgänglighet för intervju

5. TON:
   - Professionell men varm och personlig (svensk arbetskultur värderar ödmjukhet och samarbete)
   - Självsäker utan att vara arrogant
   - Visa genuint engagemang, inte generiska fraser
   - Undvik klichéer

6. LÄNGD: 250-350 ord

Returnera ENDAST personligt brev-texten på svenska, redo att kopiera och använda. Inga ytterligare kommentarer eller förklaringar.`;

    const englishPrompt = `You are an expert career coach and ATS (Applicant Tracking System) optimization specialist. Generate a highly effective cover letter for a job application in Sweden.

${jobDetails}

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

    const prompt = language === "sv" ? swedishPrompt : englishPrompt;

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
