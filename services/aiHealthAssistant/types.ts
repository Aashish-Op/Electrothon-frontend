import type { HospitalResult } from "@/lib/openstreetmap";

export type RiskLevel = "low" | "moderate" | "high" | "emergency";

export type HealthAssistantSource =
  | "database"
  | "staff"
  | "gemini"
  | "system";

export interface SymptomExtraction {
  symptoms: string[];
  criticalSymptoms: string[];
  durationHints: string[];
  severityIndicators: string[];
  extractedKeywords: string[];
  symptomConfidence: number;
  pincode?: string;
}

export interface RiskClassificationResult {
  riskLevel: RiskLevel;
  reasoning: string;
  confidence: number;
  matchedRules: string[];
}

export interface TriageQuestionResult {
  followUpQuestions: string[];
  needsMoreInformation: boolean;
  missingInformation: string[];
}

export interface RetrievedContextDocument {
  id: string;
  title: string;
  content: string;
  category?: string;
  source: string;
  score: number;
  excerpt: string;
}

export interface StructuredHealthResponse {
  summary: string;
  possibleConditions: string[];
  riskLevel: RiskLevel;
  urgency: "self-care" | "schedule-care" | "urgent-care" | "emergency";
  possibleConsiderations: string[];
  recommendedActions: string[];
  explanation: string;
  emergencySignals: string[];
  followUpQuestions: string[];
  supportingEvidence: string[];
  disclaimer: string;
  confidenceScore: number;
  seekEmergencyCare: boolean;
}

export interface HealthAssistantMetadata {
  featureFlagEnabled: boolean;
  usedRag: boolean;
  guardrailTriggered: boolean;
  retrievedDocumentCount: number;
  triageQuestionCount?: number;
  riskReasoning?: string;
}

export interface HealthAssistantResult {
  response: string;
  source: HealthAssistantSource;
  structuredResponse?: StructuredHealthResponse;
  confidenceScore?: number;
  riskLevel?: RiskLevel;
  hospitals?: HospitalResult[];
  retrievedDocuments?: RetrievedContextDocument[];
  metadata?: HealthAssistantMetadata;
  warning?: string;
  providerErrors?: Array<{
    provider: "gemini";
    model: string;
    message: string;
    status?: number;
    code?: string;
  }>;
}
