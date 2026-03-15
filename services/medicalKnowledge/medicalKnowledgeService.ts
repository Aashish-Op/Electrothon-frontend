import { createReadStream } from "node:fs";
import path from "node:path";
import csv from "csv-parser";
import { getEmbedding } from "@/lib/embeddings";
import { InMemoryVectorStore } from "@/services/medicalKnowledge/inMemoryVectorStore";
import type {
  MedicalKnowledgeDocument,
  MedicalKnowledgeSearchResult,
  VectorStoreAdapter,
  VectorStoreRecord,
} from "@/services/medicalKnowledge/types";
import { createSafeLogger } from "@/services/observability/safeLogger";

type EmbeddingProvider = (text: string) => Promise<number[]>;
type DocumentsLoader = () => Promise<MedicalKnowledgeDocument[]>;

export interface MedicalKnowledgeServiceOptions {
  vectorStore?: VectorStoreAdapter<MedicalKnowledgeDocument>;
  embeddingProvider?: EmbeddingProvider;
  documentsLoader?: DocumentsLoader;
  maxDocuments?: number;
}

const logger = createSafeLogger("medicalKnowledge");
const DEFAULT_MAX_DOCUMENTS = Number(
  process.env.MEDICAL_KNOWLEDGE_MAX_DOCUMENTS || "2500"
);

function buildExcerpt(document: MedicalKnowledgeDocument) {
  return document.content.slice(0, 240).trim();
}

async function loadCsvMedicalDocuments(
  maxDocuments = DEFAULT_MAX_DOCUMENTS
): Promise<MedicalKnowledgeDocument[]> {
  const filePath = path.join(process.cwd(), "data", "train.csv");

  return new Promise((resolve, reject) => {
    const documents: MedicalKnowledgeDocument[] = [];
    let index = 0;

    createReadStream(filePath)
      .pipe(csv())
      .on("data", (row: Record<string, string>) => {
        if (documents.length >= maxDocuments) {
          return;
        }

        const title = row.Question?.trim();
        const content = row.Answer?.trim();

        if (!title || !content) {
          return;
        }

        documents.push({
          id: `medical-doc-${index}`,
          title,
          content,
          category: row.qtype?.trim() || "general",
          source: "train.csv",
        });
        index += 1;
      })
      .on("end", () => resolve(documents))
      .on("error", reject);
  });
}

export class MedicalKnowledgeService {
  private readonly vectorStore: VectorStoreAdapter<MedicalKnowledgeDocument>;

  private readonly embeddingProvider: EmbeddingProvider;

  private readonly documentsLoader: DocumentsLoader;

  private initializationPromise: Promise<void> | null = null;

  constructor(options: MedicalKnowledgeServiceOptions = {}) {
    this.vectorStore =
      options.vectorStore || new InMemoryVectorStore<MedicalKnowledgeDocument>();
    this.embeddingProvider = options.embeddingProvider || getEmbedding;
    this.documentsLoader =
      options.documentsLoader ||
      (() => loadCsvMedicalDocuments(options.maxDocuments));
  }

  async createEmbeddings(documents: MedicalKnowledgeDocument[]) {
    const records: VectorStoreRecord<MedicalKnowledgeDocument>[] = [];

    for (const document of documents) {
      const embedding = await this.embeddingProvider(
        `${document.title}\n${document.content}`
      );

      records.push({
        id: document.id,
        embedding,
        document,
      });
    }

    return records;
  }

  async searchMedicalKnowledge(query: string, limit = 5) {
    await this.ensureInitialized();

    const queryEmbedding = await this.embeddingProvider(query);
    const matches = await this.vectorStore.search(queryEmbedding, limit);

    const results: MedicalKnowledgeSearchResult[] = matches.map((match) => ({
      document: match.document,
      score: Number(match.score.toFixed(4)),
      excerpt: buildExcerpt(match.document),
    }));

    logger.info("search_completed", {
      requestedLimit: limit,
      returnedCount: results.length,
      topScores: results.map((result) => ({
        id: result.document.id,
        score: result.score,
        category: result.document.category,
      })),
    });

    return results;
  }

  async retrieveRelevantDocuments(query: string, limit = 5) {
    return this.searchMedicalKnowledge(query, limit);
  }

  private async ensureInitialized() {
    if (this.initializationPromise) {
      await this.initializationPromise;
      return;
    }

    this.initializationPromise = (async () => {
      if ((await this.vectorStore.count()) > 0) {
        return;
      }

      const documents = await this.documentsLoader();
      const records = await this.createEmbeddings(documents);
      await this.vectorStore.upsert(records);

      logger.info("knowledge_loaded", {
        documentCount: documents.length,
      });
    })();

    await this.initializationPromise;
  }
}

let medicalKnowledgeServiceSingleton: MedicalKnowledgeService | null = null;

export function getMedicalKnowledgeService() {
  if (!medicalKnowledgeServiceSingleton) {
    medicalKnowledgeServiceSingleton = new MedicalKnowledgeService();
  }

  return medicalKnowledgeServiceSingleton;
}
