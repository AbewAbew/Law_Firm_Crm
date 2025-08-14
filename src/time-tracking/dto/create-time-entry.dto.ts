import { IsString, IsOptional, IsDateString, IsNumber, IsBoolean, IsEnum } from 'class-validator';
import { TimeEntryType } from '@prisma/client';

export class CreateTimeEntryDto {
  @IsOptional()
  @IsString()
  caseId?: string;

  @IsOptional()
  @IsString()
  taskId?: string;

  @IsString()
  description: string;

  @IsDateString()
  startTime: string;

  @IsOptional()
  @IsDateString()
  endTime?: string;

  @IsOptional()
  @IsNumber()
  duration?: number;

  @IsOptional()
  @IsNumber()
  rate?: number;

  @IsEnum(TimeEntryType)
  type: TimeEntryType;

  @IsOptional()
  @IsBoolean()
  billable?: boolean;
}