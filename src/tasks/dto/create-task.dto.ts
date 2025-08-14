// src/tasks/dto/create-task.dto.ts
import { IsDateString, IsNotEmpty, IsOptional, IsString, IsEnum } from 'class-validator';

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString() // Validates that the string is a valid ISO 8601 date
  @IsOptional()
  deadline?: Date;

  @IsString()
  @IsNotEmpty()
  caseId: string;

  @IsString()
  @IsNotEmpty()
  assignedToId: string;

  @IsEnum(['TODO', 'WORKING', 'DONE'])
  @IsOptional()
  status?: 'TODO' | 'WORKING' | 'DONE';
}