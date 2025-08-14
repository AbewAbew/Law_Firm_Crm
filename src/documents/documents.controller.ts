// src/documents/documents.controller.ts

import {
    Controller,
    Get,
    Post,
    Param,
    Delete,
    UseGuards,
    Request,
    UseInterceptors, // <-- Import for handling files
    UploadedFile,    // <-- Import for accessing the uploaded file
    ParseFilePipe,   // <-- Import for file validation
    MaxFileSizeValidator,
  } from '@nestjs/common';
  import { DocumentsService } from './documents.service';
  import { AuthGuard } from 'src/auth/guards/auth.guard';
  import { RolesGuard } from 'src/auth/guards/roles.guard';
  import { FileInterceptor } from '@nestjs/platform-express'; // <-- The key interceptor
  import { Roles } from 'src/auth/decorators/roles.decorator';
  import { UserRole } from '@prisma/client';
  
  @UseGuards(AuthGuard, RolesGuard)
  @Controller() // Controller path is defined on the methods
  export class DocumentsController {
    constructor(private readonly documentsService: DocumentsService) {}
  
    // --- Endpoint to UPLOAD a document for a specific case ---
    // The full path will be POST /cases/:caseId/documents
    @Post('cases/:caseId/documents')
    @Roles(UserRole.PARTNER, UserRole.ASSOCIATE, UserRole.CLIENT) // All roles can upload documents
    @UseInterceptors(FileInterceptor('file')) // <-- Tell NestJS to expect a single file named 'file'
    uploadFile(
      @Param('caseId') caseId: string,
      @Request() req,
      @UploadedFile( // <-- Use this decorator to access the file in the method
        new ParseFilePipe({ // <-- Add validation for the uploaded file
          validators: [
            new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 10 }), // 10 MB limit
            // You can add FileTypeValidator here as well, e.g.,
            // new FileTypeValidator({ fileType: '.(png|jpeg|jpg|pdf|docx)' }),
          ],
        }),
      )
      file: Express.Multer.File, // The file object from multer
    ) {
      return this.documentsService.uploadFile(file, caseId, req.user);
    }
  
    // --- Endpoint to GET all document records for a specific case ---
    // The full path will be GET /cases/:caseId/documents
    @Get('cases/:caseId/documents')
    @Roles(UserRole.PARTNER, UserRole.ASSOCIATE, UserRole.PARALEGAL, UserRole.CLIENT)
    findForCase(@Param('caseId') caseId: string) {
      return this.documentsService.findForCase(caseId);
    }
  
    // --- Endpoint to DELETE a document ---
    // The full path will be DELETE /documents/:documentId
    @Delete('documents/:documentId')
    @Roles(UserRole.PARTNER, UserRole.ASSOCIATE) // Only staff can delete documents
    remove(@Param('documentId') documentId: string) {
      return this.documentsService.remove(documentId);
    }
  }