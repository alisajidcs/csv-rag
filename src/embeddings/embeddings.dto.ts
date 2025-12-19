import { ApiProperty } from "@nestjs/swagger";

export class EmbedDataDto {
  @ApiProperty({
    description:
      "Field name from CSV to use for embedding. If not provided or useFullRecord is true, will create comprehensive text from all fields",
    example: "Item Description",
    required: false,
  })
  field?: string;

  @ApiProperty({
    description:
      "Whether to use full record for embedding (combines multiple fields)",
    default: true,
    required: false,
  })
  useFullRecord?: boolean;

  @ApiProperty({
    description: "Whether to clear existing embeddings before adding new ones",
    default: false,
    required: false,
  })
  clearExisting?: boolean;

  @ApiProperty({
    description: "Batch size for processing large files (default: 1000)",
    default: 1000,
    required: false,
  })
  batchSize?: number;

  @ApiProperty({
    description:
      "Number of rows to skip from the beginning (for resuming failed runs)",
    default: 0,
    required: false,
  })
  skipRows?: number;
}

export class QuerySimilarDto {
  @ApiProperty({
    description: "Query text to find similar documents",
    example: "search query",
  })
  query: string;

  @ApiProperty({
    description: "Number of similar results to return",
    default: 5,
    required: false,
  })
  nResults?: number;
}

export class EmbeddingResponse {
  @ApiProperty({ description: "Number of documents embedded" })
  count: number;

  @ApiProperty({ description: "Success message" })
  message: string;
}

export class QueryResponse {
  @ApiProperty({ description: "Query results" })
  results: any;

  @ApiProperty({ description: "Number of results returned" })
  count: number;
}

export class CollectionStatsResponse {
  @ApiProperty({ description: "Number of documents in collection" })
  count: number;

  @ApiProperty({ description: "Collection name" })
  collectionName: string;
}
