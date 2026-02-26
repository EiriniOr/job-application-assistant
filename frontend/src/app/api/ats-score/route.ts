import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

// Simple language detection based on common words
function detectLanguage(text: string): "en" | "sv" {
  const lower = text.toLowerCase();
  const svIndicators = ["och", "att", "som", "för", "med", "är", "har", "kan", "ska", "på", "vi", "du", "av", "till", "erfarenhet", "arbete", "utveckling"];
  const enIndicators = ["and", "the", "that", "for", "with", "is", "have", "can", "will", "to", "we", "you", "of", "experience", "work", "development"];

  let svCount = 0;
  let enCount = 0;

  for (const word of svIndicators) {
    const regex = new RegExp(`\\b${word}\\b`, "gi");
    svCount += (lower.match(regex) || []).length;
  }

  for (const word of enIndicators) {
    const regex = new RegExp(`\\b${word}\\b`, "gi");
    enCount += (lower.match(regex) || []).length;
  }

  return svCount > enCount ? "sv" : "en";
}

// Translate keywords using Claude when languages mismatch
async function translateKeywords(keywords: string[], fromLang: "sv" | "en", toLang: "sv" | "en"): Promise<Map<string, string>> {
  const translations = new Map<string, string>();

  if (fromLang === toLang || keywords.length === 0) {
    for (const kw of keywords) {
      translations.set(kw, kw);
    }
    return translations;
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    // Fallback: return original keywords
    for (const kw of keywords) {
      translations.set(kw, kw);
    }
    return translations;
  }

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const fromName = fromLang === "sv" ? "Swedish" : "English";
    const toName = toLang === "sv" ? "Swedish" : "English";

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [{
        role: "user",
        content: `Translate these ${fromName} job-related keywords to ${toName}. Return ONLY a JSON object where keys are original words and values are translations. Keep technical terms (Python, React, etc.) unchanged.

Keywords: ${keywords.join(", ")}

Return valid JSON only, no explanation.`
      }]
    });

    const content = response.content[0].type === "text" ? response.content[0].text : "";
    const parsed = JSON.parse(content);

    for (const kw of keywords) {
      translations.set(kw, parsed[kw] || kw);
    }
  } catch {
    // Fallback on error
    for (const kw of keywords) {
      translations.set(kw, kw);
    }
  }

  return translations;
}

// Stopwords for English and Swedish
const STOP_EN = new Set([
  "a", "an", "the", "and", "or", "but", "if", "then", "than", "so", "because",
  "i", "you", "he", "she", "it", "we", "they", "me", "him", "her", "us", "them",
  "my", "your", "yours", "our", "ours", "their", "theirs", "his", "hers", "its",
  "this", "that", "these", "those", "there", "here", "where", "when", "why", "how",
  "any", "some", "no", "not", "only", "just", "very",
  "am", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "having", "do", "does", "did", "doing",
  "will", "would", "shall", "should", "can", "could", "may", "might", "must",
  "to", "of", "in", "on", "at", "by", "for", "from", "with", "about", "into", "over",
  "under", "between", "through", "during", "before", "after", "up", "down", "out",
  "off", "across", "within", "without",
  "as", "such", "also", "again", "more", "most", "many", "much", "few", "each",
  "other", "another", "same", "own", "too"
]);

const STOP_SV = new Set([
  "en", "ett", "den", "det", "de", "dom", "jag", "du", "han", "hon", "vi", "ni",
  "mig", "dig", "honom", "henne", "oss", "er", "dem",
  "min", "mitt", "mina", "din", "ditt", "dina", "sin", "sitt", "sina", "vår", "vårt",
  "våra", "deras",
  "denna", "detta", "dessa", "här", "där", "sådan", "sådant", "sådana",
  "är", "var", "vara", "blir", "blev", "bli",
  "har", "hade", "haft", "ha",
  "gör", "gjorde", "göra",
  "kan", "kunde", "ska", "skall", "skulle", "får", "fick", "måste", "bör", "borde",
  "och", "eller", "men", "utan", "fast", "för",
  "att", "som", "om", "när", "medan", "innan", "efter", "eftersom",
  "i", "på", "till", "från", "med", "över", "under", "mellan",
  "genom", "hos", "inom", "utanför",
  "inte", "ingen", "inget", "inga",
  "också", "så", "då", "redan", "bara", "mycket", "många", "få", "några",
  "alla", "varje", "någon", "något", "samma", "annan", "andra", "kanske"
]);

