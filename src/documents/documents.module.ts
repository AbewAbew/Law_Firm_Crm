// src/documents/documents.module.ts

import { Module } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { ConfigModule } from '@nestjs/config'; // <-- Import this

@Module({
  imports: [ConfigModule], // <-- Add this line
  controllers: [DocumentsController],
  providers: [DocumentsService],
})
export class DocumentsModule {}