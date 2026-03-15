import type {
  VectorSearchResult,
  VectorStoreAdapter,
  VectorStoreRecord,
} from "@/services/medicalKnowledge/types";

function cosineSimilarity(left: number[], right: number[]) {
  const length = Math.min(left.length, right.length);
  let dotProduct = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;

  for (let index = 0; index < length; index += 1) {
    dotProduct += left[index] * right[index];
    leftMagnitude += left[index] * left[index];
    rightMagnitude += right[index] * right[index];
  }

  if (!leftMagnitude || !rightMagnitude) {
    return 0;
  }

  return dotProduct / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude));
}

export class InMemoryVectorStore<TDocument>
  implements VectorStoreAdapter<TDocument>
{
  private readonly records = new Map<string, VectorStoreRecord<TDocument>>();

  async upsert(records: VectorStoreRecord<TDocument>[]) {
    records.forEach((record) => {
      this.records.set(record.id, record);
    });
  }

  async search(
    embedding: number[],
    limit: number
  ): Promise<VectorSearchResult<TDocument>[]> {
    return Array.from(this.records.values())
      .map((record) => ({
        document: record.document,
        score: cosineSimilarity(record.embedding, embedding),
      }))
      .sort((left, right) => right.score - left.score)
      .slice(0, limit);
  }

  async clear() {
    this.records.clear();
  }

  async count() {
    return this.records.size;
  }
}