const SOFT_SKILLS_EN = new Set([
  "communication", "teamwork", "collaboration", "leadership", "problem solving",
  "critical thinking", "adaptability", "flexibility", "time management",
  "organisation", "organization", "stakeholder management", "ownership",
  "initiative", "creativity", "empathy", "customer focus", "detail oriented",
  "detail-oriented", "self-motivated", "proactive", "analytical",
  "negotiation", "presentation", "interpersonal", "relationship building",
  "cross-functional", "team player", "strategic thinking", "decision making",
  "accountability", "self-driven", "autonomous", "independent",
  "planning", "prioritisation", "prioritization", "multitasking",
  "customer-centric", "service minded", "coaching", "mentoring",
  "result oriented", "solution oriented", "growth mindset", "resilience"
]);

const SOFT_SKILLS_SV = new Set([
  "kommunikation", "samarbete", "lagarbete", "ledarskap", "problemlösning",
  "kritiskt tänkande", "anpassningsförmåga", "flexibilitet", "tidsplanering",
  "struktur", "självständighet", "initiativförmåga", "kundfokus",
  "analytisk", "noggrann", "kommunikativ", "teamkänsla", "lagspelare",
  "strategiskt tänkande", "problemlösningsförmåga", "dataorienterad",
  "ansvarstagande", "ägarskap", "självständig", "driv", "driven", "engagerad",
  "strukturerad", "planeringsförmåga", "prioriteringsförmåga",
  "kundorienterad", "serviceinriktad", "coachande", "handledning",
  "lösningsorienterad", "resultatorienterad", "kvalitetsmedveten"
]);

const IMPACT_PATTERNS = [
  /\b\d{1,3}%\b/g,
  /\b\d{1,3}(?:\.\d+)?\s*(?:k|m|b)\b/gi,
  /\b(?:reduced|improved|increased|decreased|cut|boosted|saved|grew|achieved|delivered|led|managed|built|developed|created|designed|implemented)\b/gi,
  /\b(?:revenue|cost|profit|latency|throughput|accuracy|conversion|kpi|sales|budget|team|project)\b/gi,
];

function getStopwords(language: string): Set<string> {
  return language === "sv" ? STOP_SV : STOP_EN;
}

function getSoftSkills(language: string): Set<string> {
  return language === "sv" ? SOFT_SKILLS_SV : SOFT_SKILLS_EN;
}

