// src/documents/documents.module.ts

import { Module } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { AppwriteModule } from 'src/appwrite/appwrite.module';

@Module({
  imports: [AppwriteModule],
  controllers: [DocumentsController],
  providers: [DocumentsService],
})
export class DocumentsModule {}