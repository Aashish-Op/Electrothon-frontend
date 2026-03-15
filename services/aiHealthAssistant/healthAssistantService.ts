import { recommendHospitalsForRisk } from "@/services/hospitalRecommendation/hospitalRecommendationService";
import { evaluateHealthGuardrails } from "@/services/healthGuardrails/healthGuardrailsService";
import {
  getMedicalKnowledgeService,
  MedicalKnowledgeService,
} from "@/services/medicalKnowledge/medicalKnowledgeService";
import {
  getGeminiService,
  GeminiService,
} from "@/services/aiHealthAssistant/geminiService";
import {
  extractJsonObject,
  formatStructuredResponseAsMarkdown,
  normalizeStructuredResponse,
} from "@/services/aiHealthAssistant/responseFormatter";
import type {
  HealthAssistantResult,
  RetrievedContextDocument,
  RiskClassificationResult,
  RiskLevel,
  StructuredHealthResponse,
  SymptomExtraction,
  TriageQuestionResult,
} from "@/services/aiHealthAssistant/types";
import { createSafeLogger } from "@/services/observability/safeLogger";
import {
  getRiskClassificationService,
  RiskClassificationService,
} from "@/services/riskClassificationService";
import {
  getSymptomExtractionService,
  SymptomExtractionService,
} from "@/services/symptomExtractionService";
import {
  getTriageQuestionService,
  TriageQuestionService,
} from "@/services/triageQuestionService";

const logger = createSafeLogger("aiHealthAssistant");

type MedicalKnowledgeServiceLike = Pick<
  MedicalKnowledgeService,
  "retrieveRelevantDocuments"
>;

type GeminiServiceLike = Pick<
  GeminiService,
  "generateStructuredResponse" | "generateLegacyResponse"
>;

type SymptomExtractionServiceLike = Pick<
  SymptomExtractionService,
  "extractSymptoms"
>;

type RiskClassificationServiceLike = Pick<
  RiskClassificationService,
  "classifyRiskLevel"
>;

type TriageQuestionServiceLike = Pick<
  TriageQuestionService,
  "generateFollowUpQuestions"
>;

const DEFAULT_EMERGENCY_ACTIONS = [
  "Call emergency services immediately.",
  "Go to the nearest emergency department right away.",
];

export interface ProcessHealthQueryInput {
  question: string;
  pincode?: string;
  featureFlagEnabled: boolean;
}

export interface AIHealthAssistantServiceOptions {
  medicalKnowledgeService?: MedicalKnowledgeServiceLike;
  geminiService?: GeminiServiceLike;
  hospitalRecommendationService?: typeof recommendHospitalsForRisk;
  symptomExtractionService?: SymptomExtractionServiceLike;
  riskClassificationService?: RiskClassificationServiceLike;
  triageQuestionService?: TriageQuestionServiceLike;
}

function buildContextualPrompt(
  question: string,
  symptomExtraction: SymptomExtraction,
  riskClassification: RiskClassificationResult,
  triageQuestions: TriageQuestionResult,
  retrievedDocuments: RetrievedContextDocument[]
) {
  return [
    "Extracted Symptoms:",
    JSON.stringify(
      {
        symptoms: symptomExtraction.symptoms,
        severityIndicators: symptomExtraction.severityIndicators,
        extractedKeywords: symptomExtraction.extractedKeywords,
        durationHints: symptomExtraction.durationHints,
      },
      null,
      2
    ),
    "",
    "Risk Level:",
    JSON.stringify(
      {
        riskLevel: riskClassification.riskLevel,
        reasoning: riskClassification.reasoning,
        confidence: riskClassification.confidence,
      },
      null,
      2
    ),
    "",
    "Triage Question Engine:",
    JSON.stringify(
      {
        needsMoreInformation: triageQuestions.needsMoreInformation,
        missingInformation: triageQuestions.missingInformation,
        followUpQuestions: triageQuestions.followUpQuestions,
      },
      null,
      2
    ),
    "",
    "Relevant Medical Context:",
    retrievedDocuments.length > 0
      ? retrievedDocuments
          .map(
            (document, index) =>
              `${index + 1}. [${document.category || "general"}] ${document.title}\n${document.content}`
          )
          .join("\n\n")
      : "No relevant medical context was retrieved.",
    "",
    "User Question:",
    question,
    "",
    "Respond in JSON with this exact shape:",
    JSON.stringify(
      {
        summary: "string",
        possibleConditions: ["string"],
        riskLevel: "low | moderate | high | emergency",
        urgency: "self-care | schedule-care | urgent-care | emergency",
        possibleConsiderations: ["string"],
        recommendedActions: ["string"],
        explanation: "string",
        emergencySignals: ["string"],
        followUpQuestions: ["string"],
        supportingEvidence: ["string"],
        medicalDisclaimer: "string",
        confidenceScore: 0.5,
        seekEmergencyCare: false,
      },
      null,
      2
    ),
    "",
    "Never provide a definitive diagnosis. If information is incomplete, say so clearly and use follow-up questions.",
  ].join("\n");
}

