import type { SymptomExtraction } from "@/services/aiHealthAssistant/types";

type SymptomDefinition = {
  canonical: string;
  aliases: string[];
  critical?: boolean;
};

const SYMPTOM_DEFINITIONS: SymptomDefinition[] = [
  {
    canonical: "chest pain",
    aliases: ["chest pain", "pain in chest", "tightness in chest", "chest pressure"],
    critical: true,
  },
  {
    canonical: "shortness of breath",
    aliases: [
      "shortness of breath",
      "difficulty breathing",
      "trouble breathing",
      "breathing difficulty",
      "breathless",
    ],
    critical: true,
  },
  {
    canonical: "fever",
    aliases: ["fever", "temperature", "high temperature", "high fever"],
  },
  {
    canonical: "cough",
    aliases: ["cough", "dry cough", "wet cough"],
  },
  {
    canonical: "vomiting",
    aliases: ["vomiting", "throwing up", "can't keep food down", "cant keep food down"],
  },
  {
    canonical: "diarrhea",
    aliases: ["diarrhea", "loose motions", "loose stools"],
  },
  {
    canonical: "dizziness",
    aliases: ["dizzy", "dizziness", "lightheaded", "light headed"],
  },
  {
    canonical: "weakness",
    aliases: ["weakness", "very weak", "fatigue", "exhausted"],
  },
  {
    canonical: "severe bleeding",
    aliases: ["severe bleeding", "heavy bleeding", "bleeding won't stop", "bleeding wont stop"],
    critical: true,
  },
  {
    canonical: "unconsciousness",
    aliases: ["unconscious", "passed out", "not waking up", "fainted"],
    critical: true,
  },
  {
    canonical: "stroke symptoms",
    aliases: [
      "stroke",
      "slurred speech",
      "face drooping",
      "weakness on one side",
      "numbness on one side",
    ],
    critical: true,
  },
  {
    canonical: "abdominal pain",
    aliases: ["abdominal pain", "stomach pain", "pain in stomach"],
  },
  {
    canonical: "headache",
    aliases: ["headache", "head pain"],
  },
  {
    canonical: "dehydration symptoms",
    aliases: ["dehydrated", "dry mouth", "not urinating", "very thirsty"],
  },
];

const SEVERITY_PATTERNS = [
  { label: "sudden onset", pattern: /\bsudden(ly)?\b|\bstarted suddenly\b/ },
  { label: "severe", pattern: /\bsevere\b|\bintense\b|\bunbearable\b/ },
  { label: "persistent", pattern: /\bpersistent\b|\bcontinuous\b|\bwon't stop\b|\bwont stop\b/ },
  { label: "worsening", pattern: /\bworsening\b|\bgetting worse\b/ },
  { label: "mild", pattern: /\bmild\b|\bslight\b/ },
];

const DURATION_PATTERNS = [
  { label: "hours", pattern: /\b\d+\s*hours?\b|\bhours?\b/ },
  { label: "days", pattern: /\b\d+\s*days?\b|\bdays?\b/ },
  { label: "weeks", pattern: /\b\d+\s*weeks?\b|\bweeks?\b/ },
  { label: "today", pattern: /\btoday\b/ },
  { label: "tonight", pattern: /\btonight\b/ },
];

function normalizeWhitespace(text: string) {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function computeSymptomConfidence(
  symptoms: string[],
  criticalSymptoms: string[],
  severityIndicators: string[],
  durationHints: string[]
) {
  const score =
    0.12 +
    symptoms.length * 0.14 +
    criticalSymptoms.length * 0.2 +
    severityIndicators.length * 0.08 +
    durationHints.length * 0.05;

  return Number(Math.min(0.98, score).toFixed(2));
}

export class SymptomExtractionService {
  extractSymptoms(message: string): SymptomExtraction {
    const normalizedMessage = normalizeWhitespace(message);

    const symptoms = new Set<string>();
    const criticalSymptoms = new Set<string>();
    const extractedKeywords = new Set<string>();

    SYMPTOM_DEFINITIONS.forEach((definition) => {
      const matchedAlias = definition.aliases.find((alias) =>
        normalizedMessage.includes(alias)
      );

      if (!matchedAlias) {
        return;
      }

      symptoms.add(definition.canonical);
      extractedKeywords.add(matchedAlias);

      if (definition.critical) {
        criticalSymptoms.add(definition.canonical);
      }
    });

    const severityIndicators = SEVERITY_PATTERNS.filter(({ pattern }) =>
      pattern.test(normalizedMessage)
    ).map(({ label }) => label);

    const durationHints = DURATION_PATTERNS.filter(({ pattern }) =>
      pattern.test(normalizedMessage)
    ).map(({ label }) => label);

    const pincode = normalizedMessage.match(/\b\d{6}\b/)?.[0];

    return {
      symptoms: Array.from(symptoms),
      criticalSymptoms: Array.from(criticalSymptoms),
      durationHints,
      severityIndicators,
      extractedKeywords: Array.from(extractedKeywords),
      symptomConfidence: computeSymptomConfidence(
        Array.from(symptoms),
        Array.from(criticalSymptoms),
        severityIndicators,
        durationHints
      ),
      pincode,
    };
  }
}

let symptomExtractionServiceSingleton: SymptomExtractionService | null = null;

export function getSymptomExtractionService() {
  if (!symptomExtractionServiceSingleton) {
    symptomExtractionServiceSingleton = new SymptomExtractionService();
  }

  return symptomExtractionServiceSingleton;
}
