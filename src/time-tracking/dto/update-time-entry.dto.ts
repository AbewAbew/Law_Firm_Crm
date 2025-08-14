import { PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsOptional } from 'class-validator';
import { TimeEntryStatus } from '@prisma/client';
import { CreateTimeEntryDto } from './create-time-entry.dto';

export class UpdateTimeEntryDto extends PartialType(CreateTimeEntryDto) {
  @IsOptional()
  @IsEnum(TimeEntryStatus)
  status?: TimeEntryStatus;
}