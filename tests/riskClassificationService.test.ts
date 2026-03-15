import test from "node:test";
import assert from "node:assert/strict";
import { RiskClassificationService } from "@/services/riskClassificationService";

const service = new RiskClassificationService();

test("risk classification marks chest pain with breathing difficulty as emergency", () => {
  const result = service.classifyRiskLevel({
    symptoms: ["chest pain", "shortness of breath"],
    criticalSymptoms: ["chest pain", "shortness of breath"],
    durationHints: ["hours"],
    severityIndicators: ["sudden onset"],
    extractedKeywords: ["chest pain", "trouble breathing"],
    symptomConfidence: 0.91,
    pincode: "411001",
  });

  assert.equal(result.riskLevel, "emergency");
  assert.ok(result.confidence >= 0.9);
});

test("risk classification keeps mild fever patterns low risk", () => {
  const result = service.classifyRiskLevel({
    symptoms: ["fever"],
    criticalSymptoms: [],
    durationHints: ["days"],
    severityIndicators: ["mild"],
    extractedKeywords: ["fever"],
    symptomConfidence: 0.48,
  });

  assert.equal(result.riskLevel, "low");
});
