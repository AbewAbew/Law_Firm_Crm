import { IsString, IsDateString, IsNumber, IsOptional, IsArray } from 'class-validator';

export class CreateInvoiceDto {
  @IsString()
  caseId: string;

  @IsOptional()
  @IsString()
  clientId?: string;

  @IsDateString()
  dueDate: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  timeEntryIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  expenseIds?: string[];

  @IsOptional()
  @IsNumber()
  tax?: number;
}