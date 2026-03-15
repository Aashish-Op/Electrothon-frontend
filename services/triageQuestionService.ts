import type {
  RiskClassificationResult,
  SymptomExtraction,
  TriageQuestionResult,
} from "@/services/aiHealthAssistant/types";

const QUESTION_BANK: Record<string, string[]> = {
  "chest pain": [
    "When did the chest pain start?",
    "Is the pain spreading to your arm, jaw, or back?",
    "Are you also feeling shortness of breath, sweating, or nausea?",
  ],
  "shortness of breath": [
    "Can you speak in full sentences without needing to pause for breath?",
    "Did the breathing difficulty start suddenly or gradually?",
    "Do you have wheezing, bluish lips, or chest tightness?",
  ],
  fever: [
    "What is the highest temperature recorded?",
    "How many days has the fever lasted?",
    "Do you have chills, cough, or body aches with the fever?",
  ],
  vomiting: [
    "How many times have you vomited today?",
    "Are you able to keep fluids down?",
    "Are you passing urine normally or feeling very dizzy?",
  ],
  diarrhea: [
    "How many loose stools have you had today?",
    "Is there blood in the stool or severe abdominal pain?",
    "Are you able to drink enough fluids?",
  ],
};

export class TriageQuestionService {
  generateFollowUpQuestions(
    symptomExtraction: SymptomExtraction,
    riskClassification: RiskClassificationResult
  ): TriageQuestionResult {
    const followUpQuestions = new Set<string>();
    const missingInformation = new Set<string>();

    if (symptomExtraction.durationHints.length === 0) {
      missingInformation.add("symptom duration");
    }

    if (symptomExtraction.severityIndicators.length === 0) {
      missingInformation.add("symptom severity");
    }

    symptomExtraction.symptoms.forEach((symptom) => {
      const symptomQuestions = QUESTION_BANK[symptom];
      symptomQuestions?.forEach((question) => {
        followUpQuestions.add(question);
      });
    });

    if (riskClassification.riskLevel === "moderate" && !symptomExtraction.pincode) {
      missingInformation.add("location or pincode for hospital recommendations");
    }

    if (followUpQuestions.size === 0) {
      followUpQuestions.add("How long have the symptoms been present?");
      followUpQuestions.add("Are the symptoms improving, stable, or worsening?");
    }

    if (missingInformation.has("symptom duration")) {
      followUpQuestions.add("When did the symptoms begin?");
    }

    if (missingInformation.has("symptom severity")) {
      followUpQuestions.add("How severe are the symptoms right now?");
    }

    return {
      followUpQuestions: Array.from(followUpQuestions).slice(0, 5),
      needsMoreInformation:
        missingInformation.size > 0 || riskClassification.confidence < 0.65,
      missingInformation: Array.from(missingInformation),
    };
  }
}

let triageQuestionServiceSingleton: TriageQuestionService | null = null;

export function getTriageQuestionService() {
  if (!triageQuestionServiceSingleton) {
    triageQuestionServiceSingleton = new TriageQuestionService();
  }

  return triageQuestionServiceSingleton;
}
