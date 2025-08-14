import { IsOptional, IsString, IsNumber, IsBoolean } from 'class-validator';

export class StopTimerDto {
  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  rate?: number;

  @IsOptional()
  @IsBoolean()
  billable?: boolean;
}