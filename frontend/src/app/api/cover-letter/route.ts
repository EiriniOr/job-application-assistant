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

    const swedishPrompt = `Du är en expert på karriärcoaching. Skriv ett personligt brev på svenska för en jobbansökan i Sverige.

${jobDetails}

INSTRUKTIONER:

1. INLEDNING: Börja med "Hej!" - vänlig ton för svenska arbetsmarknaden.

2. MATCHNING OCH MERVÄRDE:
   - Identifiera hur kandidatens erfarenhet matchar rollens behov
   - Lyft fram YTTERLIGARE färdigheter från CV:t som inte nämns i annonsen men som tillför värde till rollen
   - Visa hur kandidaten kan bidra utöver det som efterfrågas

3. NATURLIGT SPRÅK:
   - KOPIERA INTE statistik, siffror eller procentsatser från jobbannonsen ordagrant
   - Förstå innebörden av annonsen och uttryck det med egna ord
   - Undvik att citera annonsen direkt - det låter onaturligt
   - Använd kandidatens egna prestationer och siffror från CV:t

4. STRUKTUR (3-4 stycken):
   - Stycke 1: "Hej!", tjänsten, genuint intresse för företaget
   - Stycke 2: Relevanta styrkor med konkreta exempel
   - Stycke 3: Ytterligare värde kandidaten tillför, unika bidrag
   - Stycke 4: Avslutning med tillgänglighet för intervju

5. TON:
   - Professionell men personlig (svensk arbetskultur värderar ödmjukhet)
   - Självsäker utan att vara arrogant
   - Genuint engagemang, inte generiska fraser

6. LÄNGD: 250-350 ord

Returnera ENDAST personligt brev-texten på svenska. Inga kommentarer.`;

    const englishPrompt = `You are an expert career coach. Generate a cover letter for a job application in Sweden.

${jobDetails}

INSTRUCTIONS:

1. OPENING: Start with "Hej!" (Swedish greeting) - friendly tone for Swedish job market.

2. MATCHING AND ADDED VALUE:
   - Identify how the candidate's experience matches the role's needs
   - Highlight ADDITIONAL skills from the resume NOT mentioned in the job ad that add value to the role
   - Show how the candidate can contribute beyond what's explicitly requested

3. NATURAL LANGUAGE:
   - DO NOT copy statistics, numbers, or percentages from the job ad verbatim
   - Understand the meaning/intent of the ad and express it in your own words
   - Avoid quoting the ad directly - it sounds unnatural
   - Use the candidate's own achievements and numbers from THEIR resume

4. STRUCTURE (3-4 paragraphs):
   - Para 1: "Hej!", the position, genuine interest in the company
   - Para 2: Relevant strengths with concrete examples
   - Para 3: Additional value the candidate brings, unique contributions
   - Para 4: Closing with availability for interview

5. TONE:
   - Professional but personable (Swedish work culture values humility)
   - Confident without being arrogant
   - Genuine enthusiasm, not generic phrases
   - Avoid clichés

6. LENGTH: 250-350 words

Return ONLY the cover letter text. No commentary.`;

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
