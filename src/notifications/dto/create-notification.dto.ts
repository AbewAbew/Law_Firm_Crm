import { IsString, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { NotificationType, NotificationPriority } from '@prisma/client';

export class CreateNotificationDto {
  @IsEnum(NotificationType)
  type: NotificationType;

  @IsString()
  title: string;

  @IsString()
  message: string;

  @IsString()
  recipientId: string;

  @IsEnum(NotificationPriority)
  @IsOptional()
  priority?: NotificationPriority;

  @IsString()
  @IsOptional()
  caseId?: string;

  @IsString()
  @IsOptional()
  taskId?: string;

  @IsOptional()
  data?: any;
}