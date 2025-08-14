import { IsDateString, IsOptional, IsString, IsEnum } from 'class-validator';
import { ReportType } from '@prisma/client';

export class AnalyticsQueryDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsString()
  caseId?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsEnum(ReportType)
  reportType?: ReportType;
}