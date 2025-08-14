import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { CommunicationsService } from './communications.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@UseGuards(AuthGuard, RolesGuard)
@Controller('cases/:caseId/communications')
export class CommunicationsController {
  constructor(private readonly communicationsService: CommunicationsService) {}

  @Get('messages')
  getMessages(@Param('caseId') caseId: string, @Request() req) {
    return this.communicationsService.getMessages(caseId, req.user);
  }

  @Post('messages')
  createMessage(
    @Param('caseId') caseId: string,
    @Body() data: { content: string },
    @Request() req,
  ) {
    return this.communicationsService.createMessage(caseId, data.content, req.user);
  }

  @Get('document-requests')
  getDocumentRequests(@Param('caseId') caseId: string, @Request() req) {
    return this.communicationsService.getDocumentRequests(caseId, req.user);
  }

  @Post('document-requests')
  @Roles(UserRole.PARTNER, UserRole.ASSOCIATE, UserRole.PARALEGAL)
  createDocumentRequest(
    @Param('caseId') caseId: string,
    @Body() data: { title: string; description: string },
    @Request() req,
  ) {
    return this.communicationsService.createDocumentRequest(caseId, data, req.user);
  }

  @Post('document-requests/:id/respond')
  respondToDocumentRequest(
    @Param('caseId') caseId: string,
    @Param('id') requestId: string,
    @Body() data: { response: string },
    @Request() req,
  ) {
    return this.communicationsService.respondToDocumentRequest(requestId, data.response, req.user);
  }
}