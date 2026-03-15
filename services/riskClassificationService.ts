import type {
  RiskClassificationResult,
  SymptomExtraction,
} from "@/services/aiHealthAssistant/types";

function hasSymptom(symptomExtraction: SymptomExtraction, symptom: string) {
  return symptomExtraction.symptoms.includes(symptom);
}

function hasSeverity(
  symptomExtraction: SymptomExtraction,
  indicator: string
) {
  return symptomExtraction.severityIndicators.includes(indicator);
}

export class RiskClassificationService {
  classifyRiskLevel(symptomExtraction: SymptomExtraction): RiskClassificationResult {
    const matchedRules: string[] = [];

    const chestPain = hasSymptom(symptomExtraction, "chest pain");
    const breathingDifficulty = hasSymptom(
      symptomExtraction,
      "shortness of breath"
    );
    const strokeSymptoms = hasSymptom(symptomExtraction, "stroke symptoms");
    const unconsciousness = hasSymptom(
      symptomExtraction,
      "unconsciousness"
    );
    const severeBleeding = hasSymptom(symptomExtraction, "severe bleeding");

    if (
      (chestPain && breathingDifficulty) ||
      strokeSymptoms ||
      unconsciousness ||
      severeBleeding
    ) {
      matchedRules.push("emergency-combination");

      return {
        riskLevel: "emergency",
        reasoning:
          "Symptoms include a high-risk emergency pattern that requires immediate medical attention.",
        confidence: 0.97,
        matchedRules,
      };
    }

    const dehydrationCluster =
      (hasSymptom(symptomExtraction, "vomiting") ? 1 : 0) +
      (hasSymptom(symptomExtraction, "diarrhea") ? 1 : 0) +
      (hasSymptom(symptomExtraction, "dizziness") ? 1 : 0) +
      (hasSymptom(symptomExtraction, "dehydration symptoms") ? 1 : 0);

    if (
      dehydrationCluster >= 2 &&
      (hasSeverity(symptomExtraction, "severe") ||
        hasSeverity(symptomExtraction, "persistent") ||
        hasSeverity(symptomExtraction, "worsening"))
    ) {
      matchedRules.push("severe-dehydration-cluster");

      return {
        riskLevel: "high",
        reasoning:
          "The symptom pattern suggests possible dehydration or significant illness that may need urgent in-person care.",
        confidence: 0.86,
        matchedRules,
      };
    }

    if (
      hasSymptom(symptomExtraction, "fever") &&
      symptomExtraction.symptoms.length <= 2 &&
      symptomExtraction.severityIndicators.includes("mild")
    ) {
      matchedRules.push("mild-fever-pattern");

      return {
        riskLevel: "low",
        reasoning:
          "Symptoms appear limited and mild, which is more consistent with a low-risk illness pattern.",
        confidence: 0.74,
        matchedRules,
      };
    }

    if (
      symptomExtraction.symptoms.length >= 3 ||
      (hasSymptom(symptomExtraction, "fever") &&
        hasSymptom(symptomExtraction, "cough"))
    ) {
      matchedRules.push("multi-symptom-pattern");

      return {
        riskLevel: "moderate",
        reasoning:
          "Multiple active symptoms suggest a condition that should be assessed with routine medical guidance soon.",
        confidence: 0.71,
        matchedRules,
      };
    }

    matchedRules.push("limited-symptom-pattern");

    return {
      riskLevel: symptomExtraction.symptoms.length > 0 ? "low" : "moderate",
      reasoning:
        symptomExtraction.symptoms.length > 0
          ? "Only a limited symptom set was identified, so current risk appears lower."
          : "The message lacks enough specific symptoms, so risk remains uncertain and needs more triage detail.",
      confidence: symptomExtraction.symptoms.length > 0 ? 0.58 : 0.38,
      matchedRules,
    };
  }
}

let riskClassificationServiceSingleton: RiskClassificationService | null = null;

export function getRiskClassificationService() {
  if (!riskClassificationServiceSingleton) {
    riskClassificationServiceSingleton = new RiskClassificationService();
  }

  return riskClassificationServiceSingleton;
}
