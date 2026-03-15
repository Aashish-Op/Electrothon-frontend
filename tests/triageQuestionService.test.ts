import test from "node:test";
import assert from "node:assert/strict";
import { TriageQuestionService } from "@/services/triageQuestionService";

test("triage question engine asks symptom-specific follow-up questions when detail is missing", () => {
  const service = new TriageQuestionService();

  const result = service.generateFollowUpQuestions(
    {
      symptoms: ["chest pain"],
      criticalSymptoms: ["chest pain"],
      durationHints: [],
      severityIndicators: [],
      extractedKeywords: ["chest pain"],
      symptomConfidence: 0.66,
    },
    {
      riskLevel: "moderate",
      reasoning: "Chest pain needs more clarification.",
      confidence: 0.61,
      matchedRules: ["limited-symptom-pattern"],
    }
  );

  assert.equal(result.needsMoreInformation, true);
  assert.ok(result.followUpQuestions.includes("When did the chest pain start?"));
  assert.ok(result.missingInformation.includes("symptom duration"));
});
