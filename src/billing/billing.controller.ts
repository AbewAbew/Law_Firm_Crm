import { Controller, Get, Post, Body, Patch, Param, UseGuards, Request, Query } from '@nestjs/common';
import { BillingService } from './billing.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { EmailService } from '../email/email.service';
import { InvoiceStatus } from '@prisma/client';

@Controller('billing')
@UseGuards(AuthGuard)
export class BillingController {
  constructor(
    private readonly billingService: BillingService,
    private readonly emailService: EmailService,
  ) {}

  @Post('invoices')
  createInvoice(@Body() createInvoiceDto: CreateInvoiceDto) {
    return this.billingService.createInvoice(createInvoiceDto);
  }

  @Get('invoices')
  findInvoices(
    @Request() req,
    @Query('caseId') caseId?: string,
    @Query('clientId') clientId?: string,
    @Query('status') status?: InvoiceStatus,
  ) {
    // If user is a client, only show their invoices
    const finalClientId = req.user.role === 'CLIENT' ? req.user.sub : clientId;
    return this.billingService.findInvoices({ caseId, clientId: finalClientId, status });
  }

  @Get('invoices/:id')
  findInvoice(@Param('id') id: string) {
    return this.billingService.findInvoice(id);
  }

  @Patch('invoices/:id/status')
  updateInvoiceStatus(@Param('id') id: string, @Body('status') status: InvoiceStatus) {
    return this.billingService.updateInvoiceStatus(id, status);
  }

  @Post('payments')
  createPayment(@Request() req, @Body() createPaymentDto: CreatePaymentDto) {
    return this.billingService.createPayment(req.user.sub, createPaymentDto);
  }

  @Get('summary')
  getFinancialSummary(
    @Request() req,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.billingService.getFinancialSummary(startDate, endDate, req.user.role === 'CLIENT' ? req.user.sub : undefined);
  }

  @Post('invoices/:id/send')
  sendInvoice(@Param('id') id: string) {
    return this.emailService.sendInvoiceEmail(id);
  }

  // Automated Draft Invoice endpoints
  @Post('draft-from-time-entries')
  createDraftInvoiceFromTimeEntries(
    @Body() data: {
      clientId?: string;
      caseId?: string;
      timeEntryIds: string[];
      dueDate?: string;
    },
  ) {
    return this.billingService.createDraftInvoiceFromTimeEntries({
      ...data,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
    });
  }

  @Get('unbilled-time')
  getUnbilledTimeByClient(@Query('clientId') clientId?: string) {
    return this.billingService.getUnbilledTimeByClient(clientId);
  }

  @Post('bulk-draft-invoices')
  createBulkDraftInvoices(
    @Body() data: { period?: 'weekly' | 'monthly' },
  ) {
    return this.billingService.createBulkDraftInvoices(data.period);
  }

  @Post('consolidate-drafts')
  consolidateDraftInvoices(
    @Body() data: { caseId?: string },
  ) {
    return this.billingService.consolidateDraftInvoices(data.caseId);
  }
}