import { Controller, Post, Body, Get, Delete } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { EmbeddingsService } from "./embeddings.service";
import { ChromaService } from "./chroma.service";
import { DataService } from "../data/data.service";
import {
  EmbedDataDto,
  QuerySimilarDto,
  EmbeddingResponse,
  QueryResponse,
  CollectionStatsResponse,
} from "./embeddings.dto";

@ApiTags("embeddings")
@Controller("embeddings")
export class EmbeddingsController {
  constructor(
    private readonly embeddingsService: EmbeddingsService,
    private readonly chromaService: ChromaService,
    private readonly dataService: DataService,
  ) {}

  @Post("embed")
  @ApiOperation({ summary: "Generate and store embeddings for CSV data" })
  @ApiResponse({
    status: 200,
    description: "Embeddings created and stored successfully",
    type: EmbeddingResponse,
  })
  async embedData(@Body() dto: EmbedDataDto): Promise<EmbeddingResponse> {
    const startTime = Date.now();

    // Clear existing data if requested
    if (dto.clearExisting) {
      await this.chromaService.clearCollection();
    }

    // Read CSV file
    const fileData = await this.dataService.readCSVFile();

    console.log(`Total rows: ${fileData.data.length}`);

    // Skip rows if specified (for resuming)
    const skipRows = dto.skipRows || 0;
    const dataToProcess =
      skipRows > 0 ? fileData.data.slice(skipRows) : fileData.data;

    if (skipRows > 0) {
      console.log(
        `Skipping first ${skipRows} rows, processing ${dataToProcess.length} remaining`,
      );
    }

    // Extract text from records
    const documents: string[] = [];
    const metadatas: Record<string, any>[] = [];
    const ids: string[] = [];

    dataToProcess.forEach((row: Record<string, any>, index: number) => {
      const actualIndex = skipRows + index; // Track actual row index
      let textStr: string;

      if (dto.useFullRecord !== false) {
        // Create comprehensive text from import/export record
        const parts: string[] = [
          `HS Code: ${row["HS Code"] || "N/A"}`,
          `Item: ${row["Item Description"] || "N/A"}`,
          `Importer: ${row["Importer "] || "N/A"}`,
          `Supplier: ${row["Supplier Name"] || "N/A"}`,
          `Origin: ${row["origin"] || "N/A"}`,
          `Port: ${row["Port of Shipment"] || "N/A"}`,
          `Quantity: ${row["Quantity"] || 0} ${row["UOM"] || ""}`,
          `Value: ${row["Import Value in PKR"] || 0} PKR`,
        ];
        textStr = parts.join(", ");
      } else if (dto.field) {
        // Use specific field
        const text: unknown = row[dto.field];
        if (text === undefined || text === null || text === "") {
          return; // Skip this row
        }
        textStr = typeof text === "string" ? text : JSON.stringify(text);
      } else {
        // Default to item description
        const text: unknown = row["Item Description"];
        if (!text || text === "") return;
        textStr = typeof text === "string" ? text : JSON.stringify(text);
      }

      documents.push(textStr);

      // Sanitize metadata for ChromaDB
      // - Only strings, numbers, booleans
      // - No empty keys
      // - Replace spaces and special chars in keys
      const sanitizedMeta: Record<string, any> = { rowIndex: index };
      for (const [key, value] of Object.entries(row)) {
        // Skip empty keys or whitespace-only keys
        if (!key || key.trim() === "") continue;

        // Clean the key: remove spaces, special chars, limit length
        const cleanKey = key
          .replace(/[^a-zA-Z0-9_]/g, "_")
          .replace(/_+/g, "_")
          .replace(/^_|_$/g, "")
          .slice(0, 50);

        if (!cleanKey) continue;

        // Sanitize value
        if (value !== null && value !== undefined && value !== "") {
          const type = typeof value;
          if (type === "string" || type === "number" || type === "boolean") {
            sanitizedMeta[cleanKey] = value;
          } else {
            sanitizedMeta[cleanKey] = String(value);
          }
        }
      }

      metadatas.push(sanitizedMeta);
      ids.push(`row_${actualIndex}`);
    });

    console.log(`Valid documents for embedding: ${documents.length}`);

    // Check if we have any documents to embed
    if (documents.length === 0) {
      throw new Error(
        `No valid documents found to embed. Total rows: ${fileData.data.length}. Check if CSV columns match expected structure.`,
      );
    }

    // Process in batches for large datasets
    const batchSize = dto.batchSize || 1000;
    let totalEmbedded = 0;
    const totalBatches = Math.ceil(documents.length / batchSize);
    let batchTimes: number[] = [];

    for (let i = 0; i < documents.length; i += batchSize) {
      const batchStartTime = Date.now();
      const batchNum = Math.floor(i / batchSize) + 1;

      const batchDocs = documents.slice(i, i + batchSize);
      const batchMetas = metadatas.slice(i, i + batchSize);
      const batchIds = ids.slice(i, i + batchSize);

      console.log(
        `\n--- Batch ${batchNum}/${totalBatches} (${batchDocs.length} documents) ---`,
      );

      try {
        // Generate embeddings for batch
        const embedStartTime = Date.now();
        const batchEmbeddings =
          await this.embeddingsService.generateEmbeddings(batchDocs);
        const embedTime = Date.now() - embedStartTime;

        console.log(
          `✓ Generated ${batchEmbeddings.length} embeddings in ${(embedTime / 1000).toFixed(2)}s`,
        );

        // Log first metadata for debugging
        if (i === 0) {
          console.log("Sample metadata:", JSON.stringify(batchMetas[0]));
        }

        // Store batch in ChromaDB
        const chromaStartTime = Date.now();
        await this.chromaService.addEmbeddings(
          batchEmbeddings,
          batchDocs,
          batchMetas,
          batchIds,
        );
        const chromaTime = Date.now() - chromaStartTime;

        totalEmbedded += batchDocs.length;
        const batchTotalTime = Date.now() - batchStartTime;
        batchTimes.push(batchTotalTime);

        // Calculate stats
        const percentComplete = (
          (totalEmbedded / documents.length) *
          100
        ).toFixed(1);
        const avgBatchTime =
          batchTimes.reduce((a, b) => a + b, 0) / batchTimes.length;
        const remainingBatches = totalBatches - batchNum;
        const estimatedTimeLeft = (avgBatchTime * remainingBatches) / 1000;
        const elapsedTotal = (Date.now() - startTime) / 1000;

        console.log(
          `✓ Stored in ChromaDB in ${(chromaTime / 1000).toFixed(2)}s`,
        );
        console.log(
          `✓ Batch completed in ${(batchTotalTime / 1000).toFixed(2)}s (avg: ${(avgBatchTime / 1000).toFixed(2)}s)`,
        );
        console.log(
          `Progress: ${totalEmbedded}/${documents.length} (${percentComplete}%)`,
        );
        console.log(
          `Elapsed: ${elapsedTotal.toFixed(1)}s | Estimated remaining: ${estimatedTimeLeft.toFixed(1)}s`,
        );
      } catch (error) {
        const elapsedTotal = (Date.now() - startTime) / 1000;
        console.error(
          `\n❌ Error at batch ${batchNum}/${totalBatches} after ${elapsedTotal.toFixed(1)}s`,
        );
        console.error(
          `Successfully embedded ${totalEmbedded} documents before error`,
        );
        throw error;
      }
    }

    const totalTime = (Date.now() - startTime) / 1000;
    const avgTimePerDoc = totalTime / totalEmbedded;

    console.log(`\n=== Embedding Complete ===`);
    console.log(`Total documents: ${totalEmbedded}`);
    console.log(`Total time: ${totalTime.toFixed(2)}s`);
    console.log(`Average per document: ${(avgTimePerDoc * 1000).toFixed(0)}ms`);
    console.log(`Total batches: ${totalBatches}`);

    return {
      count: totalEmbedded,
      message: `Successfully embedded ${totalEmbedded} documents in ${totalBatches} batches (${totalTime.toFixed(1)}s)`,
    };
  }

