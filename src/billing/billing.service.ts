import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { InvoiceStatus, InvoiceEntryStatus } from '@prisma/client';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  
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

    return await this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.create({
        data: {
          ...invoiceData,
          clientId: finalClientId,
          invoiceNumber,
          dueDate: new Date(invoiceData.dueDate),
          subtotal,
          tax,
          total,
        },
        include: {
          case: true,
          client: true,
          timeEntries: { include: { user: true } },
          expenses: { include: { user: true } },
          payments: { include: { recordedBy: true } },
        },
      });

      await Promise.all([
        timeEntryIds.length > 0 && tx.timeEntry.updateMany({
          where: { id: { in: timeEntryIds } },
          data: { invoiceId: invoice.id, status: 'BILLED' },
        }),
        expenseIds.length > 0 && tx.expense.updateMany({
          where: { id: { in: expenseIds } },
          data: { invoiceId: invoice.id, status: 'BILLED' },
        }),
      ].filter(Boolean));

      return invoice;
    });
    } catch (error) {
      this.logger.error('Failed to create invoice', error.stack);
      throw new Error('Invoice creation failed');
    }
  }

  async findInvoices(filters?: { caseId?: string; clientId?: string; status?: InvoiceStatus }) {
    return this.prisma.invoice.findMany({
      where: filters,
      select: {
        id: true,
        invoiceNumber: true,
        status: true,
        issueDate: true,
        dueDate: true,
        subtotal: true,
        tax: true,
        total: true,
        case: { select: { id: true, caseName: true } },
        client: { select: { id: true, name: true } },
        _count: { select: { timeEntries: true, expenses: true, payments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findInvoice(id: string) {
    if (!id?.trim()) {
      throw new Error('Invoice ID is required');
    }
    
    return this.prisma.invoice.findUnique({
      where: { id },
      select: {
        id: true,
        invoiceNumber: true,
        status: true,
        issueDate: true,
        dueDate: true,
        subtotal: true,
        tax: true,
        total: true,
        notes: true,
        case: { select: { id: true, caseName: true } },
        client: { select: { id: true, name: true, email: true } },
        timeEntries: { select: { id: true, description: true, duration: true, rate: true, user: { select: { id: true, name: true } } } },
        expenses: { select: { id: true, description: true, amount: true, user: { select: { id: true, name: true } } } },
        payments: { select: { id: true, amount: true, paymentDate: true, recordedBy: { select: { id: true, name: true } } } },
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
    if (!userId?.trim() || !createPaymentDto?.invoiceId?.trim()) {
      throw new Error('User ID and Invoice ID are required');
    }
    
    try {
      return await this.prisma.$transaction(async (tx) => {
        const { paymentDate, ...paymentData } = createPaymentDto;

        const payment = await tx.payment.create({
          data: {
            ...paymentData,
            paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
            recordedById: userId,
          },
        });

        const invoice = await tx.invoice.findUnique({
          where: { id: createPaymentDto.invoiceId },
          select: { id: true, total: true, payments: { select: { amount: true } } },
        });

        if (invoice) {
          const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0) + payment.amount;
          let status: InvoiceStatus = 'SENT';
          
          if (totalPaid >= invoice.total) {
            status = 'PAID';
          } else if (totalPaid > 0) {
            status = 'PARTIALLY_PAID';
          }

          await tx.invoice.update({
            where: { id: invoice.id },
            data: { status },
          });
        }

        return payment;
      });
    } catch (error) {
      this.logger.error('Failed to create payment', error.stack);
      throw new Error('Payment creation failed');
    }
  }

  async getFinancialSummary(startDate: string, endDate: string, clientId?: string) {
    if (!startDate || !endDate) {
      throw new Error('Start date and end date are required');
    }
    
    const whereClause: any = {
      issueDate: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
    };
    
    if (clientId?.trim()) {
      whereClause.clientId = clientId;
    }

    const invoices = await this.prisma.invoice.findMany({
      where: whereClause,
      select: {
        id: true,
        total: true,
        status: true,
        dueDate: true,
        payments: { select: { amount: true } },
      },
    });

    const currentDate = new Date();
    const summary = invoices.reduce((acc, inv) => {
      const totalPaid = inv.payments.reduce((sum, p) => sum + p.amount, 0);
      
      acc.totalInvoiced += inv.total;
      acc.totalPaid += totalPaid;
      
      if (inv.status === 'PAID') acc.paidInvoices++;
      if (inv.status !== 'PAID' && new Date(inv.dueDate) < currentDate) acc.overdueInvoices++;
      
      return acc;
    }, {
      totalInvoiced: 0,
      totalPaid: 0,
      outstanding: 0,
      invoiceCount: invoices.length,
      paidInvoices: 0,
      overdueInvoices: 0,
    });
    
    summary.outstanding = summary.totalInvoiced - summary.totalPaid;
    return summary;
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
    if (!data?.timeEntryIds?.length) {
      throw new Error('Time entry IDs are required');
    }
    
    try {
      return await this.prisma.$transaction(async (tx) => {
        const { clientId, caseId, timeEntryIds, dueDate } = data;
        
        const timeEntries = await tx.timeEntry.findMany({
          where: { 
            id: { in: timeEntryIds },
            invoiceStatus: InvoiceEntryStatus.UNBILLED,
          },
          select: {
            id: true,
            billableAmount: true,
            caseId: true,
            case: { select: { id: true, clientId: true, client: { select: { id: true } } } },
          },
        });

        if (timeEntries.length === 0) {
          throw new Error('No unbilled time entries found');
        }

        const validEntries = timeEntries.filter(entry => entry.case?.client?.id);
        
        if (validEntries.length === 0) {
          throw new Error('No valid time entries found');
        }

        const firstEntry = validEntries[0];
        const finalClientId = clientId || firstEntry.case?.clientId;
        const finalCaseId = caseId || firstEntry.caseId;

        if (!finalClientId || !finalCaseId) {
          throw new Error('Client and case information required');
        }

        const existingDraft = await tx.invoice.findFirst({
          where: {
            caseId: finalCaseId,
            clientId: finalClientId,
            status: InvoiceStatus.DRAFT,
          },
          select: { id: true, subtotal: true, timeEntries: { select: { id: true } } },
        });

        const subtotal = validEntries.reduce((sum, entry) => sum + (entry.billableAmount || 0), 0);
        const tax = subtotal * 0.1;
        const total = subtotal + tax;

        if (existingDraft) {
          const updatedSubtotal = existingDraft.subtotal + subtotal;
          const updatedTax = updatedSubtotal * 0.1;
          const updatedTotal = updatedSubtotal + updatedTax;

          await tx.invoice.update({
            where: { id: existingDraft.id },
            data: {
              subtotal: updatedSubtotal,
              tax: updatedTax,
              total: updatedTotal,
              updatedAt: new Date(),
            },
          });

          await tx.timeEntry.updateMany({
            where: { id: { in: validEntries.map(e => e.id) } },
            data: { 
              invoiceId: existingDraft.id,
              invoiceStatus: InvoiceEntryStatus.BILLED,
            },
          });

          return existingDraft.id;
        }

        const invoiceNumber = await this.generateInvoiceNumber();
        
        const invoice = await tx.invoice.create({
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
          },
        });

        await tx.timeEntry.updateMany({
          where: { id: { in: validEntries.map(e => e.id) } },
          data: { 
            invoiceId: invoice.id,
            invoiceStatus: InvoiceEntryStatus.BILLED,
          },
        });

        return invoice.id;
      });
    } catch (error) {
      this.logger.error('Failed to create draft invoice', error.stack);
      throw new Error('Draft invoice creation failed');
    }
  }

  async getUnbilledTimeByClient(clientId?: string) {
    const whereClause: any = {
      billable: true,
      invoiceStatus: InvoiceEntryStatus.UNBILLED,
    };
    
    if (clientId?.trim()) {
      whereClause.case = { clientId };
    }

    const timeEntries = await this.prisma.timeEntry.findMany({
      where: whereClause,
      select: {
        id: true,
        billableAmount: true,
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

    const clientGroups = new Map();
    
    for (const entry of timeEntries) {
      const entryClientId = entry.case?.client?.id;
      if (!entryClientId || !entry.case?.client) continue;
      
      if (!clientGroups.has(entryClientId)) {
        clientGroups.set(entryClientId, {
          client: entry.case.client,
          entries: [],
          total: 0,
        });
      }
      
      const group = clientGroups.get(entryClientId);
      group.entries.push(entry);
      group.total += entry.billableAmount || 0;
    }

    return Array.from(clientGroups.values());
  }

  async createBulkDraftInvoices(billingPeriod: 'weekly' | 'monthly' = 'monthly') {
    try {
      const unbilledByClient = await this.getUnbilledTimeByClient();
      const createdInvoiceIds: string[] = [];
      const errors: string[] = [];

      for (const clientData of unbilledByClient) {
        if (clientData.entries.length > 0) {
          try {
            const invoiceId = await this.createDraftInvoiceFromTimeEntries({
              clientId: clientData.client.id,
              timeEntryIds: clientData.entries.map((e: any) => e.id),
            });
            if (invoiceId) {
              createdInvoiceIds.push(invoiceId);
            }
          } catch (error) {
            const errorMsg = `Failed to create invoice for client ${clientData.client.id}`;
            this.logger.error(errorMsg, error.stack);
            errors.push(errorMsg);
          }
        }
      }

      return {
        created: createdInvoiceIds.length,
        invoiceIds: createdInvoiceIds,
        errors,
      };
    } catch (error) {
      this.logger.error('Failed to create bulk draft invoices', error.stack);
      throw new Error('Bulk invoice creation failed');
    }
  }

  async consolidateDraftInvoices(caseId?: string) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const whereClause: any = { status: InvoiceStatus.DRAFT };
        if (caseId?.trim()) {
          whereClause.caseId = caseId;
        }

        const draftInvoices = await tx.invoice.findMany({
          where: whereClause,
          select: {
            id: true,
            caseId: true,
            clientId: true,
            subtotal: true,
            timeEntries: { select: { id: true } },
          },
          orderBy: { createdAt: 'asc' },
        });

        const consolidatedIds: string[] = [];
        const processedKeys = new Set<string>();

        for (const invoice of draftInvoices) {
          const key = `${invoice.caseId}-${invoice.clientId}`;
          
          if (processedKeys.has(key)) continue;

          const duplicates = draftInvoices.filter(
            inv => inv.caseId === invoice.caseId && 
                   inv.clientId === invoice.clientId && 
                   inv.id !== invoice.id
          );

          if (duplicates.length > 0) {
            const allTimeEntryIds = duplicates.flatMap(inv => inv.timeEntries.map(te => te.id));
            const totalSubtotal = duplicates.reduce((sum, inv) => sum + inv.subtotal, invoice.subtotal);
            const totalTax = totalSubtotal * 0.1;

            await tx.invoice.update({
              where: { id: invoice.id },
              data: {
                subtotal: totalSubtotal,
                tax: totalTax,
                total: totalSubtotal + totalTax,
                updatedAt: new Date(),
              },
            });

            if (allTimeEntryIds.length > 0) {
              await tx.timeEntry.updateMany({
                where: { id: { in: allTimeEntryIds } },
                data: { invoiceId: invoice.id },
              });
            }

            await tx.invoice.deleteMany({
              where: { id: { in: duplicates.map(inv => inv.id) } },
            });

            consolidatedIds.push(invoice.id);
          }

          processedKeys.add(key);
        }

        return {
          consolidated: consolidatedIds.length,
          invoiceIds: consolidatedIds,
        };
      });
    } catch (error) {
      this.logger.error('Failed to consolidate draft invoices', error.stack);
      throw new Error('Invoice consolidation failed');
    }
  }
}