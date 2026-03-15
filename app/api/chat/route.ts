import { getAIHealthAssistantService } from "@/services/aiHealthAssistant/healthAssistantService";
import { findSimilarQuestions } from "@/lib/embeddings";

const ENABLE_RAG_HEALTH_ASSISTANT =
  process.env.ENABLE_RAG_HEALTH_ASSISTANT === "true";

async function checkForAnswer(_question: string): Promise<string | null> {
  return null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const question =
      typeof body.message === "string" ? body.message.trim() : "";
    const pincode =
      typeof body.pincode === "string" ? body.pincode.trim() : undefined;

    if (!question) {
      return new Response(JSON.stringify({ error: "Message is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const similarQuestion = await findSimilarQuestions(question);
    if (similarQuestion) {
      return new Response(
        JSON.stringify({
          response: similarQuestion.answer,
          source: "database",
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    const staffAnswer = await checkForAnswer(question);
    if (staffAnswer) {
      return new Response(
        JSON.stringify({
          response: staffAnswer,
          source: "staff",
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    const assistant = getAIHealthAssistantService();
    const result = await assistant.processHealthQuery({
      question,
      pincode,
      featureFlagEnabled: ENABLE_RAG_HEALTH_ASSISTANT,
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Critical Chat Route Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to process request";

    return new Response(
      JSON.stringify({
        error: errorMessage,
        response:
          "I couldn't process that message. Please try again with a shorter description of the symptoms or concern.",
        source: "system",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
