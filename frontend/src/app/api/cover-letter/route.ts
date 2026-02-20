import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { jobTitle, company, jobDescription, resumeInfo, language = "en", atsSuggestions, customInstructions } = await request.json();

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY not configured" },
        { status: 500 }
      );
    }

    const atsSection = atsSuggestions ? `
ATS ANALYSIS RESULTS (use these to strengthen the letter):
- Missing Keywords to naturally incorporate: ${atsSuggestions.missingKeywords?.join(", ") || "None"}
- Missing Soft Skills to demonstrate: ${atsSuggestions.missingSoftSkills?.join(", ") || "None"}
- Suggestions: ${atsSuggestions.suggestions?.join("; ") || "None"}

IMPORTANT: Only mention skills/keywords that are TRUTHFULLY in the applicant's background.
Demonstrate soft skills through concrete examples from their experience.
` : "";

    const jobDetails = `JOB DETAILS:
- Position: ${jobTitle}
- Company: ${company}
- Job Description: ${jobDescription || "Not provided"}

${resumeInfo ? `APPLICANT'S RESUME/BACKGROUND:\n${resumeInfo}` : ""}
${atsSection}`;

    const swedishPrompt = `Du är en expert på karriärcoaching. Skriv ett personligt brev på svenska för en jobbansökan i Sverige.

${jobDetails}

INSTRUKTIONER FÖR ATT LÅTA MÄNSKLIG (INTE AI-GENERERAD):

1. FÖRSTA STYCKET - Direkt och enkel:
   - Börja med "Hej!" följt av "Mitt namn är [förnamn] och jag söker denna tjänst eftersom..."
   - Ge en genuin anledning: det passar mina karriärmål, jag vill lösa verkliga problem, jag vill skapa värde
   - CITERA INTE annonsen. Istället för "Ert fokus på X stämmer med min passion för X", skriv direkt "Jag brinner för att skapa AI-lösningar som ger verkligt värde"
   - Tala om dina passioner direkt utan att referera till vad företaget sa

2. ANDRA STYCKET - Tala direkt om erfarenheter:
   - Börja med "Under min utbildning lärde jag mig..." eller "I mitt examensarbete byggde jag..."
   - Tala om specifika saker personen gjorde och lärde sig
   - UNDVIK abstrakta fraser som "Min bakgrund kombinerar djup teknisk expertis med praktisk erfarenhet" - ingen pratar så
   - Istället: "Jag arbetade med X, byggde Y, lärde mig Z"
   - Var specifik om färdigheter och verktyg personen använde

3. TREDJE STYCKET - Direkt om mervärde:
   - Börja med "Jag bidrar även med min erfarenhet/kunskap inom X till er organisation..."
   - Var direkt om vilka ytterligare färdigheter de kan tillföra
   - Koppla ihop deras unika bakgrund med hur det hjälper företaget
   - Behåll det personligt och mänskligt

4. AVSLUTNING:
   - "Jag ser fram emot att diskutera hur jag kan bidra till [företagsnamn], och tack för att ni överväger min ansökan."
   - VIKTIGT: Avsluta ALLTID med exakt "Med vänlig hälsning," följt av [förnamn efternamn]. ALDRIG "Tack så mycket" eller "Vänliga hälsningar".

5. TON:
   - Skriv som en riktig person, inte som en AI
   - Var specifik och direkt, undvik vaga uttalanden
   - Professionell men personlig (svensk kultur värderar ödmjukhet)
   - Självsäker men inte arrogant

6. LÄNGD: 250-350 ord

Returnera ENDAST personligt brev-texten på svenska. Inga kommentarer.`;

    const englishPrompt = `You are an expert career coach. Generate a cover letter for a job application in Sweden.

${jobDetails}

INSTRUCTIONS TO SOUND HUMAN (NOT AI-GENERATED):

1. FIRST PARAGRAPH - Direct and simple:
   - Start with "Hej!" followed by "My name is [first name] and I am interested in this role because..."
   - Give a genuine reason: it aligns with my career goals, I want to solve real problems, I want to create real value
   - DO NOT quote the job ad. Instead of "Your focus on X aligns with my passion for X", write directly "I'm passionate about creating AI solutions that deliver real value"
   - Speak about your passions directly without referencing what the company said

2. SECOND PARAGRAPH - Speak directly about experiences:
   - Start with "During my education, I learned..." or "During my thesis, I built..."
   - Talk about specific things the person did and learned
   - AVOID abstract phrases like "My background combines deep technical expertise with hands-on experience" - nobody talks like that
   - Instead: "I worked with X, built Y, learned Z"
   - Be specific about skills and tools the person used

3. THIRD PARAGRAPH - Direct about added value:
   - Start with "I also bring my experience/knowledge in X to your organization..."
   - Be direct about what additional skills they can bring
   - Connect their unique background to how it helps the company
   - Keep it personal and human

4. CLOSING:
   - "I look forward to discussing how I can contribute to [company name], and thank you for considering my application."
   - Sign off with "Best regards," and [first name last name]

5. TONE:
   - Write like a real person, not like an AI
   - Be specific and direct, avoid vague statements
   - Professional but personable (Swedish culture values humility)
   - Confident but not arrogant

6. LENGTH: 250-350 words

Return ONLY the cover letter text. No commentary.`;

    // If custom instructions provided, use simplified prompt with user's instructions
    let prompt: string;
    if (customInstructions && customInstructions.trim()) {
      const customPrompt = `You are an expert career coach writing a cover letter.

${jobDetails}

USER'S CUSTOM INSTRUCTIONS (follow these carefully):
${customInstructions}

ADDITIONAL REQUIREMENTS:
- Write in ${language === "sv" ? "Swedish" : "English"}
- Length: 250-350 words
- ${language === "sv" ? 'ALWAYS end with "Med vänlig hälsning," followed by the name' : 'End with "Best regards," followed by the name'}
- Sound human and natural, not like AI
- Only mention skills/experience that are truthfully in the resume

Return ONLY the cover letter text. No commentary.`;
      prompt = customPrompt;
    } else {
      prompt = language === "sv" ? swedishPrompt : englishPrompt;
    }

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
