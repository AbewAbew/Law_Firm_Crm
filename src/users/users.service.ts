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

  async remove(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check for related records that would prevent deletion
    const relatedCases = await this.prisma.case.count({ where: { clientId: id } });
    const relatedTasks = await this.prisma.task.count({ 
      where: { 
        OR: [
          { assignedToId: id },
          { assignedById: id }
        ]
      }
    });
    const relatedTimeEntries = await this.prisma.timeEntry.count({ where: { userId: id } });
    const relatedInvoices = await this.prisma.invoice.count({ where: { clientId: id } });

    if (relatedCases > 0 || relatedTasks > 0 || relatedTimeEntries > 0 || relatedInvoices > 0) {
      const issues: string[] = [];
      if (relatedCases > 0) issues.push(`${relatedCases} case(s)`);
      if (relatedTasks > 0) issues.push(`${relatedTasks} task(s)`);
      if (relatedTimeEntries > 0) issues.push(`${relatedTimeEntries} time entry(ies)`);
      if (relatedInvoices > 0) issues.push(`${relatedInvoices} invoice(s)`);
      
      throw new BadRequestException(
        `Cannot delete user. They have ${issues.join(', ')} associated with them. Please reassign or delete these records first.`
      );
    }

    await this.prisma.user.delete({ where: { id } });
    return { message: 'User deleted successfully' };
  }
}