function resolveHigherRisk(left: RiskLevel, right: RiskLevel): RiskLevel {
  const order: RiskLevel[] = ["low", "moderate", "high", "emergency"];
  return order.indexOf(left) >= order.indexOf(right) ? left : right;
}

function mergeFollowUpQuestions(
  triageQuestions: string[],
  modelQuestions: string[]
) {
  return Array.from(new Set([...triageQuestions, ...modelQuestions])).slice(0, 5);
}

function buildLocalStructuredFallback(
  riskLevel: RiskLevel,
  riskReasoning: string,
  triageQuestions: TriageQuestionResult
): StructuredHealthResponse {
  return {
    summary:
      "Preliminary guidance is limited right now, so MedConnect is returning a safe fallback response.",
    possibleConditions: ["A more specific assessment needs additional symptom detail."],
    riskLevel,
    urgency:
      riskLevel === "emergency"
        ? "emergency"
        : riskLevel === "high"
          ? "urgent-care"
          : riskLevel === "moderate"
            ? "schedule-care"
            : "self-care",
    possibleConsiderations: [
      "More symptom detail is needed for a higher-confidence assessment.",
    ],
    recommendedActions: [
      "Monitor symptoms closely.",
      riskLevel === "high" || riskLevel === "emergency"
        ? "Seek urgent in-person care."
        : "Arrange follow-up care if symptoms persist or worsen.",
    ],
    explanation: riskReasoning,
    emergencySignals:
      riskLevel === "emergency"
        ? ["Emergency warning signs were detected."]
        : [],
    followUpQuestions: triageQuestions.followUpQuestions,
    supportingEvidence: ["Fallback structured response used."],
    disclaimer:
      "This is preliminary AI guidance and not a definitive medical diagnosis.",
    confidenceScore: 0.35,
    seekEmergencyCare: riskLevel === "emergency",
  };
}

function buildEmergencyOverrideResponse(
  riskReasoning: string,
  emergencySignals: string[],
  recommendedActions: string[]
): StructuredHealthResponse {
  return {
    summary:
      "Your symptom pattern may represent a medical emergency and should be treated as urgent right now.",
    possibleConditions: [
      "A high-risk emergency condition needs immediate in-person evaluation.",
    ],
    riskLevel: "emergency",
    urgency: "emergency",
    possibleConsiderations: [
      "This is not a diagnosis.",
      "Emergency patterns require immediate professional assessment.",
    ],
    recommendedActions:
      recommendedActions.length > 0
        ? recommendedActions
        : DEFAULT_EMERGENCY_ACTIONS,
    explanation: riskReasoning,
    emergencySignals:
      emergencySignals.length > 0
        ? emergencySignals
        : ["Emergency warning signs were detected."],
    followUpQuestions: [],
    supportingEvidence: ["Emergency override activated before LLM reasoning."],
    disclaimer:
      "MedConnect is providing preliminary guidance only and cannot replace emergency medical care.",
    confidenceScore: 0.98,
    seekEmergencyCare: true,
  };
}

function computeConfidenceScore(
  symptomExtraction: SymptomExtraction,
  retrievedDocuments: RetrievedContextDocument[],
  riskClassification: RiskClassificationResult,
  triageQuestions: TriageQuestionResult
) {
  const topSimilarity = retrievedDocuments[0]?.score ?? 0;
  const symptomScore = symptomExtraction.symptomConfidence * 0.35;
  const retrievalScore = Math.min(topSimilarity, 1) * 0.3;
  const riskScore = riskClassification.confidence * 0.25;
  const completenessBonus = triageQuestions.needsMoreInformation ? 0 : 0.1;

  return Number(
    Math.max(
      0.05,
      Math.min(0.99, symptomScore + retrievalScore + riskScore + completenessBonus)
    ).toFixed(2)
  );
}

export class AIHealthAssistantService {
  private readonly medicalKnowledgeService: MedicalKnowledgeServiceLike;

  private readonly geminiService: GeminiServiceLike;

