import test from "node:test";
import assert from "node:assert/strict";
import { MedicalKnowledgeService } from "@/services/medicalKnowledge/medicalKnowledgeService";

test("medical knowledge retrieval returns the most relevant document first", async () => {
  const service = new MedicalKnowledgeService({
    documentsLoader: async () => [
      {
        id: "doc-1",
        title: "Chest pain emergency guidance",
        content: "Chest pain and shortness of breath may require emergency care.",
        category: "emergency",
        source: "test",
      },
      {
        id: "doc-2",
        title: "Cold symptom self-care",
        content: "Common cold symptoms can include cough, sore throat, and rest advice.",
        category: "self-care",
        source: "test",
      },
    ],
    embeddingProvider: async (text) => [
      text.toLowerCase().includes("chest") ? 1 : 0,
      text.toLowerCase().includes("cold") ? 1 : 0,
      text.toLowerCase().includes("cough") ? 1 : 0,
    ],
  });

  const results = await service.retrieveRelevantDocuments(
    "I have chest pain and trouble breathing",
    2
  );

  assert.equal(results[0]?.document.id, "doc-1");
  assert.ok(results[0]?.score >= results[1]?.score);
});
