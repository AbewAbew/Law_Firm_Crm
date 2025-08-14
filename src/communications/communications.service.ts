import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';

interface AuthenticatedUser {
  userId: string;
  sub: string;
  role: UserRole;
}

@Injectable()
export class CommunicationsService {
  constructor(private prisma: PrismaService) {}

  async getMessages(caseId: string, user: AuthenticatedUser) {
    const userId = user.userId || user.sub;
    
    // Check if user has access to this case
    await this.checkCaseAccess(caseId, user);

    return this.prisma.message.findMany({
      where: { caseId },
      include: {
        sender: { select: { id: true, name: true, role: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createMessage(caseId: string, content: string, user: AuthenticatedUser) {
    const userId = user.userId || user.sub;
    
    // Check if user has access to this case
    await this.checkCaseAccess(caseId, user);

    return this.prisma.message.create({
      data: {
        content,
        caseId,
        senderId: userId,
      },
      include: {
        sender: { select: { id: true, name: true, role: true } },
      },
    });
  }

  async getDocumentRequests(caseId: string, user: AuthenticatedUser) {
    // Check if user has access to this case
    await this.checkCaseAccess(caseId, user);

    return this.prisma.documentRequest.findMany({
      where: { caseId },
      include: {
        requestedBy: { select: { id: true, name: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createDocumentRequest(caseId: string, data: { title: string; description: string }, user: AuthenticatedUser) {
    const userId = user.userId || user.sub;
    
    // Check if user has access to this case
    await this.checkCaseAccess(caseId, user);

    return this.prisma.documentRequest.create({
      data: {
        title: data.title,
        description: data.description,
        caseId,
        requestedById: userId,
        status: 'PENDING',
      },
      include: {
        requestedBy: { select: { id: true, name: true, role: true } },
      },
    });
  }

  async respondToDocumentRequest(requestId: string, response: string, user: AuthenticatedUser) {
    const userId = user.userId || user.sub;
    
    const request = await this.prisma.documentRequest.findUnique({
      where: { id: requestId },
      include: { case: true },
    });

    if (!request) {
      throw new NotFoundException('Document request not found');
    }

    // Check if user has access to this case
    await this.checkCaseAccess(request.caseId, user);

    return this.prisma.documentRequest.update({
      where: { id: requestId },
      data: {
        response,
        status: 'RESPONDED',
        respondedAt: new Date(),
      },
      include: {
        requestedBy: { select: { id: true, name: true, role: true } },
      },
    });
  }

  private async checkCaseAccess(caseId: string, user: AuthenticatedUser) {
    const userId = user.userId || user.sub;
    
    const caseRecord = await this.prisma.case.findUnique({
      where: { id: caseId },
      include: { client: true },
    });

    if (!caseRecord) {
      throw new NotFoundException('Case not found');
    }

    // Partners and associates can access all cases
    if (user.role === UserRole.PARTNER || user.role === UserRole.ASSOCIATE || user.role === UserRole.PARALEGAL) {
      return;
    }

    // Clients can only access their own cases
    if (user.role === UserRole.CLIENT && caseRecord.clientId !== userId) {
      throw new ForbiddenException('Access denied to this case');
    }
  }
}