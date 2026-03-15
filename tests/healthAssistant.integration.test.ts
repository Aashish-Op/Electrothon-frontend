import test from "node:test";
import assert from "node:assert/strict";
import { AIHealthAssistantService } from "@/services/aiHealthAssistant/healthAssistantService";
import type { HospitalResult } from "@/lib/openstreetmap";

test("RAG assistant pipeline returns structured guidance and hospital recommendations", async () => {
  const medicalKnowledgeService = {
    retrieveRelevantDocuments: async () => [
      {
        document: {
          id: "doc-1",
          title: "Fever and dehydration",
          content: "Fever with vomiting can increase dehydration risk and may need medical assessment.",
          category: "symptoms",
          source: "test",
        },
        score: 0.86,
        excerpt: "Fever with vomiting can increase dehydration risk.",
      },
    ],
  };

  const geminiService = {
    generateStructuredResponse: async () => ({
      answer: JSON.stringify({
        summary: "Symptoms suggest an acute illness that should be assessed soon.",
        possibleConditions: ["Acute infection", "Dehydration"],
        riskLevel: "moderate",
        urgency: "schedule-care",
        possibleConsiderations: ["Acute infection", "Dehydration"],
        recommendedActions: ["Increase fluids", "Arrange a medical review today"],
        explanation: "Fever and vomiting together can indicate infection with dehydration risk.",
        emergencySignals: ["Go urgently if confusion or breathing trouble develops"],
        followUpQuestions: ["How high is the fever?", "Can the patient keep fluids down?"],
        supportingEvidence: ["Vomiting and fever can lead to dehydration."],
        disclaimer: "This is preliminary guidance only.",
        confidenceScore: 0.7,
        seekEmergencyCare: false,
      }),
      modelName: "gemini-2.5-flash",
      providerErrors: [],
    }),
    generateLegacyResponse: async () => null,
  };

  const hospitals: HospitalResult[] = [
    {
      id: "hospital-1",
      name: "City Hospital",
      distance: 2.4,
      address: "Main Road, Pune",
      coordinates: {
        lat: 18.5204,
        lon: 73.8567,
      },
    },
  ];

  const service = new AIHealthAssistantService({
    medicalKnowledgeService,
    geminiService,
    hospitalRecommendationService: async () => hospitals,
    symptomExtractionService: {
      extractSymptoms: () => ({
        symptoms: ["fever", "vomiting"],
        criticalSymptoms: [],
        durationHints: ["days"],
        severityIndicators: [],
        extractedKeywords: ["fever", "vomiting"],
        symptomConfidence: 0.68,
        pincode: "411001",
      }),
    },
    riskClassificationService: {
      classifyRiskLevel: () => ({
        riskLevel: "moderate",
        reasoning: "Symptoms indicate possible infection.",
        confidence: 0.76,
        matchedRules: ["multi-symptom-pattern"],
      }),
    },
    triageQuestionService: {
      generateFollowUpQuestions: () => ({
        followUpQuestions: ["How high is the fever?"],
        needsMoreInformation: false,
        missingInformation: [],
      }),
    },
  });

  const result = await service.processHealthQuery({
    question: "I have fever and vomiting for two days 411001",
    featureFlagEnabled: true,
  });

  assert.equal(result.source, "gemini");
  assert.equal(result.structuredResponse?.riskLevel, "moderate");
  assert.equal(result.hospitals?.length, 1);
  assert.match(result.response, /\*\*Nearby Hospitals\*\*/);
  assert.match(result.response, /\*\*Possible Conditions\*\*/);
  assert.equal(result.metadata?.usedRag, true);
});