function clean(text: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    // Preserve Swedish/Nordic characters (å, ä, ö, etc.) along with standard word chars
    .replace(/[^\p{L}\p{N}+#.\-_/()%\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeWord(word: string, language: string): string {
  const w = word.toLowerCase();

  if (language !== "sv") {
    // English: simple plural handling
    if (w.endsWith("ies") && w.length > 4) return w.slice(0, -3) + "y";
    if (w.endsWith("ses") && w.length > 4) return w.slice(0, -2);
    if (w.endsWith("s") && !w.endsWith("ss") && w.length > 3) return w.slice(0, -1);
    return w;
  }

  // Swedish suffix removal
  const suffixes = ["arna", "erna", "orna", "ande", "ende", "heten", "heter", "het", "na", "en", "et", "ar", "er", "or", "n"];
  for (const suf of suffixes) {
    if (w.endsWith(suf) && w.length > suf.length + 1) {
      return w.slice(0, -suf.length);
    }
  }
  return w;
}

function tokenize(text: string, language: string): string[] {
  if (!text) return [];
  const stop = getStopwords(language);
  const cleaned = text.replace(/[.,;:!?"'"']/g, " ");
  // Use Unicode property escapes to match letters from any language including Swedish å, ä, ö
  const tokens = cleaned.toLowerCase().match(/[\p{L}\p{N}#+\-_/()%]{2,}/gu) || [];
  return tokens.filter((w) => !stop.has(w));
}

function extractKeywords(text: string, language: string, limit = 60): string[] {
  const tokens = tokenize(clean(text), language).filter((t) => t.length >= 3);
  const counts = new Map<string, number>();
  for (const token of tokens) {
    counts.set(token, (counts.get(token) || 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word);
}

function computeCoverage(keywords: string[], cvTokensNorm: Set<string>, language: string): { present: string[]; missing: string[] } {
  const present: string[] = [];
  const missing: string[] = [];

  for (const kw of keywords) {
    const norm = normalizeWord(kw, language);
    if (cvTokensNorm.has(norm)) {
      present.push(kw);
    } else {
      missing.push(kw);
    }
  }

  return { present, missing };
}

function detectSoftSkills(text: string, language: string): string[] {
  const skills = getSoftSkills(language);
  const found: string[] = [];
  const lower = text.toLowerCase();
  for (const skill of skills) {
    if (lower.includes(skill)) {
      found.push(skill);
    }
  }
  return found;
}

function countImpactSignals(text: string): number {
  let count = 0;
  for (const pattern of IMPACT_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) count += matches.length;
  }
  return count;
}

function computeSimilarity(jdTokens: string[], cvTokens: string[]): number {
  // Simple Jaccard-like similarity
  const jdSet = new Set(jdTokens.map((t) => t.toLowerCase()));
  const cvSet = new Set(cvTokens.map((t) => t.toLowerCase()));

  const intersection = new Set([...jdSet].filter((x) => cvSet.has(x)));
  const union = new Set([...jdSet, ...cvSet]);

  if (union.size === 0) return 0;
  return intersection.size / union.size;
}

interface ATSScoreResult {
  overallScore: number;
  label: string;
  breakdown: {
    similarity: number;
    keywordCoverage: number;
    softSkillsCoverage: number;
    impactScore: number;
  };
  presentKeywords: string[];
  missingKeywords: string[];
  presentSoftSkills: string[];
  missingSoftSkills: string[];
  suggestions: string[];
}

export async function POST(request: NextRequest): Promise<NextResponse<ATSScoreResult | { error: string }>> {
  try {
    const { resumeText, jobDescription, language } = await request.json();

    if (!resumeText || !jobDescription) {
      return NextResponse.json(
        { error: "Both resumeText and jobDescription are required" },
        { status: 400 }
      );
    }

    const jdClean = clean(jobDescription);
    const cvClean = clean(resumeText);

    // Detect languages separately for JD and CV - always detect from actual text
    // The `language` param is for output preference, not for forcing detection
    const jdLang = detectLanguage(jobDescription);
    const cvLang = detectLanguage(resumeText);
    const crossLanguage = jdLang !== cvLang;

    // Extract keywords from job description using JD's language
    const jdKeywords = extractKeywords(jdClean, jdLang);

    // Tokenize CV using CV's language
    const cvTokens = tokenize(cvClean, cvLang);
    const cvTokensNorm = new Set(cvTokens.map((t) => normalizeWord(t, cvLang)));

    // If cross-language, translate JD keywords to CV language for matching
    let keywordsToMatch = jdKeywords;
    let keywordTranslations: Map<string, string> | null = null;

    if (crossLanguage) {
      keywordTranslations = await translateKeywords(jdKeywords, jdLang, cvLang);
      keywordsToMatch = jdKeywords.map(kw => keywordTranslations!.get(kw) || kw);
    }

    // Keyword coverage - match translated keywords against CV
    const presentKeywords: string[] = [];
    const missingKeywords: string[] = [];

    for (let i = 0; i < jdKeywords.length; i++) {
      const originalKw = jdKeywords[i];
      const matchKw = keywordsToMatch[i];
      const norm = normalizeWord(matchKw, cvLang);

      if (cvTokensNorm.has(norm)) {
        presentKeywords.push(originalKw);
      } else {
        // For missing keywords in cross-language, show both original and translation
        if (crossLanguage && keywordTranslations && keywordTranslations.get(originalKw) !== originalKw) {
          missingKeywords.push(`${originalKw} (${keywordTranslations.get(originalKw)})`);
        } else {
          missingKeywords.push(originalKw);
        }
      }
    }
    const keywordCoverage = jdKeywords.length > 0 ? presentKeywords.length / jdKeywords.length : 0;

    // Soft skills - detect in both languages and merge
    const jdSoftSkillsSv = detectSoftSkills(jdClean, "sv");
    const jdSoftSkillsEn = detectSoftSkills(jdClean, "en");
    const cvSoftSkillsSv = detectSoftSkills(cvClean, "sv");
    const cvSoftSkillsEn = detectSoftSkills(cvClean, "en");

    // Combine soft skills from both languages
    const jdSoftSkillsAll = [...new Set([...jdSoftSkillsSv, ...jdSoftSkillsEn])];
    const cvSoftSkillsAll = [...new Set([...cvSoftSkillsSv, ...cvSoftSkillsEn])];

    const presentSoftSkills = jdSoftSkillsAll.filter((s) => cvSoftSkillsAll.includes(s));
    const missingSoftSkills = jdSoftSkillsAll.filter((s) => !cvSoftSkillsAll.includes(s));
    const softSkillsCoverage = jdSoftSkillsAll.length > 0 ? presentSoftSkills.length / jdSoftSkillsAll.length : 0;

    // Content similarity - use translated tokens for cross-language
    const jdTokens = tokenize(jdClean, jdLang);
    let jdTokensForSimilarity = jdTokens;

    if (crossLanguage && keywordTranslations) {
      // Translate JD tokens for similarity computation
      jdTokensForSimilarity = jdTokens.map(t => keywordTranslations!.get(t) || t);
    }

    const similarity = computeSimilarity(jdTokensForSimilarity, cvTokens);

    // Impact signals
    const impactCount = countImpactSignals(cvClean);
    const impactScore = Math.min(1.0, impactCount / 6);

    // Weighted overall score
    const weights = {
      similarity: 0.25,
      keywords: 0.35,
      softSkills: 0.20,
      impact: 0.20,
    };

    const overallScore =
      weights.similarity * similarity +
      weights.keywords * keywordCoverage +
      weights.softSkills * softSkillsCoverage +
      weights.impact * impactScore;

    const overallPct = Math.round(overallScore * 100);

    // Label
    let label: string;
    if (overallScore >= 0.7) {
      label = "Strong match";
    } else if (overallScore >= 0.5) {
      label = "Good match";
    } else {
      label = "Needs improvement";
    }

    // Suggestions
    const suggestions: string[] = [];

    if (keywordCoverage < 0.6 && missingKeywords.length > 0) {
      suggestions.push(
        `Add relevant keywords to your resume: ${missingKeywords.slice(0, 8).join(", ")}`
      );
    }

    if (softSkillsCoverage < 0.5 && missingSoftSkills.length > 0) {
      suggestions.push(
        `The job values these soft skills: ${missingSoftSkills.slice(0, 5).join(", ")}`
      );
    }

    if (impactScore < 0.3) {
      suggestions.push(
        "Add quantifiable achievements (percentages, numbers, metrics) to your experience"
      );
    }

    if (similarity < 0.3) {
      suggestions.push(
        "Mirror the job description language in your summary and experience sections"
      );
    }

    return NextResponse.json({
      overallScore: overallPct,
      label,
      breakdown: {
        similarity: Math.round(similarity * 100),
        keywordCoverage: Math.round(keywordCoverage * 100),
        softSkillsCoverage: Math.round(softSkillsCoverage * 100),
        impactScore: Math.round(impactScore * 100),
      },
      presentKeywords: presentKeywords.slice(0, 20),
      missingKeywords: missingKeywords.slice(0, 15),
      presentSoftSkills,
      missingSoftSkills,
      suggestions,
    });
  } catch (error) {
    console.error("ATS scoring error:", error);
    return NextResponse.json({ error: "Failed to calculate ATS score" }, { status: 500 });
  }
}
