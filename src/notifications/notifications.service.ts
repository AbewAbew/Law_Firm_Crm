import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType, NotificationPriority, UserRole } from '@prisma/client';
import { CreateNotificationDto } from './dto/create-notification.dto';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async create(createNotificationDto: CreateNotificationDto) {
    return this.prisma.notification.create({
      data: createNotificationDto,
    });
  }

  async findAllForUser(userId: string) {
    return this.prisma.notification.findMany({
      where: { recipientId: userId },
      include: {
        case: { select: { id: true, caseName: true } },
        task: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getUnreadCount(userId: string) {
    return this.prisma.notification.count({
      where: {
        recipientId: userId,
        isRead: false,
      },
    });
  }

  async markAsRead(id: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: {
        id,
        recipientId: userId,
      },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: {
        recipientId: userId,
        isRead: false,
      },
      data: { isRead: true },
    });
  }

  async notifyRoleBasedUsers(
    roles: UserRole[],
    type: NotificationType,
    title: string,
    message: string,
    options?: {
      caseId?: string;
      taskId?: string;
      excludeUserId?: string;
      priority?: NotificationPriority;
    }
  ) {
    const users = await this.prisma.user.findMany({
      where: {
        role: { in: roles },
        id: options?.excludeUserId ? { not: options.excludeUserId } : undefined,
      },
    });

    const notifications = await Promise.all(
      users.map(user =>
        this.create({
          type,
          title,
          message,
          recipientId: user.id,
          priority: options?.priority || 'MEDIUM',
          caseId: options?.caseId,
          taskId: options?.taskId,
        })
      )
    );

    return notifications;
  }
}