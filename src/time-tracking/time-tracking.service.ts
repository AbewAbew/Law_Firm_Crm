import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTimeEntryDto } from './dto/create-time-entry.dto';
import { UpdateTimeEntryDto } from './dto/update-time-entry.dto';
import { TimeEntryStatus, TimeEntryType, InvoiceEntryStatus } from '@prisma/client';

@Injectable()
export class TimeTrackingService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createTimeEntryDto: CreateTimeEntryDto) {
    const { startTime, endTime, duration, rate, billable, ...rest } = createTimeEntryDto;
    
    let calculatedDuration = duration;
    if (!calculatedDuration && endTime) {
      const start = new Date(startTime);
      const end = new Date(endTime);
      calculatedDuration = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
    }

    // Calculate billable amount
    let billableAmount: number | null = null;
    if (billable && rate && calculatedDuration) {
      billableAmount = (calculatedDuration / 60) * rate;
    }

    return this.prisma.timeEntry.create({
      data: {
        ...rest,
        userId,
        startTime: new Date(startTime),
        endTime: endTime ? new Date(endTime) : null,
        duration: calculatedDuration,
        rate,
        billable: billable ?? true,
        billableAmount,
        invoiceStatus: billable ? InvoiceEntryStatus.UNBILLED : InvoiceEntryStatus.UNBILLED,
      },
      include: { case: true, task: true, user: true },
    });
  }

  async findAll(userId: string, filters?: { caseId?: string; status?: TimeEntryStatus }) {
    return this.prisma.timeEntry.findMany({
      where: {
        userId,
        ...(filters?.caseId && { caseId: filters.caseId }),
        ...(filters?.status && { status: filters.status }),
      },
      include: { case: true, task: true },
      orderBy: { startTime: 'desc' },
    });
  }

  async findAllStaff(userId: string, filters?: { caseId?: string; status?: TimeEntryStatus }) {
    // Check if user is a partner
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (user?.role !== 'PARTNER') {
      throw new BadRequestException('Only partners can view all staff time entries');
    }

    return this.prisma.timeEntry.findMany({
      where: {
        ...(filters?.caseId && { caseId: filters.caseId }),
        ...(filters?.status && { status: filters.status }),
      },
      include: { 
        case: true, 
        task: true, 
        user: { select: { id: true, name: true, role: true } }
      },
      orderBy: { startTime: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    return this.prisma.timeEntry.findFirst({
      where: { id, userId },
      include: { case: true, task: true, user: true },
    });
  }

  async update(id: string, userId: string, updateTimeEntryDto: UpdateTimeEntryDto) {
    const existing = await this.findOne(id, userId);
    if (!existing) {
      throw new Error('Time entry not found');
    }

    const { startTime, endTime, duration, caseId, ...rest } = updateTimeEntryDto;
    
    // Validate caseId if provided
    if (caseId) {
      const caseExists = await this.prisma.case.findUnique({
        where: { id: caseId },
      });
      if (!caseExists) {
        throw new BadRequestException(`Case with ID "${caseId}" not found`);
      }
    }
    
    let calculatedDuration = duration;
    if (startTime && endTime && !duration) {
      const start = new Date(startTime);
      const end = new Date(endTime);
      calculatedDuration = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
    }

    // Calculate billable amount if rate and duration are available
    let billableAmount = existing.billableAmount;
    const finalDuration = calculatedDuration || existing.duration;
    const finalRate = updateTimeEntryDto.rate || existing.rate;
    const finalBillable = updateTimeEntryDto.billable ?? existing.billable;
    
    if (finalBillable && finalRate && finalDuration) {
      billableAmount = (finalDuration / 60) * finalRate;
    }

    return this.prisma.timeEntry.update({
      where: { id },
      data: {
        ...rest,
        ...(caseId && { caseId }),
        ...(startTime && { startTime: new Date(startTime) }),
        ...(endTime && { endTime: new Date(endTime) }),
        ...(calculatedDuration && { duration: calculatedDuration }),
        billableAmount,
      },
      include: { case: true, task: true, user: true },
    });
  }

  async remove(id: string, userId: string) {
    return this.prisma.timeEntry.delete({
      where: { id },
    });
  }

  async getTimeReport(userId: string, startDate: string, endDate: string) {
    const timeEntries = await this.prisma.timeEntry.findMany({
      where: {
        userId,
        startTime: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      include: { case: true },
    });

    const totalHours = timeEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0) / 60;
    const billableHours = timeEntries
      .filter(entry => entry.billable)
      .reduce((sum, entry) => sum + (entry.duration || 0), 0) / 60;

    return {
      timeEntries,
      summary: {
        totalHours,
        billableHours,
        nonBillableHours: totalHours - billableHours,
        totalEntries: timeEntries.length,
      },
    };
  }

  // Live Timer Methods
  async startTimer(userId: string, data: {
    caseId?: string;
    taskId?: string;
    description: string;
    type: TimeEntryType;
    rate?: number;
  }) {
    // Check if user already has an active timer
    const existingTimer = await this.prisma.activeTimer.findUnique({
      where: { userId },
    });

    if (existingTimer) {
      throw new BadRequestException('You already have an active timer running');
    }

    return this.prisma.activeTimer.create({
      data: {
        userId,
        caseId: data.caseId || null,
        taskId: data.taskId || null,
        description: data.description,
        type: data.type,
        rate: data.rate,
      },
      include: {
        case: { select: { id: true, caseName: true } },
        task: { select: { id: true, title: true } },
      },
    });
  }

  async stopTimer(userId: string, data?: {
    description?: string;
    rate?: number;
    billable?: boolean;
  }) {
    const activeTimer = await this.prisma.activeTimer.findUnique({
      where: { userId },
    });

    if (!activeTimer) {
      throw new BadRequestException('No active timer found');
    }

    const endTime = new Date();
    const duration = Math.round((endTime.getTime() - activeTimer.startTime.getTime()) / (1000 * 60));
    const rate = data?.rate || activeTimer.rate;
    const billable = data?.billable ?? true;
    
    // Calculate billable amount
    let billableAmount: number | null = null;
    if (billable && rate && duration) {
      billableAmount = (duration / 60) * rate;
    }

    // Create time entry from active timer
    const timeEntry = await this.prisma.timeEntry.create({
      data: {
        userId,
        caseId: activeTimer.caseId,
        taskId: activeTimer.taskId,
        description: data?.description || activeTimer.description,
        type: activeTimer.type,
        startTime: activeTimer.startTime,
        endTime,
        duration,
        rate,
        billable,
        billableAmount,
        status: TimeEntryStatus.DRAFT,
      },
      include: { case: true, task: true },
    });

    // Delete active timer
    await this.prisma.activeTimer.delete({
      where: { userId },
    });

    return timeEntry;
  }

  async getActiveTimer(userId: string) {
    return this.prisma.activeTimer.findUnique({
      where: { userId },
      include: {
        case: { select: { id: true, caseName: true } },
        task: { select: { id: true, title: true } },
      },
    });
  }

  async cancelTimer(userId: string) {
    const activeTimer = await this.prisma.activeTimer.findUnique({
      where: { userId },
    });

    if (!activeTimer) {
      throw new BadRequestException('No active timer found');
    }

    await this.prisma.activeTimer.delete({
      where: { userId },
    });

    return { message: 'Timer cancelled successfully' };
  }

  // Billing Integration Methods
  async getUnbilledTimeEntries(filters?: { clientId?: string; caseId?: string }) {
    return this.prisma.timeEntry.findMany({
      where: {
        billable: true,
        invoiceStatus: InvoiceEntryStatus.UNBILLED,
        ...(filters?.clientId && { 
          case: { clientId: filters.clientId } 
        }),
        ...(filters?.caseId && { caseId: filters.caseId }),
      },
      include: { 
        case: { 
          select: { 
            id: true, 
            caseName: true, 
            client: { select: { id: true, name: true } } 
          } 
        },
        user: { select: { id: true, name: true } },
      },
      orderBy: { startTime: 'desc' },
    });
  }

  async updateInvoiceStatus(timeEntryIds: string[], status: InvoiceEntryStatus, invoiceId?: string) {
    return this.prisma.timeEntry.updateMany({
      where: { id: { in: timeEntryIds } },
      data: { 
        invoiceStatus: status,
        ...(invoiceId && { invoiceId }),
      },
    });
  }

  async getBillingSummary(userId: string, caseId?: string) {
    try {
      // Debug: Check what entries exist for this user
      const debugCount = await this.prisma.timeEntry.count({ where: { userId } });
      console.log(`DEBUG - getBillingSummary: userId=${userId}, found ${debugCount} entries`);
      
      const where: any = { userId };
      if (caseId) where.caseId = caseId;

      const [unbilled, billed, paid] = await Promise.all([
      this.prisma.timeEntry.aggregate({
        where: { ...where, invoiceStatus: InvoiceEntryStatus.UNBILLED },
        _sum: { billableAmount: true },
        _count: true,
      }),
      this.prisma.timeEntry.aggregate({
        where: { ...where, invoiceStatus: InvoiceEntryStatus.BILLED },
        _sum: { billableAmount: true },
        _count: true,
      }),
      this.prisma.timeEntry.aggregate({
        where: { ...where, invoiceStatus: InvoiceEntryStatus.PAID },
        _sum: { billableAmount: true },
        _count: true,
      }),
    ]);

      return {
        unbilled: { amount: unbilled._sum.billableAmount || 0, count: unbilled._count },
        billed: { amount: billed._sum.billableAmount || 0, count: billed._count },
        paid: { amount: paid._sum.billableAmount || 0, count: paid._count },
      };
    } catch (error) {
      console.error('Error in getBillingSummary:', error);
      return {
        unbilled: { amount: 0, count: 0 },
        billed: { amount: 0, count: 0 },
        paid: { amount: 0, count: 0 },
      };
    }
  }

  async getAllStaffBillingSummary(userId: string, caseId?: string) {
    // Check if user is a partner
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (user?.role !== 'PARTNER') {
      throw new BadRequestException('Only partners can view all staff billing summary');
    }

    const where: any = { billable: true };
    if (caseId) where.caseId = caseId;
    // Note: No userId filter here to get all staff data

    const [unbilled, billed, paid] = await Promise.all([
      this.prisma.timeEntry.aggregate({
        where: { ...where, invoiceStatus: InvoiceEntryStatus.UNBILLED },
        _sum: { billableAmount: true },
        _count: true,
      }),
      this.prisma.timeEntry.aggregate({
        where: { ...where, invoiceStatus: InvoiceEntryStatus.BILLED },
        _sum: { billableAmount: true },
        _count: true,
      }),
      this.prisma.timeEntry.aggregate({
        where: { ...where, invoiceStatus: InvoiceEntryStatus.PAID },
        _sum: { billableAmount: true },
        _count: true,
      }),
    ]);

    return {
      unbilled: { amount: unbilled._sum.billableAmount || 0, count: unbilled._count },
      billed: { amount: billed._sum.billableAmount || 0, count: billed._count },
      paid: { amount: paid._sum.billableAmount || 0, count: paid._count },
    };
  }
}