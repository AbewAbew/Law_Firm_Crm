import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserRole } from '@prisma/client';
import { AppwriteService } from 'src/appwrite/appwrite.service';

interface AuthenticatedUser {
  userId: string;
  role: UserRole;
}

@Injectable()
export class DocumentsService {
  constructor(
    private prisma: PrismaService,
    private appwriteService: AppwriteService,
  ) {}

  async uploadFile(
    file: Express.Multer.File,
    caseId: string,
    uploader: AuthenticatedUser,
  ) {
    const caseRecord = await this.prisma.case.findUnique({
      where: { id: caseId },
    });
    if (!caseRecord) {
      throw new NotFoundException(`Case with ID "${caseId}" not found.`);
    }

    const filePath = `cases/${caseId}/${Date.now()}-${file.originalname}`;
    const { url } = await this.appwriteService.uploadFile(file, filePath);

    const documentRecord = await this.prisma.document.create({
      data: {
        name: file.originalname,
        fileType: file.mimetype,
        fileUrl: url,
        fileSize: file.size,
        case: { connect: { id: caseId } },
        uploadedBy: { connect: { id: uploader.userId } },
      },
    });

    return documentRecord;
  }

  async findForCase(caseId: string) {
    const caseRecord = await this.prisma.case.findUnique({ where: { id: caseId } });
    if (!caseRecord) {
      throw new NotFoundException(`Case with ID "${caseId}" not found.`);
    }
    return this.prisma.document.findMany({
      where: { caseId },
      include: {
        uploadedBy: { select: { id: true, name: true } },
      },
    });
  }

  async saveDocumentMetadata(
    metadata: { name: string; fileType: string; fileUrl: string; fileSize: number; caseId: string },
    uploader: AuthenticatedUser,
  ) {
    const caseRecord = await this.prisma.case.findUnique({
      where: { id: metadata.caseId },
    });
    if (!caseRecord) {
      throw new NotFoundException(`Case with ID "${metadata.caseId}" not found.`);
    }

    const documentRecord = await this.prisma.document.create({
      data: {
        name: metadata.name,
        fileType: metadata.fileType,
        fileUrl: metadata.fileUrl,
        fileSize: metadata.fileSize,
        case: { connect: { id: metadata.caseId } },
        uploadedBy: { connect: { id: uploader.userId } },
      },
    });

    return documentRecord;
  }

  async remove(documentId: string) {
    const documentRecord = await this.prisma.document.findUnique({
      where: { id: documentId },
    });
    if (!documentRecord) {
      throw new NotFoundException(`Document with ID "${documentId}" not found.`);
    }

    try {
      const fileId = documentRecord.fileUrl?.split('/files/')[1]?.split('/view')[0];
      if (fileId) {
        await this.appwriteService.deleteFile(fileId);
      }
    } catch (error) {
      console.error(`Failed to delete file from Appwrite: ${error.message}`);
    }

    await this.prisma.document.delete({
      where: { id: documentId },
    });

    return { message: `Document "${documentRecord.name}" was successfully deleted.` };
  }

  async downloadFile(documentId: string, user: AuthenticatedUser) {
    const documentRecord = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: { case: true },
    });
    
    if (!documentRecord) {
      throw new NotFoundException(`Document with ID "${documentId}" not found.`);
    }

    const fileId = documentRecord.fileUrl?.split('/files/')[1]?.split('/view')[0];
    if (!fileId) {
      throw new NotFoundException('File ID not found in URL.');
    }

    const fileBuffer = await this.appwriteService.getFileBuffer(fileId);
    
    return {
      buffer: fileBuffer,
      filename: documentRecord.name,
      mimetype: documentRecord.fileType,
    };
  }

  async previewFile(documentId: string, user: AuthenticatedUser) {
    const documentRecord = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: { case: true },
    });
    
    if (!documentRecord) {
      throw new NotFoundException(`Document with ID "${documentId}" not found.`);
    }

    const fileId = documentRecord.fileUrl?.split('/files/')[1]?.split('/view')[0];
    if (!fileId) {
      throw new NotFoundException('File ID not found in URL.');
    }

    let fileBuffer = await this.appwriteService.getFileBuffer(fileId);
    let mimetype = documentRecord.fileType;
    let filename = documentRecord.name;

    // For DOCX files, we'll let the frontend handle the preview
    // No conversion needed on backend
    
    return {
      buffer: fileBuffer,
      filename,
      mimetype,
    };
  }
}