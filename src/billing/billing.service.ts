import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { InvoiceStatus, InvoiceEntryStatus } from '@prisma/client';

@Injectable()
export class BillingService {
  constructor(private prisma: PrismaService) {}

  async createInvoice(createInvoiceDto: CreateInvoiceDto) {
    try {
      const { timeEntryIds = [], expenseIds = [], tax = 0, ...invoiceData } = createInvoiceDto;

      // Get case info to determine client if not provided
      const caseInfo = await this.prisma.case.findUnique({
        where: { id: invoiceData.caseId },
        include: { client: true },
      });
      
      if (!caseInfo) {
        throw new Error('Case not found');
      }

      // Use case's client if clientId not provided or invalid
      const finalClientId = invoiceData.clientId || caseInfo.clientId;

    const timeEntries = await this.prisma.timeEntry.findMany({
      where: { id: { in: timeEntryIds } },
    });

    const expenses = await this.prisma.expense.findMany({
      where: { id: { in: expenseIds } },
    });

    const timeTotal = timeEntries.reduce((sum, entry) => {
      const hours = (entry.duration || 0) / 60;
      return sum + (hours * (entry.rate || 0));
    }, 0);

    const expenseTotal = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const subtotal = timeTotal + expenseTotal;
    const total = subtotal + tax;

    const invoiceNumber = await this.generateInvoiceNumber();

    const invoice = await this.prisma.invoice.create({
      data: {
        ...invoiceData,
        clientId: finalClientId,
        invoiceNumber,
        dueDate: new Date(invoiceData.dueDate),
        subtotal,
        tax,
        total,
      },
    });

    await this.prisma.timeEntry.updateMany({
      where: { id: { in: timeEntryIds } },
      data: { invoiceId: invoice.id, status: 'BILLED' },
    });

    await this.prisma.expense.updateMany({
      where: { id: { in: expenseIds } },
      data: { invoiceId: invoice.id, status: 'BILLED' },
    });

    return this.findInvoice(invoice.id);
    } catch (error) {
      console.error('Invoice creation error:', error);
      throw error;
    }
  }

