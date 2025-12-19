import { Module } from "@nestjs/common";
import { EmbeddingsService } from "./embeddings.service";
import { ChromaService } from "./chroma.service";
import { EmbeddingsController } from "./embeddings.controller";
import { DataModule } from "../data/data.module";

@Module({
  imports: [DataModule],
  controllers: [EmbeddingsController],
  providers: [EmbeddingsService, ChromaService],
  exports: [EmbeddingsService, ChromaService],
})
export class EmbeddingsModule {}