  private readonly hospitalRecommendationService: typeof recommendHospitalsForRisk;

  private readonly symptomExtractionService: SymptomExtractionServiceLike;

  private readonly riskClassificationService: RiskClassificationServiceLike;

  private readonly triageQuestionService: TriageQuestionServiceLike;

  constructor(options: AIHealthAssistantServiceOptions = {}) {
    this.medicalKnowledgeService =
      options.medicalKnowledgeService || getMedicalKnowledgeService();
    this.geminiService = options.geminiService || getGeminiService();
    this.hospitalRecommendationService =
      options.hospitalRecommendationService || recommendHospitalsForRisk;
    this.symptomExtractionService =
      options.symptomExtractionService || getSymptomExtractionService();
    this.riskClassificationService =
      options.riskClassificationService || getRiskClassificationService();
    this.triageQuestionService =
      options.triageQuestionService || getTriageQuestionService();
  }

  async processHealthQuery({
    question,
    pincode,
    featureFlagEnabled,
  }: ProcessHealthQueryInput): Promise<HealthAssistantResult> {
    const trimmedQuestion = question.trim();

    if (!trimmedQuestion) {
      return {
        response: "Please enter a message so MedConnect can help.",
        source: "system",
      };
    }

    logger.info("query_received", {
      featureFlagEnabled,
      questionLength: trimmedQuestion.length,
      hasPincode: Boolean(pincode),
    });

    if (!featureFlagEnabled) {
      return this.processLegacyGeminiQuery(trimmedQuestion);
    }

    const symptomExtraction =
      this.symptomExtractionService.extractSymptoms(trimmedQuestion);
    const riskClassification =
      this.riskClassificationService.classifyRiskLevel(symptomExtraction);
    const triageQuestions = this.triageQuestionService.generateFollowUpQuestions(
      symptomExtraction,
      riskClassification
    );
    const guardrailResult = evaluateHealthGuardrails(
      trimmedQuestion,
      symptomExtraction
    );

    const preliminaryRiskLevel = resolveHigherRisk(
      riskClassification.riskLevel,
      guardrailResult.riskLevel
    );
    const effectivePincode = pincode || symptomExtraction.pincode;

    logger.info("triage_stage_completed", {
      symptomCount: symptomExtraction.symptoms.length,
      criticalSymptomCount: symptomExtraction.criticalSymptoms.length,
      severityIndicatorCount: symptomExtraction.severityIndicators.length,
      extractedKeywordCount: symptomExtraction.extractedKeywords.length,
      preliminaryRiskLevel,
      triageQuestionCount: triageQuestions.followUpQuestions.length,
      needsMoreInformation: triageQuestions.needsMoreInformation,
    });

    if (preliminaryRiskLevel === "emergency") {
      const emergencyResponse = guardrailResult.overrideResponse
        ? {
            ...guardrailResult.overrideResponse,
            explanation: riskClassification.reasoning,
          }
        : buildEmergencyOverrideResponse(
            riskClassification.reasoning,
            [],
            DEFAULT_EMERGENCY_ACTIONS
          );
      const hospitals = await this.hospitalRecommendationService(
        "emergency",
        effectivePincode
      );

      return {
        response: formatStructuredResponseAsMarkdown(
          emergencyResponse,
          [],
          hospitals
        ),
        source: "system",
        structuredResponse: emergencyResponse,
        confidenceScore: emergencyResponse.confidenceScore,
        riskLevel: emergencyResponse.riskLevel,
        hospitals,
        retrievedDocuments: [],
        metadata: {
          featureFlagEnabled,
          usedRag: false,
          guardrailTriggered: guardrailResult.triggered,
          retrievedDocumentCount: 0,
          triageQuestionCount: 0,
          riskReasoning: riskClassification.reasoning,
        },
      };
    }

    const retrievedDocuments = await this.medicalKnowledgeService
      .retrieveRelevantDocuments(trimmedQuestion, 5)
      .then((results) =>
        results.map(
          (result): RetrievedContextDocument => ({
            id: result.document.id,
            title: result.document.title,
            content: result.document.content,
            category: result.document.category,
            source: result.document.source,
            score: result.score,
            excerpt: result.excerpt,
          })
        )
      );

    const ragPrompt = buildContextualPrompt(
      trimmedQuestion,
      symptomExtraction,
      riskClassification,
      triageQuestions,
      retrievedDocuments
    );
    const geminiResult = await this.geminiService.generateStructuredResponse(
      ragPrompt
    );

    let structuredResponse = buildLocalStructuredFallback(
      preliminaryRiskLevel,
      riskClassification.reasoning,
      triageQuestions
    );

    if (geminiResult?.answer) {
      try {
        structuredResponse = normalizeStructuredResponse(
          extractJsonObject(geminiResult.answer),
          preliminaryRiskLevel
        );
      } catch (error) {
        logger.warn("structured_parse_failed", {
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    const finalRiskLevel = resolveHigherRisk(
      structuredResponse.riskLevel,
      preliminaryRiskLevel
    );

    structuredResponse = {
      ...structuredResponse,
      riskLevel: finalRiskLevel,
      urgency:
        finalRiskLevel === "emergency"
          ? "emergency"
          : finalRiskLevel === "high"
            ? "urgent-care"
            : finalRiskLevel === "moderate"
              ? "schedule-care"
              : "self-care",
      followUpQuestions: mergeFollowUpQuestions(
        triageQuestions.followUpQuestions,
        structuredResponse.followUpQuestions
      ),
      explanation:
        structuredResponse.explanation || riskClassification.reasoning,
      possibleConditions:
        structuredResponse.possibleConditions.length > 0
          ? structuredResponse.possibleConditions
          : ["A clear condition cannot be determined from the current symptoms alone."],
    };

    structuredResponse.confidenceScore = computeConfidenceScore(
      symptomExtraction,
      retrievedDocuments,
      riskClassification,
      triageQuestions
    );

    const hospitals = await this.hospitalRecommendationService(
      structuredResponse.riskLevel,
      effectivePincode
    );

    logger.info("pipeline_completed", {
      riskLevel: structuredResponse.riskLevel,
      confidenceScore: structuredResponse.confidenceScore,
      guardrailTriggered: guardrailResult.triggered,
      retrievedDocumentCount: retrievedDocuments.length,
      hospitalRecommendationCount: hospitals.length,
      model: geminiResult?.modelName || "fallback",
    });

    return {
      response: formatStructuredResponseAsMarkdown(
        structuredResponse,
        retrievedDocuments,
        hospitals
      ),
      source: geminiResult?.answer ? "gemini" : "system",
      structuredResponse,
      confidenceScore: structuredResponse.confidenceScore,
      riskLevel: structuredResponse.riskLevel,
      hospitals,
      retrievedDocuments,
      metadata: {
        featureFlagEnabled,
        usedRag: true,
        guardrailTriggered: guardrailResult.triggered,
        retrievedDocumentCount: retrievedDocuments.length,
        triageQuestionCount: triageQuestions.followUpQuestions.length,
        riskReasoning: riskClassification.reasoning,
      },
      warning: geminiResult?.answer
        ? undefined
        : "Gemini is unavailable. Returning a local structured fallback.",
      providerErrors: geminiResult?.providerErrors,
    };
  }

  async processLegacyGeminiQuery(
    question: string
  ): Promise<HealthAssistantResult> {
    const geminiResponse = await this.geminiService.generateLegacyResponse(
      question
    );

    if (geminiResponse) {
      return {
        response: geminiResponse,
        source: "gemini",
        metadata: {
          featureFlagEnabled: false,
          usedRag: false,
          guardrailTriggered: false,
          retrievedDocumentCount: 0,
        },
      };
    }

    const fallback = buildLocalStructuredFallback(
      "low",
      "The Gemini assistant is unavailable, so MedConnect is returning a safe local fallback.",
      {
        followUpQuestions: [
          "How long have the symptoms been present?",
          "Are the symptoms improving, stable, or worsening?",
        ],
        needsMoreInformation: true,
        missingInformation: ["symptom details"],
      }
    );

    return {
      response: formatStructuredResponseAsMarkdown(fallback, [], []),
      source: "system",
      structuredResponse: fallback,
      confidenceScore: fallback.confidenceScore,
      riskLevel: fallback.riskLevel,
      hospitals: [],
      retrievedDocuments: [],
      metadata: {
        featureFlagEnabled: false,
        usedRag: false,
        guardrailTriggered: false,
        retrievedDocumentCount: 0,
        triageQuestionCount: fallback.followUpQuestions.length,
      },
      warning: "Gemini is unavailable. Returning a local structured fallback.",
    };
  }
}

let assistantServiceSingleton: AIHealthAssistantService | null = null;

export function getAIHealthAssistantService() {
  if (!assistantServiceSingleton) {
    assistantServiceSingleton = new AIHealthAssistantService();
  }

  return assistantServiceSingleton;
}
