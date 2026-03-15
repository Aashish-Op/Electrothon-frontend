import type { HospitalResult } from "@/lib/openstreetmap";
import type {
  RetrievedContextDocument,
  RiskLevel,
  StructuredHealthResponse,
} from "@/services/aiHealthAssistant/types";

function ensureStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

function normalizeRiskLevel(value: unknown): RiskLevel {
  if (
    value === "low" ||
    value === "moderate" ||
    value === "high" ||
    value === "emergency"
  ) {
    return value;
  }

  return "low";
}

export function extractJsonObject(text: string) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error("Model response did not contain a JSON object.");
  }

  return JSON.parse(match[0]) as Record<string, unknown>;
}

export function normalizeStructuredResponse(
  payload: Record<string, unknown>,
  fallbackRiskLevel: RiskLevel
): StructuredHealthResponse {
  const riskLevel = normalizeRiskLevel(payload.riskLevel) || fallbackRiskLevel;
  const urgency =
    payload.urgency === "self-care" ||
    payload.urgency === "schedule-care" ||
    payload.urgency === "urgent-care" ||
    payload.urgency === "emergency"
      ? payload.urgency
      : riskLevel === "emergency"
        ? "emergency"
        : riskLevel === "high"
          ? "urgent-care"
          : riskLevel === "moderate"
            ? "schedule-care"
            : "self-care";

  const confidenceScore =
    typeof payload.confidenceScore === "number" &&
    Number.isFinite(payload.confidenceScore)
      ? Math.min(1, Math.max(0, payload.confidenceScore))
      : 0.5;

  return {
    summary:
      typeof payload.summary === "string" && payload.summary.trim()
        ? payload.summary
        : "Preliminary health guidance is available below.",
    possibleConditions: ensureStringArray(payload.possibleConditions),
    riskLevel,
    urgency,
    possibleConsiderations: ensureStringArray(payload.possibleConsiderations),
    recommendedActions: ensureStringArray(payload.recommendedActions),
    explanation:
      typeof payload.explanation === "string" && payload.explanation.trim()
        ? payload.explanation
        : typeof payload.summary === "string" && payload.summary.trim()
          ? payload.summary
          : "A preliminary explanation is not available.",
    emergencySignals: ensureStringArray(payload.emergencySignals),
    followUpQuestions: ensureStringArray(payload.followUpQuestions),
    supportingEvidence: ensureStringArray(payload.supportingEvidence),
    disclaimer:
      typeof payload.disclaimer === "string" && payload.disclaimer.trim()
        ? payload.disclaimer
        : typeof payload.medicalDisclaimer === "string" &&
            payload.medicalDisclaimer.trim()
          ? payload.medicalDisclaimer
        : "This is preliminary AI guidance and not a definitive medical diagnosis.",
    confidenceScore,
    seekEmergencyCare:
      typeof payload.seekEmergencyCare === "boolean"
        ? payload.seekEmergencyCare
        : riskLevel === "emergency",
  };
}

export function formatStructuredResponseAsMarkdown(
  response: StructuredHealthResponse,
  documents: RetrievedContextDocument[],
  hospitals: HospitalResult[]
) {
  const sections = [
    `**Summary**\n- ${response.summary}`,
    `**Risk Level**\n- ${response.riskLevel}`,
    `**Urgency**\n- ${response.urgency}`,
  ];

  if (response.possibleConditions.length > 0) {
    sections.push(
      `**Possible Conditions**\n${response.possibleConditions
        .map((item) => `- ${item}`)
        .join("\n")}`
    );
  }

  if (response.explanation.trim()) {
    sections.push(`**Explanation**\n- ${response.explanation}`);
  }

  if (response.possibleConsiderations.length > 0) {
    sections.push(
      `**Possible Considerations**\n${response.possibleConsiderations
        .map((item) => `- ${item}`)
        .join("\n")}`
    );
  }

  if (response.recommendedActions.length > 0) {
    sections.push(
      `**Recommended Actions**\n${response.recommendedActions
        .map((item) => `- ${item}`)
        .join("\n")}`
    );
  }

  if (response.emergencySignals.length > 0) {
    sections.push(
      `**Emergency Signals**\n${response.emergencySignals
        .map((item) => `- ${item}`)
        .join("\n")}`
    );
  }

  if (response.followUpQuestions.length > 0) {
    sections.push(
      `**Follow-up Questions**\n${response.followUpQuestions
        .map((item) => `- ${item}`)
        .join("\n")}`
    );
  }

  if (documents.length > 0) {
    sections.push(
      `**Supporting Medical Context**\n${documents
        .map((document) => `- ${document.title} (${document.category || "general"})`)
        .join("\n")}`
    );
  }

  if (hospitals.length > 0) {
    sections.push(
      `**Nearby Hospitals**\n${hospitals
        .map(
          (hospital) =>
            `- ${hospital.name} (${hospital.distance.toFixed(1)} km): ${hospital.address}`
        )
        .join("\n")}`
    );
  }

  sections.push(`**Confidence Score**\n- ${response.confidenceScore.toFixed(2)}`);
  sections.push(`**Disclaimer**\n- ${response.disclaimer}`);

  return sections.join("\n\n");
}
