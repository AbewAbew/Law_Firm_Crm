import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async update(id: string, updateData: { name?: string; role?: UserRole }) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });
  }

  async getUserRelatedRecords(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const [cases, tasks, timeEntries, invoices, appointments, documents] = await Promise.all([
      this.prisma.case.findMany({ 
        where: { OR: [{ clientId: id }, { createdById: id }] },
        select: { id: true, caseName: true, status: true, clientId: true, createdById: true }
      }),
      this.prisma.task.findMany({ 
        where: { OR: [{ assignedToId: id }, { assignedById: id }] },
        select: { id: true, title: true, status: true, assignedToId: true, assignedById: true }
      }),
      this.prisma.timeEntry.findMany({ 
        where: { userId: id },
        select: { id: true, description: true, duration: true, status: true }
      }),
      this.prisma.invoice.findMany({ 
        where: { clientId: id },
        select: { id: true, invoiceNumber: true, status: true, total: true }
      }),
      this.prisma.appointment.findMany({ 
        where: { createdById: id },
        select: { id: true, title: true, startTime: true, status: true }
      }),
      this.prisma.document.findMany({ 
        where: { uploadedById: id },
        select: { id: true, name: true, fileType: true, createdAt: true }
      })
    ]);

    return {
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      relatedRecords: {
        cases,
        tasks,
        timeEntries,
        invoices,
        appointments,
        documents
      },
      canDelete: cases.length === 0 && tasks.length === 0 && timeEntries.length === 0 && 
                 invoices.length === 0 && appointments.length === 0 && documents.length === 0
    };
  }

  async remove(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check for related records that would prevent deletion
    const [relatedCases, relatedTasks, relatedTimeEntries, relatedInvoices, relatedAppointments, relatedDocuments] = await Promise.all([
      this.prisma.case.count({ where: { OR: [{ clientId: id }, { createdById: id }] } }),
      this.prisma.task.count({ where: { OR: [{ assignedToId: id }, { assignedById: id }] } }),
      this.prisma.timeEntry.count({ where: { userId: id } }),
      this.prisma.invoice.count({ where: { clientId: id } }),
      this.prisma.appointment.count({ where: { createdById: id } }),
      this.prisma.document.count({ where: { uploadedById: id } })
    ]);

    if (relatedCases > 0 || relatedTasks > 0 || relatedTimeEntries > 0 || relatedInvoices > 0 || relatedAppointments > 0 || relatedDocuments > 0) {
      const issues: string[] = [];
      if (relatedCases > 0) issues.push(`${relatedCases} case(s)`);
      if (relatedTasks > 0) issues.push(`${relatedTasks} task(s)`);
      if (relatedTimeEntries > 0) issues.push(`${relatedTimeEntries} time entry(ies)`);
      if (relatedInvoices > 0) issues.push(`${relatedInvoices} invoice(s)`);
      if (relatedAppointments > 0) issues.push(`${relatedAppointments} appointment(s)`);
      if (relatedDocuments > 0) issues.push(`${relatedDocuments} document(s)`);
      
      throw new BadRequestException({
        message: `Cannot delete user "${user.name || user.email}". They have associated records that must be handled first.`,
        details: {
          user: { id: user.id, name: user.name, email: user.email, role: user.role },
          relatedRecords: {
            cases: relatedCases,
            tasks: relatedTasks,
            timeEntries: relatedTimeEntries,
            invoices: relatedInvoices,
            appointments: relatedAppointments,
            documents: relatedDocuments
          },
          suggestions: [
            'Reassign cases to another user',
            'Reassign or complete tasks',
            'Archive or reassign time entries',
            'Transfer invoices to another user',
            'Reassign appointments to another user',
            'Transfer document ownership'
          ]
        }
      });
    }

    await this.prisma.user.delete({ where: { id } });
    return { message: `User "${user.name || user.email}" deleted successfully` };
  }
}