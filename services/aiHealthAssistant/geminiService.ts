import { GoogleGenerativeAI } from "@google/generative-ai";
import { createSafeLogger } from "@/services/observability/safeLogger";

const logger = createSafeLogger("geminiService");

const DEFAULT_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-flash-latest",
];

const LEGACY_SYSTEM_PROMPT = `
You are a highly experienced and compassionate AI Health Assistant for MedConnect.
Your goal is to provide accurate, helpful, and clear information regarding health, symptoms, wellness, and medical procedures.

Guidelines:
1. Always maintain a professional and empathetic tone.
2. Provide information based on general medical knowledge but ALWAYS include a disclaimer that you are an AI and not a replacement for professional medical advice.
3. If a user describes life-threatening symptoms (e.g., severe chest pain, difficulty breathing), urge them to contact emergency services immediately.
4. Use formatting (bullet points, bold text) to make information easy to read.
5. Be concise but thorough.
6. If you are unsure, admit it and suggest consulting a specialist.
`;

export const TRIAGE_SYSTEM_PROMPT = `
You are a healthcare triage assistant designed to provide preliminary health guidance. You must never provide definitive medical diagnoses. Your goal is to assess symptoms, estimate risk level, and recommend appropriate medical action.

Return JSON only. Do not wrap the JSON in markdown fences.
`;

export interface GeminiProviderError {
  provider: "gemini";
  model: string;
  message: string;
  status?: number;
  code?: string;
}

function extractErrorDetails(error: unknown) {
  if (error instanceof Error) {
    return {
      message: error.message,
      status:
        "status" in error && typeof error.status === "number"
          ? error.status
          : undefined,
      code:
        "code" in error && typeof error.code === "string"
          ? error.code
          : undefined,
    };
  }

  return {
    message: "Unknown provider error",
  };
}

export class GeminiService {
  private readonly client: GoogleGenerativeAI | null;

  private readonly models: string[];

  constructor(
    apiKey = process.env.GEMINI_API_KEY || "",
    models: string[] = DEFAULT_MODELS
  ) {
    this.client = apiKey ? new GoogleGenerativeAI(apiKey) : null;
    this.models = models;
  }

  async generateLegacyResponse(question: string) {
    const result = await this.generate(question, LEGACY_SYSTEM_PROMPT);
    return result?.answer ?? null;
  }

  async generateStructuredResponse(prompt: string) {
    return this.generate(prompt, TRIAGE_SYSTEM_PROMPT);
  }

  private async generate(prompt: string, systemInstruction: string) {
    if (!this.client) {
      return null;
    }

    const providerErrors: GeminiProviderError[] = [];

    for (const modelName of this.models) {
      try {
        logger.info("model_attempt", {
          model: modelName,
        });

        const model = this.client.getGenerativeModel({
          model: modelName,
          systemInstruction,
        });

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const answer = response.text();

        if (answer) {
          return {
            answer,
            modelName,
            providerErrors,
          };
        }
      } catch (error) {
        const details = extractErrorDetails(error);
        providerErrors.push({
          provider: "gemini",
          model: modelName,
          ...details,
        });
        logger.warn("model_attempt_failed", {
          model: modelName,
          status: details.status,
          code: details.code,
          message: details.message,
        });
      }
    }

    return {
      answer: null,
      modelName: null,
      providerErrors,
    };
  }
}

let geminiServiceSingleton: GeminiService | null = null;

export function getGeminiService() {
  if (!geminiServiceSingleton) {
    geminiServiceSingleton = new GeminiService();
  }

  return geminiServiceSingleton;
}
