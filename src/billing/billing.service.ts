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
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      const count = await this.prisma.invoice.count({
        where: {
          invoiceNumber: {
            startsWith: `INV-${year}-`,
          },
        },
      });
      
      const invoiceNumber = `INV-${year}-${String(count + 1 + attempts).padStart(4, '0')}`;
      
      // Check if this number already exists
      const existing = await this.prisma.invoice.findUnique({
        where: { invoiceNumber },
      });
      
      if (!existing) {
        return invoiceNumber;
      }
      
      attempts++;
    }
    
    // Fallback with timestamp if all attempts fail
    return `INV-${year}-${Date.now().toString().slice(-4)}`;
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

    // Filter out entries without proper case-client associations
    const validEntries = timeEntries.filter(entry => entry.case?.client?.id);
    
    if (validEntries.length === 0) {
      throw new Error('No valid time entries found. All entries must be associated with a case that has a client.');
    }

    // Determine client and case from time entries if not provided
    const firstEntry = validEntries[0];
    const finalClientId = clientId || firstEntry.case?.clientId;
    const finalCaseId = caseId || firstEntry.caseId;

    if (!finalClientId) {
      throw new Error('Client information required. Time entries must be associated with a case that has a client.');
    }
    
    if (!finalCaseId) {
      throw new Error('Case information required. Time entries must be associated with a case.');
    }

    // Check for existing DRAFT invoice for this case/client
    const existingDraftInvoice = await this.prisma.invoice.findFirst({
      where: {
        caseId: finalCaseId,
        clientId: finalClientId,
        status: InvoiceStatus.DRAFT,
      },
      include: {
        timeEntries: true,
      },
    });

    if (existingDraftInvoice) {
      // Consolidate into existing draft invoice
      const newSubtotal = validEntries.reduce((sum, entry) => sum + (entry.billableAmount || 0), 0);
      const updatedSubtotal = existingDraftInvoice.subtotal + newSubtotal;
      const updatedTax = updatedSubtotal * 0.1;
      const updatedTotal = updatedSubtotal + updatedTax;
      const totalEntries = existingDraftInvoice.timeEntries.length + validEntries.length;

      // Update existing invoice totals
      await this.prisma.invoice.update({
        where: { id: existingDraftInvoice.id },
        data: {
          subtotal: updatedSubtotal,
          tax: updatedTax,
          total: updatedTotal,
          notes: `Draft invoice consolidated from ${totalEntries} time entries`,
          updatedAt: new Date(),
        },
      });

      // Link new time entries to existing invoice
      await this.prisma.timeEntry.updateMany({
        where: { id: { in: validEntries.map(e => e.id) } },
        data: { 
          invoiceId: existingDraftInvoice.id,
          invoiceStatus: InvoiceEntryStatus.BILLED,
        },
      });

      return this.findInvoice(existingDraftInvoice.id);
    }

    // No existing draft found, create new invoice
    const subtotal = validEntries.reduce((sum, entry) => sum + (entry.billableAmount || 0), 0);
    const tax = subtotal * 0.1;
    const total = subtotal + tax;
    const invoiceNumber = await this.generateInvoiceNumber();
    
    const invoice = await this.prisma.invoice.create({
      data: {
        invoiceNumber,
        caseId: finalCaseId,
        clientId: finalClientId,
        issueDate: new Date(),
        dueDate: dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: InvoiceStatus.DRAFT,
        subtotal,
        tax,
        total,
        notes: `Draft invoice generated from ${validEntries.length} time entries`,
      },
    });

    await this.prisma.timeEntry.updateMany({
      where: { id: { in: validEntries.map(e => e.id) } },
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

  async consolidateExistingDraftInvoices(caseId?: string) {
    const where: any = { status: InvoiceStatus.DRAFT };
    if (caseId) {
      where.caseId = caseId;
    }

    const draftInvoices = await this.prisma.invoice.findMany({
      where,
      include: {
        timeEntries: true,
        case: true,
        client: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const consolidatedInvoices: any[] = [];
    const processedCases = new Set<string>();

    for (const invoice of draftInvoices) {
      const caseClientKey = `${invoice.caseId}-${invoice.clientId}`;
      
      if (processedCases.has(caseClientKey)) {
        continue;
      }

      // Find all draft invoices for this case/client
      const duplicateInvoices = draftInvoices.filter(
        inv => inv.caseId === invoice.caseId && 
               inv.clientId === invoice.clientId && 
               inv.id !== invoice.id
      );

      if (duplicateInvoices.length > 0) {
        // Consolidate all time entries into the first invoice
        const allTimeEntryIds = duplicateInvoices.flatMap(inv => inv.timeEntries.map(te => te.id));
        const totalSubtotal = duplicateInvoices.reduce((sum, inv) => sum + inv.subtotal, invoice.subtotal);
        const totalTax = totalSubtotal * 0.1;
        const totalAmount = totalSubtotal + totalTax;
        const totalEntries = invoice.timeEntries.length + allTimeEntryIds.length;

        // Update main invoice
        await this.prisma.invoice.update({
          where: { id: invoice.id },
          data: {
            subtotal: totalSubtotal,
            tax: totalTax,
            total: totalAmount,
            notes: `Consolidated draft invoice from ${totalEntries} time entries`,
            updatedAt: new Date(),
          },
        });

        // Move time entries to main invoice
        await this.prisma.timeEntry.updateMany({
          where: { id: { in: allTimeEntryIds } },
          data: { invoiceId: invoice.id },
        });

        // Delete duplicate invoices
        await this.prisma.invoice.deleteMany({
          where: { id: { in: duplicateInvoices.map(inv => inv.id) } },
        });

        consolidatedInvoices.push(await this.findInvoice(invoice.id));
      }

      processedCases.add(caseClientKey);
    }

    return {
      consolidated: consolidatedInvoices.length,
      invoices: consolidatedInvoices,
    };
  }
}