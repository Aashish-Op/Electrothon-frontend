export interface MedicalKnowledgeDocument {
  id: string;
  title: string;
  content: string;
  category?: string;
  source: string;
}

export interface VectorStoreRecord<TDocument> {
  id: string;
  embedding: number[];
  document: TDocument;
}

export interface VectorSearchResult<TDocument> {
  document: TDocument;
  score: number;
}

export interface VectorStoreAdapter<TDocument> {
  upsert(records: VectorStoreRecord<TDocument>[]): Promise<void>;
  search(
    embedding: number[],
    limit: number
  ): Promise<VectorSearchResult<TDocument>[]>;
  clear(): Promise<void>;
  count(): Promise<number>;
}

export interface MedicalKnowledgeSearchResult {
  document: MedicalKnowledgeDocument;
  score: number;
  excerpt: string;
}
