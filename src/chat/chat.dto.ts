import { ApiProperty } from "@nestjs/swagger";

export class ChatRequestDto {
  @ApiProperty({
    description: "User's question or message",
    example: "What are the import records for live animals?",
  })
  message: string;

  @ApiProperty({
    description: "Number of relevant documents to retrieve from vector DB",
    example: 5,
    required: false,
    default: 5,
  })
  topK?: number;

  @ApiProperty({
    description: "Maximum number of tokens in the response",
    example: 1000,
    required: false,
    default: 1000,
  })
  maxTokens?: number;

  @ApiProperty({
    description: "Temperature for response generation (0.0 - 2.0)",
    example: 0.7,
    required: false,
    default: 0.7,
  })
  temperature?: number;
}

export class ChatResponseDto {
  @ApiProperty({
    description: "The generated response",
  })
  response: string;

  @ApiProperty({
    description: "Number of relevant documents used for context",
  })
  contextsUsed: number;

  @ApiProperty({
    description: "Time taken to generate the response in milliseconds",
  })
  responseTime: number;
}
