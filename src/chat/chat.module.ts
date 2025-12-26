import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ChatController } from "./chat.controller";
import { ChatService } from "./chat.service";
import { EmbeddingsModule } from "../embeddings/embeddings.module";

@Module({
  imports: [ConfigModule, EmbeddingsModule],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
