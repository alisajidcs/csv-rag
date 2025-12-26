import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EmbeddingsService } from "../embeddings/embeddings.service";
import { ChromaService } from "../embeddings/chroma.service";
import Groq from "groq-sdk";

interface ChromaQueryResult {
  documents?: string[][];
  metadatas?: Record<string, unknown>[][];
  distances?: number[][];
}

interface GroqStreamChunk {
  choices: Array<{
    delta?: {
      content?: string;
    };
  }>;
}

interface GroqCompletion {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

@Injectable()
export class ChatService {
  private groqClient: unknown;
  private readonly model: string;

  constructor(
    private configService: ConfigService,
    private embeddingsService: EmbeddingsService,
    private chromaService: ChromaService,
  ) {
    const apiKey = this.configService.get<string>("GROQ_API_KEY");
    if (!apiKey) {
      throw new Error("GROQ_API_KEY environment variable is required");
    }
    this.groqClient = new Groq({ apiKey });
    this.model =
      this.configService.get<string>("GROQ_MODEL") || "llama-3.3-70b-versatile";
  }

  /**
   * Generate a streaming chat response using RAG
   */
  async *streamChatResponse(
    message: string,
    topK: number = 5,
    maxTokens: number = 1000,
    temperature: number = 0.7,
  ): AsyncGenerator<string> {
    if (!this.groqClient) {
      throw new Error("Groq client not initialized");
    }

    // Step 1: Generate embedding for the user's question
    const queryEmbedding =
      await this.embeddingsService.generateEmbedding(message);

    // Step 2: Query ChromaDB for similar documents
    const similarDocs = (await this.chromaService.querySimilar(
      queryEmbedding,
      topK,
    )) as ChromaQueryResult;

    // Step 3: Extract context from retrieved documents
    const contexts: string[] = [];
    if (similarDocs.documents && similarDocs.documents[0]) {
      contexts.push(...similarDocs.documents[0]);
    }

    // Step 4: Build the prompt with context
    const contextText =
      contexts.length > 0 ? contexts.join("\n\n") : "No relevant data found.";

    const systemPrompt = `You are a helpful assistant that answers questions about Pakistan's import and export data. 
You have access to detailed trade records including HS codes, item descriptions, importers, suppliers, origins, ports, quantities, and values.

Use the following context to answer the user's question. If the context doesn't contain enough information, say so.

Context:
${contextText}`;

    // Step 5: Stream response from Groq
    const client = this.groqClient as {
      chat: {
        completions: {
          create: (params: {
            messages: Array<{ role: string; content: string }>;
            model: string;
            temperature: number;
            max_tokens: number;
            stream: boolean;
          }) => Promise<AsyncIterable<GroqStreamChunk>>;
        };
      };
    };

    const stream = await client.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
      model: this.model,
      temperature,
      max_tokens: maxTokens,
      stream: true,
    });

    // Step 6: Yield chunks as they arrive
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      if (delta?.content) {
        yield delta.content;
      }
    }
  }

  /**
   * Get a non-streaming response (useful for testing)
   */
  async getChatResponse(
    message: string,
    topK: number = 5,
    maxTokens: number = 1000,
    temperature: number = 0.7,
  ): Promise<{ response: string; contextsUsed: number }> {
    if (!this.groqClient) {
      throw new Error("Groq client not initialized");
    }

    let fullResponse = "";
    let contextsUsed = 0;

    // Generate embedding for the user's question
    const queryEmbedding =
      await this.embeddingsService.generateEmbedding(message);

    // Query ChromaDB for similar documents
    const similarDocs = (await this.chromaService.querySimilar(
      queryEmbedding,
      topK,
    )) as ChromaQueryResult;

    // Extract context
    const contexts: string[] = [];
    if (similarDocs.documents && similarDocs.documents[0]) {
      contexts.push(...similarDocs.documents[0]);
      contextsUsed = contexts.length;
    }

    const contextText =
      contexts.length > 0 ? contexts.join("\n\n") : "No relevant data found.";

    const systemPrompt = `You are a helpful assistant that answers questions about Pakistan's import and export data. 
You have access to detailed trade records including HS codes, item descriptions, importers, suppliers, origins, ports, quantities, and values.

Use the following context to answer the user's question. If the context doesn't contain enough information, say so.

Context:
${contextText}`;

    // Get response from Groq (non-streaming)
    const client = this.groqClient as {
      chat: {
        completions: {
          create: (params: {
            messages: Array<{ role: string; content: string }>;
            model: string;
            temperature: number;
            max_tokens: number;
            stream: boolean;
          }) => Promise<GroqCompletion>;
        };
      };
    };

    const completion = await client.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
      model: this.model,
      temperature,
      max_tokens: maxTokens,
      stream: false,
    });

    fullResponse = completion.choices[0]?.message?.content || "";

    return {
      response: fullResponse,
      contextsUsed,
    };
  }
}
