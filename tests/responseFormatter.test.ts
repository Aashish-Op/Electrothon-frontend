import test from "node:test";
import assert from "node:assert/strict";
import {
  formatStructuredResponseAsMarkdown,
  normalizeStructuredResponse,
} from "@/services/aiHealthAssistant/responseFormatter";

test("structured responses are normalized and formatted into markdown sections", () => {
  const structured = normalizeStructuredResponse(
    {
      summary: "Possible viral illness with moderate dehydration risk.",
      possibleConditions: ["Viral illness", "Dehydration"],
      riskLevel: "moderate",
      urgency: "schedule-care",
      possibleConsiderations: ["Viral infection", "Dehydration"],
      recommendedActions: ["Drink fluids", "Monitor fever"],
      explanation: "Fever with vomiting can raise dehydration risk.",
      emergencySignals: ["Seek urgent care if breathing worsens"],
      followUpQuestions: ["What is the current temperature?"],
      supportingEvidence: ["Fever with vomiting can raise dehydration risk."],
      disclaimer: "Not a diagnosis.",
      confidenceScore: 0.72,
      seekEmergencyCare: false,
    },
    "low"
  );

  const markdown = formatStructuredResponseAsMarkdown(structured, [], []);

  assert.match(markdown, /\*\*Summary\*\*/);
  assert.match(markdown, /\*\*Possible Conditions\*\*/);
  assert.match(markdown, /\*\*Explanation\*\*/);
  assert.match(markdown, /\*\*Recommended Actions\*\*/);
  assert.match(markdown, /\*\*Confidence Score\*\*/);
  assert.equal(structured.riskLevel, "moderate");
});
