import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getCaseAnalytics(query: AnalyticsQueryDto) {
    const { startDate, endDate, caseId } = query;
    
    const cases = await this.prisma.case.findMany({
      where: {
        ...(caseId && { id: caseId }),
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      include: {
        timeEntries: true,
        expenses: true,
        invoices: { include: { payments: true } },
        tasks: true,
        _count: { select: { documents: true } },
      },
    });

    return cases.map(caseItem => {
      const totalHours = caseItem.timeEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0) / 60;
      const totalExpenses = caseItem.expenses.reduce((sum, expense) => sum + expense.amount, 0);
      const totalInvoiced = caseItem.invoices.reduce((sum, inv) => sum + inv.total, 0);
      const totalPaid = caseItem.invoices.reduce((sum, inv) => 
        sum + inv.payments.reduce((pSum, p) => pSum + p.amount, 0), 0
      );

      return {
        case: caseItem,
        metrics: {
          totalHours,
          totalExpenses,
          totalInvoiced,
          totalPaid,
          outstanding: totalInvoiced - totalPaid,
          completedTasks: caseItem.tasks.filter(t => t.status === 'DONE').length,
          totalTasks: caseItem.tasks.length,
          documentCount: caseItem._count.documents,
        },
      };
    });
  }

  async getProductivityAnalytics(query: AnalyticsQueryDto) {
    const { startDate, endDate, userId } = query;

    const timeEntries = await this.prisma.timeEntry.findMany({
      where: {
        ...(userId && { userId }),
        startTime: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      include: { user: true, case: true },
    });

    const userStats = timeEntries.reduce((acc, entry) => {
      const userId = entry.userId;
      if (!acc[userId]) {
        acc[userId] = {
          user: entry.user,
          totalHours: 0,
          billableHours: 0,
          entries: 0,
          casesWorked: new Set(),
        };
      }

      const hours = (entry.duration || 0) / 60;
      acc[userId].totalHours += hours;
      if (entry.billable) acc[userId].billableHours += hours;
      acc[userId].entries++;
      if (entry.caseId) acc[userId].casesWorked.add(entry.caseId);

      return acc;
    }, {});

    return Object.values(userStats).map((stats: any) => ({
      ...stats,
      casesWorked: stats.casesWorked.size,
      utilizationRate: stats.totalHours > 0 ? (stats.billableHours / stats.totalHours) * 100 : 0,
    }));
  }

  async getFinancialAnalytics(query: AnalyticsQueryDto) {
    const { startDate, endDate } = query;

    const invoices = await this.prisma.invoice.findMany({
      where: {
        issueDate: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      include: { payments: true, case: true },
    });

    const monthlyData = invoices.reduce((acc, invoice) => {
      const month = invoice.issueDate.toISOString().substring(0, 7);
      if (!acc[month]) {
        acc[month] = { invoiced: 0, paid: 0, outstanding: 0 };
      }

      const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
      acc[month].invoiced += invoice.total;
      acc[month].paid += totalPaid;
      acc[month].outstanding += invoice.total - totalPaid;

      return acc;
    }, {});

    const practiceAreaData = invoices.reduce((acc, invoice) => {
      const area = invoice.case?.practiceArea || 'Unknown';
      if (!acc[area]) {
        acc[area] = { invoiced: 0, paid: 0, count: 0 };
      }

      const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
      acc[area].invoiced += invoice.total;
      acc[area].paid += totalPaid;
      acc[area].count++;

      return acc;
    }, {});

    return {
      monthlyTrends: Object.entries(monthlyData).map(([month, data]) => ({
        month,
        ...(data as any),
      })),
      practiceAreas: Object.entries(practiceAreaData).map(([area, data]) => ({
        practiceArea: area,
        ...(data as any),
      })),
      summary: {
        totalInvoiced: invoices.reduce((sum, inv) => sum + inv.total, 0),
        totalPaid: invoices.reduce((sum, inv) => 
          sum + inv.payments.reduce((pSum, p) => pSum + p.amount, 0), 0
        ),
        averageInvoiceValue: invoices.length > 0 ? 
          invoices.reduce((sum, inv) => sum + inv.total, 0) / invoices.length : 0,
      },
    };
  }

  async getDashboardMetrics() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalCases,
      activeCases,
      recentTimeEntries,
      pendingInvoices,
      overdueInvoices,
    ] = await Promise.all([
      this.prisma.case.count(),
      this.prisma.case.count({ where: { status: 'OPEN' } }),
      this.prisma.timeEntry.count({
        where: { startTime: { gte: thirtyDaysAgo } },
      }),
      this.prisma.invoice.count({ where: { status: 'SENT' } }),
      this.prisma.invoice.count({
        where: {
          status: { in: ['SENT', 'PARTIALLY_PAID'] },
          dueDate: { lt: now },
        },
      }),
    ]);

    const recentRevenue = await this.prisma.payment.aggregate({
      where: { paymentDate: { gte: thirtyDaysAgo } },
      _sum: { amount: true },
    });

    return {
      totalCases,
      activeCases,
      recentTimeEntries,
      pendingInvoices,
      overdueInvoices,
      recentRevenue: recentRevenue._sum.amount || 0,
    };
  }

  async getRecentCases(limit: number = 10) {
    return this.prisma.case.findMany({
      take: limit,
      orderBy: { updatedAt: 'desc' },
      include: {
        client: { select: { id: true, name: true, email: true } },
        _count: { select: { tasks: true, timeEntries: true } },
      },
    });
  }

  async getRecentTimeEntries(limit: number = 20) {
    return this.prisma.timeEntry.findMany({
      take: limit,
      orderBy: { startTime: 'desc' },
      include: {
        user: { select: { id: true, name: true, role: true } },
        case: { select: { id: true, caseName: true, client: { select: { name: true } } } },
      },
    });
  }
}