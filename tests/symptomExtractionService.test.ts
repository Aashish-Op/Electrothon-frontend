import test from "node:test";
import assert from "node:assert/strict";
import { SymptomExtractionService } from "@/services/symptomExtractionService";

test("symptom extraction normalizes symptoms and severity indicators", () => {
  const service = new SymptomExtractionService();

  const result = service.extractSymptoms(
    "Suddenly having chest pain and trouble breathing since 2 hours in 411001"
  );

  assert.deepEqual(result.symptoms, ["chest pain", "shortness of breath"]);
  assert.ok(result.criticalSymptoms.includes("chest pain"));
  assert.ok(result.severityIndicators.includes("sudden onset"));
  assert.ok(result.durationHints.includes("hours"));
  assert.equal(result.pincode, "411001");
  assert.ok(result.symptomConfidence > 0.5);
});
