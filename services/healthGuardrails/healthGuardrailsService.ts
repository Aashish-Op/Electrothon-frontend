import type {
  RiskLevel,
  StructuredHealthResponse,
  SymptomExtraction,
} from "@/services/aiHealthAssistant/types";
import { createSafeLogger } from "@/services/observability/safeLogger";

const logger = createSafeLogger("healthGuardrails");

type GuardrailRule = {
  id: string;
  label: string;
  riskLevel: RiskLevel;
  keywords: string[];
  emergencySignals: string[];
  recommendedActions: string[];
};

const GUARDRail_RULES: GuardrailRule[] = [
  {
    id: "chest-pain",
    label: "Chest pain",
    riskLevel: "emergency",
    keywords: ["chest pain", "tightness in chest", "heart pain"],
    emergencySignals: ["Chest pain or pressure"],
    recommendedActions: [
      "Call emergency services immediately.",
      "Do not drive yourself if severe symptoms are present.",
    ],
  },
  {
    id: "breathing-difficulty",
    label: "Breathing difficulty",
    riskLevel: "emergency",
    keywords: ["difficulty breathing", "trouble breathing", "shortness of breath"],
    emergencySignals: ["Difficulty breathing or severe shortness of breath"],
    recommendedActions: [
      "Seek emergency care immediately.",
      "Use emergency inhaler or oxygen only if already prescribed.",
    ],
  },
  {
    id: "severe-bleeding",
    label: "Severe bleeding",
    riskLevel: "emergency",
    keywords: ["severe bleeding", "heavy bleeding", "bleeding won't stop"],
    emergencySignals: ["Bleeding that is heavy or does not stop"],
    recommendedActions: [
      "Apply firm pressure if safe to do so.",
      "Call emergency services immediately.",
    ],
  },
  {
    id: "unconsciousness",
    label: "Unconsciousness",
    riskLevel: "emergency",
    keywords: ["unconscious", "passed out", "not waking up"],
    emergencySignals: ["Unconsciousness or inability to wake the patient"],
    recommendedActions: [
      "Call emergency services immediately.",
      "Place the person on their side if unconscious and breathing.",
    ],
  },
  {
    id: "stroke-symptoms",
    label: "Stroke symptoms",
    riskLevel: "emergency",
    keywords: [
      "stroke",
      "face drooping",
      "slurred speech",
      "weakness on one side",
    ],
    emergencySignals: ["Possible stroke symptoms"],
    recommendedActions: [
      "Call emergency services immediately.",
      "Note the time symptoms started.",
    ],
  },
];

const SYMPTOM_LEXICON = [
  "fever",
  "cough",
  "headache",
  "nausea",
  "vomiting",
  "diarrhea",
  "fatigue",
  "dizziness",
  "sore throat",
  "body pain",
  "chest pain",
  "shortness of breath",
  "bleeding",
  "abdominal pain",
];

const DURATION_HINTS = ["today", "hours", "days", "week", "weeks", "month"];
const SEVERITY_INDICATORS = [
  "severe",
  "worsening",
  "sudden",
  "intense",
  "persistent",
];

function deriveRiskLevel(matchedRules: GuardrailRule[], symptomCount: number): RiskLevel {
  if (matchedRules.some((rule) => rule.riskLevel === "emergency")) {
    return "emergency";
  }

  if (symptomCount >= 4) {
    return "high";
  }

  if (symptomCount >= 2) {
    return "moderate";
  }

  return "low";
}

function createEmergencyOverride(
  matchedRules: GuardrailRule[]
): StructuredHealthResponse {
  const emergencySignals = matchedRules.flatMap((rule) => rule.emergencySignals);
  const recommendedActions = matchedRules.flatMap(
    (rule) => rule.recommendedActions
  );

  return {
    summary:
      "Your symptoms may indicate a medical emergency that needs immediate in-person care.",
    possibleConditions: [
      "A high-risk emergency condition needs immediate medical assessment.",
    ],
    riskLevel: "emergency",
    urgency: "emergency",
    possibleConsiderations: [
      "This guidance is not a diagnosis.",
      "Emergency symptoms require immediate professional assessment.",
    ],
    recommendedActions: Array.from(new Set(recommendedActions)),
    explanation:
      "Emergency symptom combinations were detected, so MedConnect is overriding normal AI reasoning and directing you to urgent care now.",
    emergencySignals: Array.from(new Set(emergencySignals)),
    followUpQuestions: [
      "Is the person conscious and breathing?",
      "When did the symptoms start?",
    ],
    supportingEvidence: ["Emergency guardrail override triggered."],
    disclaimer:
      "MedConnect is providing preliminary guidance only and cannot replace emergency medical care.",
    confidenceScore: 0.98,
    seekEmergencyCare: true,
  };
}

export function extractSymptoms(query: string): SymptomExtraction {
  const normalizedQuery = query.toLowerCase();

  const symptoms = SYMPTOM_LEXICON.filter((symptom) =>
    normalizedQuery.includes(symptom)
  );
  const criticalSymptoms = GUARDRail_RULES.flatMap((rule) =>
    rule.keywords.filter((keyword) => normalizedQuery.includes(keyword))
  );
  const durationHints = DURATION_HINTS.filter((hint) =>
    normalizedQuery.includes(hint)
  );
  const severityIndicators = SEVERITY_INDICATORS.filter((indicator) =>
    normalizedQuery.includes(indicator)
  );
  const pincodeMatch = normalizedQuery.match(/\b\d{6}\b/);

  return {
    symptoms: Array.from(new Set(symptoms)),
    criticalSymptoms: Array.from(new Set(criticalSymptoms)),
    durationHints,
    severityIndicators,
    extractedKeywords: Array.from(
      new Set([...symptoms, ...criticalSymptoms, ...severityIndicators])
    ),
    symptomConfidence: Number(
      Math.min(
        0.95,
        0.15 +
          symptoms.length * 0.14 +
          criticalSymptoms.length * 0.18 +
          severityIndicators.length * 0.08
      ).toFixed(2)
    ),
    pincode: pincodeMatch?.[0],
  };
}

export function evaluateHealthGuardrails(
  query: string,
  symptomExtraction: SymptomExtraction
) {
  const normalizedQuery = query.toLowerCase();
  const matchedRules = GUARDRail_RULES.filter((rule) =>
    rule.keywords.some((keyword) => normalizedQuery.includes(keyword))
  );

  const riskLevel = deriveRiskLevel(matchedRules, symptomExtraction.symptoms.length);
  const overrideResponse = matchedRules.length
    ? createEmergencyOverride(matchedRules)
    : undefined;

  logger.info("guardrails_evaluated", {
    riskLevel,
    matchedRules: matchedRules.map((rule) => rule.id),
    criticalSymptomCount: symptomExtraction.criticalSymptoms.length,
  });

  return {
    triggered: matchedRules.length > 0,
    riskLevel,
    matchedRules: matchedRules.map((rule) => rule.id),
    overrideResponse,
  };
}