  @Post("query")
  @ApiOperation({ summary: "Query similar documents using text" })
  @ApiResponse({
    status: 200,
    description: "Similar documents retrieved",
    type: QueryResponse,
  })
  async querySimilar(@Body() dto: QuerySimilarDto): Promise<QueryResponse> {
    // Generate embedding for query
    const queryEmbedding = await this.embeddingsService.generateEmbedding(
      dto.query,
    );

    // Query ChromaDB
    const results: unknown = await this.chromaService.querySimilar(
      queryEmbedding,
      dto.nResults || 5,
    );

    const resultIds = (results as { ids: unknown[][] }).ids;
    const count = resultIds && resultIds[0] ? resultIds[0].length : 0;

    return {
      results: results as Record<string, unknown>,
      count,
    };
  }

  @Get("stats")
  @ApiOperation({ summary: "Get collection statistics" })
  @ApiResponse({
    status: 200,
    description: "Collection statistics",
    type: CollectionStatsResponse,
  })
  async getStats(): Promise<CollectionStatsResponse> {
    const count = await this.chromaService.getCount();
    return {
      count,
      collectionName: "excel_data",
    };
  }

  @Delete("clear")
  @ApiOperation({ summary: "Clear all embeddings from collection" })
  @ApiResponse({
    status: 200,
    description: "Collection cleared successfully",
  })
  async clearCollection(): Promise<{ message: string }> {
    await this.chromaService.clearCollection();
    return { message: "Collection cleared successfully" };
  }
}
