import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";

@Injectable()
export class EmbeddingsService {
  private readonly ollamaBaseUrl: string;
  private readonly embeddingModel: string;

  constructor(private configService: ConfigService) {
    this.ollamaBaseUrl =
      this.configService.get<string>("OLLAMA_BASE_URL") ||
      "http://localhost:11434";
    this.embeddingModel =
      this.configService.get<string>("EMBEDDING_MODEL") || "nomic-embed-text";
  }

  /**
   * Generate embeddings for a single text using Ollama
   */
  async generateEmbedding(
    text: string,
    retries: number = 3,
  ): Promise<number[]> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await axios.post<{ embedding: number[] }>(
          `${this.ollamaBaseUrl}/api/embeddings`,
          {
            model: this.embeddingModel,
            prompt: text,
          },
          {
            timeout: 30000, // 30 second timeout
          },
        );

        return response.data.embedding;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";

        if (attempt === retries) {
          throw new Error(
            `Error generating embedding after ${retries} attempts: ${message}`,
          );
        }

        console.warn(
          `Embedding attempt ${attempt} failed, retrying... (${message})`,
        );
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
      }
    }

    throw new Error("Failed to generate embedding");
  }

  /**
   * Generate embeddings for multiple texts in batch
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    const embeddings = await Promise.all(
      texts.map((text) => this.generateEmbedding(text)),
    );
    return embeddings;
  }
}
