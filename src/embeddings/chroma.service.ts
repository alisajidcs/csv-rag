import { Injectable, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ChromaClient, Collection, EmbeddingFunction } from "chromadb";

// Custom embedding function that does nothing (we provide embeddings ourselves)
class NoOpEmbeddingFunction implements EmbeddingFunction {
  generate(_texts: string[]): Promise<number[][]> {
    // This should never be called since we provide embeddings
    throw new Error(
      "Embedding function should not be called - embeddings are provided externally",
    );
  }
}

@Injectable()
export class ChromaService implements OnModuleInit {
  private client: ChromaClient;
  private collection: Collection;
  private readonly chromaUrl: string;
  private readonly collectionName: string;

  constructor(private configService: ConfigService) {
    this.chromaUrl =
      this.configService.get<string>("CHROMA_URL") || "http://localhost:8000";
    this.collectionName =
      this.configService.get<string>("CHROMA_COLLECTION") || "excel_data";
  }

  async onModuleInit() {
    // Parse the URL to extract host and port
    const url = new URL(this.chromaUrl);
    this.client = new ChromaClient({
      host: url.hostname,
      port: url.port ? parseInt(url.port) : 8000,
    });
    await this.initializeCollection();
  }

  private async initializeCollection() {
    try {
      // Use custom no-op embedding function since we provide our own embeddings
      this.collection = await this.client.getOrCreateCollection({
        name: this.collectionName,
        embeddingFunction: new NoOpEmbeddingFunction(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Error initializing ChromaDB collection: ${message}`);
    }
  }

  /**
   * Add embeddings to ChromaDB
   */
  async addEmbeddings(
    embeddings: number[][],
    documents: string[],
    metadatas: Record<string, any>[],
    ids: string[],
  ): Promise<void> {
    try {
      await this.collection.add({
        embeddings,
        documents,
        metadatas,
        ids,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Error adding embeddings to ChromaDB: ${message}`);
    }
  }

  /**
   * Query similar documents using embedding
   */
  async querySimilar(
    queryEmbedding: number[],
    nResults: number = 5,
  ): Promise<any> {
    try {
      const results = await this.collection.query({
        queryEmbeddings: [queryEmbedding],
        nResults,
      });
      return results;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Error querying ChromaDB: ${message}`);
    }
  }

  /**
   * Delete all data from the collection
   */
  async clearCollection(): Promise<void> {
    try {
      await this.client.deleteCollection({ name: this.collectionName });
      await this.initializeCollection();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Error clearing ChromaDB collection: ${message}`);
    }
  }

  /**
   * Get collection count
   */
  async getCount(): Promise<number> {
    try {
      return await this.collection.count();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Error getting collection count: ${message}`);
    }
  }
}