  async findInvoices(filters?: { caseId?: string; clientId?: string; status?: InvoiceStatus }) {
    return this.prisma.invoice.findMany({
      where: filters,
      include: {
        case: true,
        client: true,
        timeEntries: true,
        expenses: true,
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findInvoice(id: string) {
    return this.prisma.invoice.findUnique({
      where: { id },
      include: {
        case: true,
        client: true,
        timeEntries: { include: { user: true } },
        expenses: { include: { user: true } },
        payments: { include: { recordedBy: true } },
      },
    });
  }

  async updateInvoiceStatus(id: string, status: InvoiceStatus) {
    return this.prisma.invoice.update({
      where: { id },
      data: { status },
    });
  }

  async createPayment(userId: string, createPaymentDto: CreatePaymentDto) {
    const { paymentDate, ...paymentData } = createPaymentDto;

    const payment = await this.prisma.payment.create({
      data: {
        ...paymentData,
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        recordedById: userId,
      },
    });

    const invoice = await this.prisma.invoice.findUnique({
      where: { id: createPaymentDto.invoiceId },
      include: { payments: true },
    });

    if (invoice) {
      const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
      let status: InvoiceStatus = 'SENT';
      
      if (totalPaid >= invoice.total) {
        status = 'PAID';
      } else if (totalPaid > 0) {
        status = 'PARTIALLY_PAID';
      }

      await this.updateInvoiceStatus(invoice.id, status);
    }

    return payment;
  }

  async getFinancialSummary(startDate: string, endDate: string, clientId?: string) {
    const invoices = await this.prisma.invoice.findMany({
      where: {
        ...(clientId && { clientId }),
        issueDate: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      include: { payments: true },
    });

    const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.total, 0);
    const totalPaid = invoices.reduce((sum, inv) => 
      sum + inv.payments.reduce((pSum, p) => pSum + p.amount, 0), 0
    );
    const outstanding = totalInvoiced - totalPaid;

    return {
      totalInvoiced,
      totalPaid,
      outstanding,
      invoiceCount: invoices.length,
      paidInvoices: invoices.filter(inv => inv.status === 'PAID').length,
      overdueInvoices: invoices.filter(inv => 
        inv.status !== 'PAID' && new Date(inv.dueDate) < new Date()
      ).length,
    };
  }

  private async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.invoice.count({
      where: {
        invoiceNumber: {
          startsWith: `INV-${year}-`,
        },
      },
    });
    return `INV-${year}-${String(count + 1).padStart(4, '0')}`;
  }

  // Automated Draft Invoice Methods
  async createDraftInvoiceFromTimeEntries(data: {
    clientId?: string;
    caseId?: string;
    timeEntryIds: string[];
    dueDate?: Date;
  }) {
    const { clientId, caseId, timeEntryIds, dueDate } = data;
    
    // Get time entries with case and client info
    const timeEntries = await this.prisma.timeEntry.findMany({
      where: { 
        id: { in: timeEntryIds },
        invoiceStatus: InvoiceEntryStatus.UNBILLED,
      },
      include: { 
        case: { include: { client: true } },
        user: true,
      },
    });

    if (timeEntries.length === 0) {
      throw new Error('No unbilled time entries found');
    }

    // Determine client and case from time entries if not provided
    const firstEntry = timeEntries[0];
    const finalClientId = clientId || firstEntry.case?.clientId;
    const finalCaseId = caseId || firstEntry.caseId;

    if (!finalClientId) {
      throw new Error('Client information required. Time entries must be associated with a case that has a client.');
    }
    
    if (!finalCaseId) {
      throw new Error('Case information required. Time entries must be associated with a case.');
    }

    // Calculate totals
    const subtotal = timeEntries.reduce((sum, entry) => sum + (entry.billableAmount || 0), 0);
    const tax = subtotal * 0.1; // 10% tax
    const total = subtotal + tax;

    // Generate invoice number
    const invoiceNumber = await this.generateInvoiceNumber();
    
    // Create draft invoice
    const invoice = await this.prisma.invoice.create({
      data: {
        invoiceNumber,
        caseId: finalCaseId,
        clientId: finalClientId,
        issueDate: new Date(),
        dueDate: dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        status: InvoiceStatus.DRAFT,
        subtotal,
        tax,
        total,
        notes: `Draft invoice generated from ${timeEntries.length} time entries`,
      },
    });

    // Link time entries to invoice and update status
    await this.prisma.timeEntry.updateMany({
      where: { id: { in: timeEntryIds } },
      data: { 
        invoiceId: invoice.id,
        invoiceStatus: InvoiceEntryStatus.BILLED,
      },
    });

    return this.findInvoice(invoice.id);
  }

  async getUnbilledTimeByClient(clientId?: string) {
    const where: any = {
      billable: true,
      invoiceStatus: InvoiceEntryStatus.UNBILLED,
    };
    
    if (clientId) {
      where.case = { clientId };
    }

    const timeEntries = await this.prisma.timeEntry.findMany({
      where,
      include: {
        case: { 
          select: { 
            id: true, 
            caseName: true, 
            client: { select: { id: true, name: true, email: true } }
          }
        },
        user: { select: { id: true, name: true } },
      },
      orderBy: { startTime: 'desc' },
    });

    // Group by client
    const groupedByClient = timeEntries.reduce((acc, entry) => {
      const clientId = entry.case?.client?.id;
      if (!clientId || !entry.case?.client) return acc;
      
      if (!acc[clientId]) {
        acc[clientId] = {
          client: entry.case.client,
          entries: [],
          total: 0,
        };
      }
      
      acc[clientId].entries.push(entry);
      acc[clientId].total += entry.billableAmount || 0;
      
      return acc;
    }, {} as Record<string, any>);

    return Object.values(groupedByClient);
  }

  async createBulkDraftInvoices(period: 'weekly' | 'monthly' = 'monthly') {
    const unbilledByClient = await this.getUnbilledTimeByClient();
    const createdInvoices: any[] = [];

    for (const clientData of unbilledByClient as any[]) {
      if (clientData.entries.length > 0) {
        try {
          const invoice = await this.createDraftInvoiceFromTimeEntries({
            clientId: clientData.client.id,
            timeEntryIds: clientData.entries.map((e: any) => e.id),
          });
          if (invoice) {
            createdInvoices.push(invoice);
          }
        } catch (error) {
          console.error(`Failed to create invoice for client ${clientData.client.id}:`, error);
        }
      }
    }

    return {
      created: createdInvoices.length,
      invoices: createdInvoices,
    };
  }
}