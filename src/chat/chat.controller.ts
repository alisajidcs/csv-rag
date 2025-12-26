import { Controller, Post, Body, Sse, MessageEvent } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { Observable } from "rxjs";
import { ChatService } from "./chat.service";
import { ChatRequestDto, ChatResponseDto } from "./chat.dto";

@ApiTags("chat")
@Controller("chat")
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Sse("stream")
  @ApiOperation({
    summary: "Stream chat responses using RAG",
    description:
      "Sends a Server-Sent Events stream with AI-generated responses based on embedded CSV data",
  })
  @ApiResponse({
    status: 200,
    description: "Streaming response initiated",
  })
  streamChat(@Body() dto: ChatRequestDto): Observable<MessageEvent> {
    return new Observable((observer) => {
      const generate = async () => {
        try {
          const startTime = Date.now();
          let tokenCount = 0;

          for await (const chunk of this.chatService.streamChatResponse(
            dto.message,
            dto.topK || 5,
            dto.maxTokens || 1000,
            dto.temperature || 0.7,
          )) {
            tokenCount++;
            observer.next({
              data: chunk,
            } as MessageEvent);
          }

          // Send completion metadata
          const responseTime = Date.now() - startTime;
          observer.next({
            data: JSON.stringify({
              done: true,
              responseTime,
              tokenCount,
            }),
          } as MessageEvent);

          observer.complete();
        } catch (error) {
          observer.error(error);
        }
      };

      void generate();
    });
  }

  @Post("query")
  @ApiOperation({
    summary: "Get a complete chat response using RAG (non-streaming)",
    description:
      "Returns a complete response based on embedded CSV data. Useful for testing or when streaming is not needed.",
  })
  @ApiResponse({
    status: 200,
    description: "Response generated successfully",
    type: ChatResponseDto,
  })
  async query(@Body() dto: ChatRequestDto): Promise<ChatResponseDto> {
    const startTime = Date.now();

    const result = await this.chatService.getChatResponse(
      dto.message,
      dto.topK || 5,
      dto.maxTokens || 1000,
      dto.temperature || 0.7,
    );

    const responseTime = Date.now() - startTime;

    return {
      response: result.response,
      contextsUsed: result.contextsUsed,
      responseTime,
    };
  }
}
