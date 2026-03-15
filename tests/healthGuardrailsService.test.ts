import test from "node:test";
import assert from "node:assert/strict";
import {
  evaluateHealthGuardrails,
  extractSymptoms,
} from "@/services/healthGuardrails/healthGuardrailsService";

test("guardrails detect emergency symptoms and override risk level", () => {
  const query = "My father has chest pain, slurred speech, and trouble breathing";
  const extraction = extractSymptoms(query);
  const result = evaluateHealthGuardrails(query, extraction);

  assert.equal(result.triggered, true);
  assert.equal(result.riskLevel, "emergency");
  assert.ok(result.matchedRules.includes("chest-pain"));
  assert.ok(result.overrideResponse);
  assert.equal(result.overrideResponse?.seekEmergencyCare, true);
});
