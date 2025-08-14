// src/documents/documents.service.ts (OAuth 2.0 Refresh Token Version)

import { Injectable, NotFoundException } from '@nestjs/common';
import { google } from 'googleapis';
import { PrismaService } from 'src/prisma/prisma.service';
import * as stream from 'stream';
import { UserRole } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

interface AuthenticatedUser {
  userId: string;
  role: UserRole;
}

@Injectable()
export class DocumentsService {
  private drive;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    // --- Authenticate with Google Drive using OAuth 2.0 and a Refresh Token ---
    const clientId = this.configService.get<string>('GOOGLE_OAUTH_CLIENT_ID');
    const clientSecret = this.configService.get<string>('GOOGLE_OAUTH_CLIENT_SECRET');
    const refreshToken = this.configService.get<string>('GOOGLE_OAUTH_REFRESH_TOKEN');

    // Create an OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      "https://developers.google.com/oauthplayground" // Redirect URI, can be this for server-side
    );

    // Set the refresh token to the client
    oauth2Client.setCredentials({ refresh_token: refreshToken });

    // Initialize the Drive service with the authenticated client
    this.drive = google.drive({ version: 'v3', auth: oauth2Client });
  }

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

    const bufferStream = new stream.PassThrough();
    bufferStream.end(file.buffer);

    const driveFolderId = this.configService.get<string>('GOOGLE_DRIVE_FOLDER_ID');

    const response = await this.drive.files.create({
      media: {
        mimeType: file.mimetype,
        body: bufferStream,
      },
      requestBody: {
        name: file.originalname,
        parents: [driveFolderId],
      },
      fields: 'id, name',
    });

    const googleFileId = response.data.id;
    if (!googleFileId) {
      throw new Error('File upload to Google Drive failed.');
    }

    const documentRecord = await this.prisma.document.create({
      data: {
        name: response.data.name,
        fileType: file.mimetype,
        fileUrl: `https://drive.google.com/file/d/${googleFileId}/view`,
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

  async remove(documentId: string) {
    const documentRecord = await this.prisma.document.findUnique({
      where: { id: documentId },
    });
    if (!documentRecord) {
      throw new NotFoundException(`Document with ID "${documentId}" not found.`);
    }

    try {
      const fileId = documentRecord.fileUrl?.split('/d/')[1]?.split('/')[0];
      if (fileId) {
        await this.drive.files.delete({ fileId });
      }
    } catch (error) {
        console.error(`Failed to delete file from Google Drive: ${error.message}`);
    }

    await this.prisma.document.delete({
      where: { id: documentId },
    });

    return { message: `Document "${documentRecord.name}" was successfully deleted.` };
  }
}