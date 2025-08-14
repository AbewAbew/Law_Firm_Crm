import { IsOptional, IsString, IsEnum, IsNumber } from 'class-validator';
import { TimeEntryType } from '@prisma/client';

export class StartTimerDto {
  @IsOptional()
  @IsString()
  caseId?: string;

  @IsOptional()
  @IsString()
  taskId?: string;

  @IsString()
  description: string;

  @IsEnum(TimeEntryType)
  type: TimeEntryType;

  @IsOptional()
  @IsNumber()
  rate?: number;
}